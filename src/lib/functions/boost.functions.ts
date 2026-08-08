import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isJapConfigured,
  japAddOrder,
  japOrderStatus,
  resolveJapServiceId,
} from "@/lib/providers/jap.server";

export type BoostProduct = {
  id: string;
  platform: string;
  service_type: string;
  quantity: number;
  price_ngn: number;
};

export const listBoostProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BoostProduct[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("boost_products")
      .select("id, platform, service_type, quantity, price_ngn")
      .eq("is_active", true)
      .order("platform", { ascending: true })
      .order("price_ngn", { ascending: true });

    if (error) throw new Error(`Failed to load boost products: ${error.message}`);
    return (data ?? []).map((p) => ({
      ...p,
      quantity: Number(p.quantity),
      price_ngn: Number(p.price_ngn),
    }));
  });

export const listBoostOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("boost_orders")
      .select(
        "id, product_id, target_url, quantity, status, amount_paid, metadata, created_at, updated_at, boost_products(platform, service_type)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to load boost orders: ${error.message}`);
    return data ?? [];
  });

const createBoostOrderSchema = z.object({
  productId: z.string().uuid(),
  targetUrl: z.string().trim().url("Enter a valid URL").max(500),
  quantity: z.number().int().min(1).max(10_000_000),
  amount: z.number().min(0),
});

export const createBoostOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createBoostOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: product, error: productError } = await supabaseAdmin
      .from("boost_products")
      .select("id, platform, service_type, quantity, price_ngn")
      .eq("id", data.productId)
      .eq("is_active", true)
      .maybeSingle();

    if (productError || !product) {
      throw new Error("Product not available");
    }

    const packQty = Math.max(1, Number(product.quantity) || 1);
    const packPrice = Number(product.price_ngn);
    const minQty = packQty;
    const maxQty = Math.max(packQty * 100, 100_000);

    if (data.quantity < minQty) {
      throw new Error(`Minimum quantity is ${minQty.toLocaleString("en-NG")}`);
    }
    if (data.quantity > maxQty) {
      throw new Error(`Maximum quantity is ${maxQty.toLocaleString("en-NG")}`);
    }

    const expectedAmount = Math.ceil((packPrice / packQty) * data.quantity);
    if (Math.abs(expectedAmount - data.amount) > 1) {
      throw new Error("Price mismatch — please refresh and try again");
    }

    const japServiceId = resolveJapServiceId(product);
    if (japServiceId == null) {
      throw new Error(
        "This service is not linked to JAP. Set boost_products.service_type to the numeric JAP service ID (e.g. 1234).",
      );
    }

    if (!isJapConfigured()) {
      throw new Error("Boost provider is not configured. Set BOOST_API_KEY in Cloudflare.");
    }

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError || !wallet) {
      throw new Error("Wallet not found");
    }

    if (Number(wallet.balance) < expectedAmount) {
      throw new Error("Insufficient wallet balance");
    }

    const reference = `VNX-BST-${Date.now().toString(36).toUpperCase()}`;

    // Debit wallet first
    await supabaseAdmin.rpc("record_wallet_transaction", {
      _user_id: userId,
      _type: "debit",
      _amount: expectedAmount,
      _fee: 0,
      _description: `Boost — ${product.platform} ${product.service_type} × ${data.quantity}`,
      _reference: reference,
      _payment_method: "wallet",
      _metadata: {
        product_id: data.productId,
        target_url: data.targetUrl,
        quantity: data.quantity,
        jap_service_id: japServiceId,
      },
    });

    // Submit to JustAnotherPanel
    const jap = await japAddOrder({
      serviceId: japServiceId,
      link: data.targetUrl,
      quantity: data.quantity,
    });

    if (!jap.ok) {
      // Refund wallet on provider failure
      const refundRef = `${reference}-REFUND`;
      try {
        await supabaseAdmin.rpc("record_wallet_transaction", {
          _user_id: userId,
          _type: "credit",
          _amount: expectedAmount,
          _fee: 0,
          _description: `Refund — Boost failed (${jap.message})`,
          _reference: refundRef,
          _payment_method: "wallet",
          _metadata: {
            product_id: data.productId,
            reason: jap.message,
            jap_raw: jap.raw ?? null,
          },
        });
      } catch (refundErr) {
        console.error("[boost] refund failed after JAP error", refundErr);
      }

      throw new Error(jap.message || "Boost provider rejected the order");
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("boost_orders")
      .insert({
        user_id: userId,
        product_id: data.productId,
        target_url: data.targetUrl,
        quantity: data.quantity,
        amount_paid: expectedAmount,
        status: "processing",
        metadata: {
          platform: product.platform,
          service_type: product.service_type,
          pack_qty: packQty,
          pack_price: packPrice,
          jap_service_id: japServiceId,
          jap_order_id: jap.order,
          provider: "jap",
          wallet_reference: reference,
        },
      })
      .select("id, product_id, target_url, quantity, status, amount_paid, metadata, created_at")
      .single();

    if (orderError) {
      throw new Error(`Order saved but DB insert failed: ${orderError.message}`);
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Boost order placed",
      body: `Your ${product.platform} order #${jap.order} is processing.`,
      type: "order",
    });

    return {
      ...order,
      provider: "jap" as const,
      providerOrderId: jap.order,
      status: "processing" as const,
    };
  });

const statusSchema = z.object({
  orderId: z.string().uuid(),
});

/** Refresh a boost order status from JAP (by our DB order id). */
export const refreshBoostOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => statusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("boost_orders")
      .select("id, status, metadata")
      .eq("id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !order) {
      throw new Error("Order not found");
    }

    const meta =
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : {};
    const japOrderId = meta.jap_order_id;
    if (japOrderId == null) {
      return {
        ok: false as const,
        status: order.status,
        message: "No JAP order id on this order",
      };
    }

    const jap = await japOrderStatus(String(japOrderId));
    if (!jap.ok) {
      return {
        ok: false as const,
        status: order.status,
        message: jap.message,
      };
    }

    const mapped = mapJapStatusToLocal(jap.status);
    const nextMeta = {
      ...meta,
      jap_status: jap.status,
      jap_charge: jap.charge,
      jap_start_count: jap.startCount,
      jap_remains: jap.remains,
      jap_currency: jap.currency,
      last_status_check: new Date().toISOString(),
    };

    await supabaseAdmin
      .from("boost_orders")
      .update({ status: mapped, metadata: nextMeta })
      .eq("id", order.id);

    return {
      ok: true as const,
      status: mapped,
      providerStatus: jap.status,
      remains: jap.remains,
      startCount: jap.startCount,
      charge: jap.charge,
    };
  });

function mapJapStatusToLocal(japStatus: string): string {
  const s = japStatus.toLowerCase();
  if (s.includes("complete")) return "completed";
  if (s.includes("cancel") || s.includes("refund")) return "cancelled";
  if (s.includes("partial")) return "partial";
  if (s.includes("pending") || s.includes("progress") || s.includes("processing")) {
    return "processing";
  }
  return "processing";
}

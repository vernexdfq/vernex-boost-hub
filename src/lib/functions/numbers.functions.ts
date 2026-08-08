import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listLiveProductsForSlot,
  listLiveProductsAllSlots,
  buyLiveNumber,
  isLiveProductId,
  type LiveSmsProduct,
} from "@/lib/providers/sms-live.server";
import { getSlotMeta, type SmsSlotId, SMS_SERVER_SLOTS } from "@/lib/sms-servers";

function liveProductUuid(liveId: string): string {
  // Deterministic UUID v5-like from live product id (for FK-friendly rows)
  let h = 0;
  for (let i = 0; i < liveId.length; i++) h = (h * 31 + liveId.charCodeAt(i)) >>> 0;
  const hex = (h.toString(16) + liveId.replace(/[^a-f0-9]/gi, "").toLowerCase() + "0".repeat(32)).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}


export type NumberProduct = {
  id: string;
  service_key: string;
  service_name: string;
  country_code: string;
  country_name: string;
  server_id: string;
  provider: string;
  provider_cost_usd: number;
  selling_price_ngn: number;
  stock_count: number;
};

function fromLive(p: LiveSmsProduct): NumberProduct {
  return {
    id: p.id,
    service_key: p.service_key,
    service_name: p.service_name,
    country_code: p.country_code,
    country_name: p.country_name,
    server_id: p.server_id,
    provider: p.provider,
    provider_cost_usd: p.provider_cost_usd,
    selling_price_ngn: p.selling_price_ngn,
    stock_count: p.stock_count,
  };
}

const listSchema = z
  .object({
    slotId: z
      .enum([
        "US-S1",
        "US-S2",
        "US-S3",
        "US-S4",
        "ALL-S1",
        "ALL-S2",
        "ALL-S3",
        "ALL-S4",
        "ALL-S5",
      ])
      .optional(),
  })
  .optional();

export const listNumberProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => listSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<NumberProduct[]> => {
    try {
      const slotId = data?.slotId as SmsSlotId | undefined;

      // Live provider catalog — one slot only, never crashes the page
      if (slotId) {
        try {
          const live = await listLiveProductsForSlot(slotId);
          if (live.length) return live.map(fromLive);
        } catch (err) {
          console.error("[numbers] live catalog failed", slotId, err);
        }
      }

      // Fallback: Supabase catalog
      try {
        const { supabase } = context;
        const { data: rows, error } = await supabase
          .from("number_products")
          .select(
            "id, service_key, service_name, country_code, country_name, server_id, provider, provider_cost_usd, selling_price_ngn, stock_count",
          )
          .eq("is_active", true)
          .order("country_name", { ascending: true })
          .order("service_name", { ascending: true });

        if (error) {
          console.error("[numbers] supabase catalog", error.message);
          return [];
        }

        let products = (rows ?? []).map((p) => ({
          ...p,
          provider_cost_usd: Number(p.provider_cost_usd) || 0,
          selling_price_ngn: Number(p.selling_price_ngn) || 0,
          stock_count: Number(p.stock_count) || 0,
        }));

        if (slotId) {
          products = products.filter((p) => {
            const sid = String(p.server_id || "").toUpperCase();
            return (
              sid === slotId ||
              sid.includes(slotId.replace("-", "")) ||
              sid.endsWith(slotId.slice(-2))
            );
          });
        }
        return products;
      } catch (err) {
        console.error("[numbers] supabase fallback failed", err);
        return [];
      }
    } catch (err) {
      console.error("[numbers] listNumberProducts fatal", err);
      return [];
    }
  });

export const listNumberOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("number_orders")
      .select(
        "id, product_id, phone_number, otp_code, status, amount_paid, provider_order_id, expires_at, created_at, updated_at, number_products(service_name, country_name, server_id, provider)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[numbers] list orders", error.message);
      return [];
    }
    return data ?? [];
  });

const createNumberOrderSchema = z.object({
  productId: z.string().min(1),
  amount: z.number().min(0),
  slotId: z
    .enum([
      "US-S1",
      "US-S2",
      "US-S3",
      "US-S4",
      "ALL-S1",
      "ALL-S2",
      "ALL-S3",
      "ALL-S4",
      "ALL-S5",
    ])
    .optional(),
});

export const createNumberOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createNumberOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // --- Live product path ---
    if (isLiveProductId(data.productId)) {
      const slotId = (data.slotId ||
        SMS_SERVER_SLOTS.find((s) => data.productId.includes(s.provider))?.id ||
        "US-S1") as SmsSlotId;

      // Re-fetch live price for this slot and product
      const liveList = await listLiveProductsForSlot(slotId);
      const liveProduct = liveList.find((p) => p.id === data.productId);
      if (!liveProduct) {
        throw new Error("Service no longer available on this server — refresh and try again");
      }
      if (liveProduct.stock_count <= 0) {
        throw new Error("Product is out of stock");
      }

      const price = liveProduct.selling_price_ngn;
      if (Math.abs(price - data.amount) > 2) {
        throw new Error("Price mismatch — please refresh the product list");
      }

      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError || !wallet) throw new Error("Wallet not found");
      if (Number(wallet.balance) < price) throw new Error("Insufficient wallet balance");

      const reference = `VNX-NUM-${Date.now().toString(36).toUpperCase()}`;

      await supabaseAdmin.rpc("record_wallet_transaction", {
        _user_id: userId,
        _type: "debit",
        _amount: price,
        _fee: 0,
        _description: `Virtual number — ${liveProduct.service_name} (${slotId})`,
        _reference: reference,
        _payment_method: "wallet",
        _metadata: {
          product_id: data.productId,
          slot_id: slotId,
          provider: liveProduct.provider,
          provider_cost_usd: liveProduct.provider_cost_usd,
        },
      });

      const bought = await buyLiveNumber({ productId: data.productId, slotId });
      if (!bought.ok) {
        // Refund
        try {
          await supabaseAdmin.rpc("record_wallet_transaction", {
            _user_id: userId,
            _type: "credit",
            _amount: price,
            _fee: 0,
            _description: `Refund — number order failed (${bought.message})`,
            _reference: `${reference}-REFUND`,
            _payment_method: "wallet",
            _metadata: { product_id: data.productId, reason: bought.message },
          });
        } catch (e) {
          console.error("[numbers] refund failed", e);
        }
        throw new Error(bought.message);
      }

      const productUuid = liveProductUuid(data.productId);
      await supabaseAdmin.from("number_products").upsert(
        {
          id: productUuid,
          service_key: liveProduct.service_key.slice(0, 64),
          service_name: liveProduct.service_name.slice(0, 120),
          country_code: liveProduct.country_code.slice(0, 8),
          country_name: liveProduct.country_name.slice(0, 80),
          server_id: slotId,
          provider: liveProduct.provider,
          provider_cost_usd: liveProduct.provider_cost_usd,
          selling_price_ngn: price,
          stock_count: Math.max(0, liveProduct.stock_count - 1),
          is_active: true,
        },
        { onConflict: "id" },
      );

      const { data: order, error: orderError } = await supabaseAdmin
        .from("number_orders")
        .insert({
          user_id: userId,
          product_id: productUuid,
          phone_number: bought.phoneNumber,
          amount_paid: price,
          status: "active",
          provider_order_id: bought.providerOrderId,
          expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        })
        .select(
          "id, product_id, phone_number, otp_code, status, amount_paid, expires_at, created_at, provider_order_id",
        )
        .single();

      if (orderError) {
        // Order charged & number bought — surface phone even if DB soft-fails
        console.error("[numbers] order insert", orderError.message);
        return {
          id: reference,
          product_id: null,
          phone_number: bought.phoneNumber,
          otp_code: null,
          status: "active",
          amount_paid: price,
          provider_order_id: bought.providerOrderId,
          expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        };
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: "Number ordered",
        body: `${bought.phoneNumber} ready for ${liveProduct.service_name}. Waiting for SMS.`,
        type: "order",
      });

      return order;
    }

    // --- Legacy Supabase product path ---
    const { data: product, error: productError } = await supabaseAdmin
      .from("number_products")
      .select("id, service_name, selling_price_ngn, stock_count")
      .eq("id", data.productId)
      .eq("is_active", true)
      .maybeSingle();

    if (productError || !product) {
      throw new Error("Product not available");
    }

    const price = Number(product.selling_price_ngn);
    if (price !== data.amount) {
      throw new Error("Price mismatch — please refresh the product list");
    }

    if (Number(product.stock_count) <= 0) {
      throw new Error("Product is out of stock");
    }

    const reference = `VNX-NUM-${Date.now().toString(36).toUpperCase()}`;

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError || !wallet) {
      throw new Error("Wallet not found");
    }

    if (Number(wallet.balance) < price) {
      throw new Error("Insufficient wallet balance");
    }

    await supabaseAdmin.rpc("record_wallet_transaction", {
      _user_id: userId,
      _type: "debit",
      _amount: price,
      _fee: 0,
      _description: `Virtual number — ${product.service_name}`,
      _reference: reference,
      _payment_method: "wallet",
      _metadata: { product_id: data.productId },
    });

    const { data: order, error: orderError } = await supabaseAdmin
      .from("number_orders")
      .insert({
        user_id: userId,
        product_id: data.productId,
        amount_paid: price,
        status: "pending",
        expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      })
      .select(
        "id, product_id, phone_number, otp_code, status, amount_paid, expires_at, created_at",
      )
      .single();

    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    await supabaseAdmin
      .from("number_products")
      .update({ stock_count: Number(product.stock_count) - 1 })
      .eq("id", data.productId);

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Number order placed",
      body: `Your ${product.service_name} OTP number is being prepared.`,
      type: "order",
    });

    return order;
  });

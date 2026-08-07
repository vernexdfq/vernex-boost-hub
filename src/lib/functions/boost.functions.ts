import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

    // Scale pack price by requested quantity
    const expectedAmount = Math.ceil((packPrice / packQty) * data.quantity);
    if (Math.abs(expectedAmount - data.amount) > 1) {
      throw new Error("Price mismatch — please refresh and try again");
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
      },
    });

    const { data: order, error: orderError } = await supabaseAdmin
      .from("boost_orders")
      .insert({
        user_id: userId,
        product_id: data.productId,
        target_url: data.targetUrl,
        quantity: data.quantity,
        amount_paid: expectedAmount,
        status: "pending",
        metadata: {
          platform: product.platform,
          service_type: product.service_type,
          pack_qty: packQty,
          pack_price: packPrice,
        },
      })
      .select("id, product_id, target_url, quantity, status, amount_paid, metadata, created_at")
      .single();

    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Boost order placed",
      body: `Your ${product.platform} ${product.service_type} order is processing.`,
      type: "order",
    });

    return order;
  });

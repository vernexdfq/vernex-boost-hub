import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const listNumberProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NumberProduct[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("number_products")
      .select("id, service_key, service_name, country_code, country_name, server_id, provider, provider_cost_usd, selling_price_ngn, stock_count")
      .eq("is_active", true)
      .order("country_name", { ascending: true })
      .order("service_name", { ascending: true });

    if (error) throw new Error(`Failed to load products: ${error.message}`);
    return (data ?? []).map((p) => ({
      ...p,
      provider_cost_usd: Number(p.provider_cost_usd),
      selling_price_ngn: Number(p.selling_price_ngn),
      stock_count: Number(p.stock_count),
    }));
  });

export const listNumberOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("number_orders")
      .select("id, product_id, phone_number, otp_code, status, amount_paid, provider_order_id, expires_at, created_at, updated_at, number_products(service_name, country_name, server_id, provider)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to load orders: ${error.message}`);
    return data ?? [];
  });

const createNumberOrderSchema = z.object({
  productId: z.string().uuid(),
  amount: z.number().min(0),
});

export const createNumberOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createNumberOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
      .select("id, product_id, phone_number, otp_code, status, amount_paid, expires_at, created_at")
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

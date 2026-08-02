import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createAffiliateOrderSchema = z.object({
  websiteName: z.string().trim().min(2).max(60),
  domain: z.string().trim().min(1).max(60),
  domainExt: z.enum([".com", ".ng", ".com.ng"]),
  phone: z.string().trim().min(10).max(20),
  notes: z.string().trim().max(500).optional(),
  amount: z.number().min(0),
});

export const createAffiliateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createAffiliateOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const fullDomain = `${data.domain}${data.domainExt}`;
    const cleanDomain = fullDomain.toLowerCase().replace(/[^a-z0-9.-]/g, "");

    const { data: order, error } = await supabase
      .from("affiliate_orders")
      .insert({
        user_id: userId,
        website_name: data.websiteName,
        domain: cleanDomain,
        domain_ext: data.domainExt,
        phone: data.phone,
        notes: data.notes ?? null,
        amount: data.amount,
        status: "pending",
      })
      .select("id, website_name, domain, domain_ext, phone, status, amount, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to submit order: ${error.message}`);
    }

    return order;
  });

export const listAffiliateOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("affiliate_orders")
      .select("id, website_name, domain, domain_ext, phone, status, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(`Failed to load affiliate orders: ${error.message}`);
    return data ?? [];
  });

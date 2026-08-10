import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dashboardInputSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
});

export type DashboardSummary = {
  /** Live wallet balance from the wallets table (NGN). */
  walletBalance: number;
  transactions: Array<{
    id: string;
    type: "credit" | "debit";
    status: "pending" | "success" | "failed" | "refunded";
    amount: number;
    description: string;
    payment_method: string | null;
    reference: string;
    created_at: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    read: boolean;
    type: string;
    created_at: string;
  }>;
  unreadCount: number;
};

export const getDashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => dashboardInputSchema.parse(data))
  .handler(async ({ data, context }): Promise<DashboardSummary> => {
    const { supabase, userId } = context;

    const limit = data.limit;
    const [txRes, notifRes, countRes, walletRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, type, status, amount, description, payment_method, reference, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("notifications")
        .select("id, title, body, read, type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false),
      supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (txRes.error) throw new Error(`Failed to load transactions: ${txRes.error.message}`);
    if (notifRes.error) throw new Error(`Failed to load notifications: ${notifRes.error.message}`);

    const walletBalance = Number(walletRes.data?.balance ?? 0);

    return {
      walletBalance: Number.isFinite(walletBalance) ? walletBalance : 0,
      transactions: (txRes.data ?? []).map((row) => ({
        ...row,
        amount: Number(row.amount),
      })),
      notifications: notifRes.data ?? [],
      unreadCount: countRes.count ?? 0,
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw new Error(`Failed to update notifications: ${error.message}`);
    return { ok: true };
  });

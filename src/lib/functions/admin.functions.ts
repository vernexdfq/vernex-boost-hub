import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin access check. Set ADMIN_EMAILS (comma-separated) in the environment.
 * Only these signed-in accounts can open /admin pages.
 */
export const checkAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    let email: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      email = data.user?.email ?? null;
    } catch {
      /* leave null */
    }

    const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = Boolean(email && allowed.includes(email.toLowerCase()));
    return { isAdmin, email };
  });

type AuthContext = { supabase: { auth: { getUser: () => Promise<any> } }; userId: string };

/** Throws unless the signed-in user is in ADMIN_EMAILS. Returns admin email. */
async function requireAdmin(context: AuthContext): Promise<string> {
  let email: string | null = null;
  try {
    const { data } = await context.supabase.auth.getUser();
    email = data.user?.email ?? null;
  } catch {
    /* leave null */
  }
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!email || !allowed.includes(email.toLowerCase())) {
    throw new Error("Admin access required");
  }
  return email;
}

export type ChildPanel = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  walletBalance: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PanelLog = {
  id: number;
  kind: string;
  amount: number;
  balanceAfter: number;
  note: string;
  createdBy: string;
  createdAt: string;
};

function mapPanel(row: Record<string, any>): ChildPanel {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    slug: String(row.slug || ""),
    phone: row.phone ? String(row.phone) : "",
    email: row.email ? String(row.email) : "",
    walletBalance: Number(row.wallet_balance) || 0,
    status: String(row.status || "active"),
    notes: row.notes ? String(row.notes) : "",
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

export const listChildPanels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("child_panels")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { panels: (data ?? []).map(mapPanel) };
  });

const logsSchema = z.object({ panelId: z.string().min(1) });

export const listChildPanelLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => logsSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("child_panel_wallet_logs")
      .select("*")
      .eq("panel_id", data.panelId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    const logs: PanelLog[] = (rows ?? []).map((r: Record<string, any>) => ({
      id: Number(r.id),
      kind: String(r.kind || "credit"),
      amount: Number(r.amount) || 0,
      balanceAfter: Number(r.balance_after) || 0,
      note: r.note ? String(r.note) : "",
      createdBy: r.created_by ? String(r.created_by) : "",
      createdAt: String(r.created_at || ""),
    }));
    return { logs };
  });

const adjustSchema = z.object({
  panelId: z.string().min(1),
  kind: z.enum(["credit", "debit"]),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export const adjustChildPanelWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => adjustSchema.parse(data))
  .handler(async ({ data, context }) => {
    const adminEmail = await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: panel, error: fetchErr } = await supabaseAdmin
      .from("child_panels")
      .select("id, name, wallet_balance")
      .eq("id", data.panelId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!panel) throw new Error("Panel not found");

    const delta = data.kind === "debit" ? -data.amount : data.amount;
    const newBalance = (Number(panel.wallet_balance) || 0) + delta;
    if (newBalance < 0) throw new Error("Panel balance is too low for this removal");

    const { error: upErr } = await supabaseAdmin
      .from("child_panels")
      .update({ wallet_balance: newBalance })
      .eq("id", data.panelId);
    if (upErr) throw new Error(upErr.message);

    const { error: logErr } = await supabaseAdmin.from("child_panel_wallet_logs").insert({
      panel_id: data.panelId,
      kind: data.kind,
      amount: data.amount,
      balance_after: newBalance,
      note: data.note ?? null,
      created_by: adminEmail,
    });
    if (logErr) throw new Error(logErr.message);

    return { ok: true, balance: newBalance };
  });

const updateSchema = z.object({
  panelId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  status: z.enum(["active", "paused"]),
  notes: z.string().optional(),
});

export const updateChildPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      status: data.status,
      notes: data.notes?.trim() || null,
    };
    const { error } = await supabaseAdmin
      .from("child_panels")
      .update(patch)
      .eq("id", data.panelId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

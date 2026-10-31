import { createServerFn } from "@tanstack/react-start";
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

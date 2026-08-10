import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Demo seeder disabled in production — never invent wallet balances. */
export const seedDemoActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { ok: false, message: "Demo seeding is disabled." };
  });

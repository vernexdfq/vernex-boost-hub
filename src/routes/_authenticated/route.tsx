import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Memory-only sessions: if there is no active in-memory user, force login.
    // This blocks silent access to other people's accounts on shared devices.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { reason: "login_required" } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});

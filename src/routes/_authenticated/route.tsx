import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  clearSessionActivity,
  isSessionIdle,
  touchSessionActivity,
} from "@/lib/session-idle";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      clearSessionActivity();
      throw redirect({ to: "/auth" });
    }

    // Left the site for more than 2 minutes → force login page (not landing)
    if (isSessionIdle()) {
      await supabase.auth.signOut();
      clearSessionActivity();
      throw redirect({ to: "/auth" });
    }

    // Still active: refresh activity so a normal page refresh keeps them in
    touchSessionActivity();

    return { user: data.user };
  },
  component: () => <Outlet />,
});

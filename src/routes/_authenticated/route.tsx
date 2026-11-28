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
    // View-only preview mode (entered from the hidden sign on /auth):
    // no Supabase session is required; data pages show empty states.
    let previewActive = false;
    if (typeof window !== "undefined") {
      try {
        previewActive = localStorage.getItem("verxor_preview_mode") === "1";
      } catch {
        previewActive = false;
      }
    }
    if (previewActive) {
      touchSessionActivity();
      return {
        user: {
          id: "preview-user",
          email: "preview@verxor.local",
        },
      };
    }

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

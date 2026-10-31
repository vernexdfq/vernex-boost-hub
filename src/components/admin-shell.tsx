import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Boxes,
  LayoutDashboard,
  Loader2,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { checkAdminAccess } from "@/lib/functions/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export type AdminSection = "overview" | "panels" | "pricing";

const NAV: {
  id: AdminSection | "providers" | "settings";
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
  soon: boolean;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, to: "/admin", soon: false },
  { id: "panels", label: "Child Panels", icon: Users, to: "/admin/panels", soon: false },
  { id: "pricing", label: "Pricing", icon: SlidersHorizontal, to: "/admin/pricing", soon: false },
  { id: "providers", label: "Providers", icon: Boxes, to: "", soon: true },
  { id: "settings", label: "Settings", icon: SlidersHorizontal, to: "", soon: true },
];

/**
 * Standalone admin layout: dark sidebar, own guard, own login.
 * Never redirects into the normal user app.
 */
export function AdminShell({
  title,
  subtitle,
  active,
  children,
}: {
  title: string;
  subtitle: string;
  active: AdminSection;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(checkAdminAccess);
  const [state, setState] = useState<"loading" | "ok">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          if (!cancelled) navigate({ to: "/admin/login", replace: true });
          return;
        }
        const res = await checkAdmin();
        if (cancelled) return;
        if (res.isAdmin) {
          setState("ok");
        } else {
          navigate({ to: "/admin/login", replace: true });
        }
      } catch {
        if (!cancelled) navigate({ to: "/admin/login", replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkAdmin, navigate]);

  if (state !== "ok") {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-900">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm font-medium">Checking admin access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-slate-900 p-4 md:flex">
        <div className="mb-7 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-sm font-black text-white">
            V
          </div>
          <div>
            <p className="text-sm font-bold text-white">Verxor Admin</p>
            <p className="text-[10px] text-slate-400">Control panel</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = !item.soon && item.id === active;
            if (item.soon) {
              return (
                <span
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <span className="ml-auto rounded-full bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                    Soon
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.id}
                to={item.to}
                className={
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition " +
                  (isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white")
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-slate-800 pt-3">
          <p className="text-[10px] text-slate-500">Authorized administrators only</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-5 py-3.5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-sm font-black text-white md:hidden">
              V
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-slate-900">{title}</h1>
              <p className="truncate text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-5 py-2.5 md:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = !item.soon && item.id === active;
            if (item.soon) return null;
            return (
              <Link
                key={item.id}
                to={item.to}
                className={
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold " +
                  (isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600")
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

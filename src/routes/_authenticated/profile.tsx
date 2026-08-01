import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Shield, KeyRound, Globe, LogOut, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { fetchAccount } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Vernex" },
      { name: "description", content: "Manage your Vernex account, security PIN and preferences." },
      { property: "og:title", content: "Vernex Profile" },
      { property: "og:description", content: "Update account details, security PIN and preferences." },
    ],
  }),
  component: Profile,
});

const rows = [
  { icon: Shield, label: "Account Security", to: "/profile" },
  { icon: KeyRound, label: "Change 4-digit PIN", to: "/profile" },
  { icon: Globe, label: "Affiliate Website", to: "/affiliate" },
  { icon: HelpCircle, label: "Support & FAQs", to: "/profile" },
];

function Profile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
  });

  const name = data?.profile?.full_name ?? user.email?.split("@")[0] ?? "Vernex user";
  const email = data?.profile?.email ?? user.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <PageHeader title="Profile" subtitle="Account & preferences" />
      <div className="px-5 pt-5">
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4 shadow-card-elev">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl brand-gradient text-xl font-black text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {email}
              {user.email_confirmed_at ? " • Verified" : " • Unverified"}
            </p>
          </div>
        </div>

        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card-elev">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <li key={r.label}>
                <Link
                  to={r.to}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-accent/60 transition"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-semibold">{r.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          onClick={signOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-bold text-destructive hover:bg-destructive/15 transition"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Settings2, ShieldCheck, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { useServerFn } from "@tanstack/react-start";
import { checkAdminAccess } from "@/lib/functions/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Verxor" },
      { name: "description", content: "Verxor admin: users, wallets, and pricing." },
    ],
  }),
  component: AdminIndex,
});

function AdminIndex() {
  const checkAdmin = useServerFn(checkAdminAccess);
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [tab, setTab] = useState<"customers" | "panels">("customers");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await checkAdmin();
        if (!cancelled) setState(res.isAdmin ? "ok" : "denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkAdmin]);

  return (
    <AppShell>
      <PageHeader
        title="Admin"
        subtitle="Manage users, wallets & pricing"
        right={
          <Link
            to="/dashboard"
            aria-label="Back to dashboard"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-foreground/80"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      <div className="space-y-4 px-5 pb-24 pt-5">
        {state === "loading" ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground shadow-card-elev">
            Checking access…
          </div>
        ) : state === "denied" ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card-elev">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
              <Lock className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-base font-bold">Access restricted</h2>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              This area is for Verxor administrators only. If you should have access, contact the
              site owner.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Administrator access verified</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Manage Verxor users and configuration
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1.5 shadow-card-elev">
              <button
                type="button"
                onClick={() => setTab("customers")}
                className={
                  "rounded-xl py-2.5 text-xs font-bold transition " +
                  (tab === "customers"
                    ? "brand-gradient text-white"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Customers
              </button>
              <button
                type="button"
                onClick={() => setTab("panels")}
                className={
                  "rounded-xl py-2.5 text-xs font-bold transition " +
                  (tab === "panels"
                    ? "brand-gradient text-white"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Child Panels
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 shadow-card-elev">
              <div className="flex items-center gap-3">
                <span
                  className={
                    "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border " +
                    (tab === "customers"
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      : "bg-purple-500/10 text-purple-500 border-purple-500/20")
                  }
                >
                  {tab === "customers" ? <Users className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold">
                    {tab === "customers" ? "Customer Wallets" : "Child Panel Wallets"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {tab === "customers"
                      ? "See every customer, their wallet balance, and add money manually."
                      : "Fund child panels (e.g. Vernex Digital) with wholesale wallet balance."}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/50 p-5 text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-muted-foreground/10 text-muted-foreground">
                  <Wallet className="h-5 w-5" />
                </span>
                <p className="mt-2 text-xs font-semibold">User list & manual funding</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Coming next — users with wallet balances, search, and an "Add Money" action per
                  user.
                </p>
              </div>
            </div>

            <Link
              to="/admin/pricing"
              className="block rounded-2xl border border-border bg-surface p-4 shadow-card-elev transition hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Settings2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Pricing Settings</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Exchange rate & per-server markups
                  </p>
                </div>
                <span className="text-muted-foreground">›</span>
              </div>
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}

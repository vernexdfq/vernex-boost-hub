import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Eye,
  EyeOff,
  Plus,
  History,
  Phone,
  Rocket,
  Store,
  PhoneCall,
  Globe,
  BarChart3,
  Star,
  Clock,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { TelegramModal } from "@/components/telegram-modal";
import { fetchAccount } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardSummary, markNotificationsRead } from "@/lib/functions/dashboard.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vernex" },
      { name: "description", content: "Your Vernex dashboard: wallet, virtual numbers, SMM boosts, and account tools." },
      { property: "og:title", content: "Vernex Dashboard" },
      { property: "og:description", content: "Fund your wallet, buy virtual numbers, and grow your socials — all in one place." },
    ],
  }),
  component: Dashboard,
});

const quickActions = [
  { label: "Virtual\nNumber", icon: Phone, tint: "bg-indigo-500/10 text-indigo-400", to: "/virtual-numbers" },
  { label: "Boost\nAccount", icon: Rocket, tint: "bg-violet-50 text-violet-600", to: "/boost" },
  { label: "Buy\nLogs", icon: Store, tint: "bg-amber-50 text-amber-600", to: "/buy-accounts" },
  { label: "Rent\nNumber", icon: PhoneCall, tint: "bg-blue-50 text-blue-600", to: "/rent-number" },
  { label: "Get Affiliate\nWebsite", icon: Globe, tint: "bg-indigo-500/10 text-indigo-400", to: "/affiliate" },
  { label: "Number\nOrders", icon: BarChart3, tint: "bg-indigo-50 text-indigo-600", to: "/number-orders" },
  { label: "Boost\nOrders", icon: Star, tint: "bg-violet-50 text-violet-600", to: "/boost-orders" },
  { label: "Log\nHistory", icon: Clock, tint: "bg-slate-100 text-slate-700", to: "/log-history" },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: "Good Night" };
  if (h < 12) return { text: "Good Morning" };
  if (h < 17) return { text: "Good Afternoon" };
  if (h < 21) return { text: "Good Evening" };
  return { text: "Good Night" };
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Dashboard() {
  const [hidden, setHidden] = useState(false);
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchSummary = useServerFn(getDashboardSummary);
  const markRead = useServerFn(markNotificationsRead);

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 15_000,
  });

  // Live wallet balance: subscribe to DB changes for this user
  useEffect(() => {
    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["account", user.id] });
          void queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["account", user.id] });
          void queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user.id, queryClient]);


  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard", user.id],
    queryFn: () => fetchSummary({ data: { limit: 5 } }),
  });


  const displayName =
    account?.profile?.full_name?.split(" ")[0] ??
    (user.email ? user.email.split("@")[0] : "there");
  const initial = displayName.charAt(0).toUpperCase();
  const balance = account?.wallet?.balance ?? 0;
  const g = greeting();

  const hasUnread = (summary?.unreadCount ?? 0) > 0;

  async function handleOpenAlerts() {
    if (hasUnread) {
      await markRead({ data: undefined });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
    }
  }

  const transactions = summary?.transactions ?? [];
  const notifications = summary?.notifications ?? [];

  const activity = transactions.map((t) => {
    const isCredit = t.type === "credit";
    return {
      id: t.id,
      label: t.description,
      subtitle: `${t.payment_method ?? "Wallet"} • ${t.status}`,
      amount: isCredit ? t.amount : -t.amount,
      icon: isCredit ? ArrowDownLeft : ArrowUpRight,
      tint: isCredit ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-100 text-slate-600",
    };
  });

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-5 pt-6">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl brand-gradient text-base font-bold text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.3)]">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold leading-tight">
            {g.text}, {displayName}
          </h1>
          <p className="truncate text-xs text-muted-foreground">Your Vernex Dashboard</p>
        </div>
        <Link
          to="/alerts"
          onClick={handleOpenAlerts}
          aria-label="Notifications"
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground/90 hover:bg-surface-2 transition"
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-surface" />
          )}
        </Link>
      </header>

      <section className="px-5 pt-5">
        <div className="relative overflow-hidden rounded-2xl wallet-gradient p-5 shadow-wallet">
          <div className="absolute inset-0 dotted-bg opacity-40" />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10" />
          <div className="relative flex items-start justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              Available Balance
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Active
            </span>
          </div>
          <div className="relative mt-3 flex items-center gap-3">
            <span className="text-[38px] font-black tracking-tight text-white tabular-nums">
              {hidden ? "₦••••" : formatNaira(balance)}
            </span>
            <button
              onClick={() => setHidden((v) => !v)}
              aria-label={hidden ? "Show balance" : "Hide balance"}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <Link to="/fund" className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-[#0F172A] hover:brightness-95 transition">
              <Plus className="h-4 w-4" strokeWidth={2.6} /> Fund Wallet
            </Link>
            <Link to="/history" className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10 transition">
              <History className="h-4 w-4" /> History
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pt-7">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick Actions</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card-elev">
          <div className="grid grid-cols-4">
            {quickActions.map((a, i) => {
              const Icon = a.icon;
              const rightEdge = (i + 1) % 4 === 0;
              const bottomRow = i >= 4;
              return (
                <Link
                  key={a.label}
                  to={a.to}
                  className={`group flex flex-col items-center gap-2 p-3 transition hover:bg-accent/60 active:scale-[0.97] ${!rightEdge ? "border-r border-border" : ""} ${bottomRow ? "border-t border-border" : ""}`}
                >
                  <span className={`grid h-11 w-11 place-items-center rounded-2xl ${a.tint} transition-transform group-hover:scale-105`}>
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <span className="whitespace-pre-line text-center text-[11px] font-semibold leading-tight text-foreground/90">
                    {a.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 pt-7">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recent Activity</h2>
          <div className="h-px flex-1 bg-border" />
          <Link to="/history" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {summaryLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : activity.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No transactions yet. Fund your wallet to get started.
          </div>
        ) : (
          <ul className="space-y-2">
            {activity.map((row) => {
              const Icon = row.icon;
              const positive = row.amount >= 0;
              return (
                <li key={row.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card-elev">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${row.tint}`}>
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${positive ? "text-primary" : "text-destructive"}`}>
                    {positive ? "+" : "-"}
                    {formatNaira(Math.abs(row.amount))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {notifications.length > 0 && (
        <section className="px-5 pt-7">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notifications</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <ul className="space-y-2">
            {notifications.slice(0, 3).map((n) => (
              <li key={n.id} className={`rounded-2xl border border-border bg-surface p-3.5 shadow-card-elev ${n.read ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(n.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TelegramModal />
    </AppShell>
  );
}

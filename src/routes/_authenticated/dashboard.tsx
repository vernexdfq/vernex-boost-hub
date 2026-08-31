import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Eye, EyeOff, Plus, History, Rocket, Store, PhoneCall, PhoneForwarded, Globe, BarChart3, Star, ChevronRight, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";
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
      { title: "Dashboard — Verxor" },
      { name: "description", content: "Your Verxor dashboard for wallet, virtual numbers and digital services." },
      { property: "og:title", content: "Verxor Dashboard" },
      { property: "og:description", content: "Manage your Verxor wallet and digital services." },
    ],
  }),
  component: Dashboard,
});

const quickActions = [
  { label: "Virtual Number", icon: PhoneCall, tint: "bg-blue-500/10 text-blue-600 border-blue-500/15", to: "/virtual-numbers" },
  { label: "Boost Account", icon: Rocket, tint: "bg-blue-500/10 text-blue-600 border-blue-500/15", to: "/boost" },
  { label: "Buy Logs", icon: Store, tint: "bg-blue-500/10 text-blue-600 border-blue-500/15", to: "/buy-accounts" },
  { label: "Rent Number", icon: PhoneForwarded, tint: "bg-blue-500/10 text-blue-600 border-blue-500/15", to: "/rental/calls" },
  { label: "Affiliate", icon: Globe, tint: "bg-blue-500/10 text-blue-600 border-blue-500/15", to: "/affiliate" },
  { label: "Number Orders", icon: BarChart3, tint: "bg-blue-500/10 text-blue-600 border-blue-500/15", to: "/number-orders" },
  { label: "Boost Orders", icon: Star, tint: "bg-blue-500/10 text-blue-600 border-blue-500/15", to: "/boost-orders" },
  { label: "Log History", icon: History, tint: "bg-slate-500/10 text-slate-600 border-slate-500/15", to: "/log-history" },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
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

  const { data: account } = useQuery({ queryKey: ["account", user.id], queryFn: () => fetchAccount(user.id), staleTime: 5000, refetchOnWindowFocus: true, refetchOnReconnect: true, refetchInterval: 15000 });

  useEffect(() => {
    const channel = supabase.channel(`wallet-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["account", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["account", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user.id, queryClient]);

  const { data: summary, isLoading: summaryLoading } = useQuery({ queryKey: ["dashboard", user.id], queryFn: () => fetchSummary({ data: { limit: 5 } }), staleTime: 5000, refetchOnWindowFocus: true, refetchOnReconnect: true, refetchInterval: 12000 });
  const displayName = account?.profile?.full_name?.split(" ")[0] ?? (user.email ? user.email.split("@")[0] : "there");
  const initial = displayName.charAt(0).toUpperCase();
  const balance = Number(summary?.walletBalance ?? account?.wallet?.balance ?? 0);
  const hasUnread = (summary?.unreadCount ?? 0) > 0;
  const transactions = summary?.transactions ?? [];
  const notifications = summary?.notifications ?? [];
  const activity = transactions.map((t) => ({ id: t.id, label: t.description, subtitle: `${t.payment_method ?? "Wallet"} • ${t.status}`, amount: t.type === "credit" ? t.amount : -t.amount, icon: t.type === "credit" ? ArrowDownLeft : ArrowUpRight }));

  async function handleOpenAlerts() {
    if (hasUnread) { await markRead({ data: undefined }); void queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] }); }
  }

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-white">{initial}</div>
        <div className="min-w-0 flex-1"><h1 className="truncate text-base font-bold tracking-tight">{greeting()}, {displayName}</h1><p className="truncate text-xs text-muted-foreground">Your Verxor dashboard</p></div>
        <Link to="/alerts" onClick={handleOpenAlerts} aria-label="Notifications" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface hover:bg-surface-2"><Bell className="h-5 w-5" />{hasUnread && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />}</Link>
      </header>

      <section className="px-5 pt-1">
        <div className="rounded-xl bg-[#0b1b4a] p-5 shadow-wallet">
          <div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Available balance</span><span className="text-[11px] font-medium text-white/60">Active</span></div>
          <div className="mt-2 flex items-center gap-3"><span className="text-3xl font-bold tracking-tight text-white tabular-nums">{hidden ? "₦••••" : formatNaira(balance)}</span><button onClick={() => setHidden((v) => !v)} aria-label={hidden ? "Show balance" : "Hide balance"} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/80 hover:bg-white/15">{hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><Link to="/fund" className="flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"><Plus className="h-4 w-4" /> Fund wallet</Link><Link to="/history" className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"><History className="h-4 w-4" /> History</Link></div>
        </div>
      </section>

      <section className="px-5 pt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Services</h2><span className="text-xs text-muted-foreground">Choose a service</span></div><div className="grid grid-cols-4 gap-2">{quickActions.map((a) => { const Icon = a.icon; return <Link key={a.label} to={a.to} className="group flex min-h-[92px] flex-col items-center justify-center rounded-xl border border-border bg-surface px-1.5 py-3 text-center hover:border-primary/30 hover:bg-surface-2"><span className={`mb-2 grid h-9 w-9 place-items-center rounded-lg border ${a.tint}`}><Icon size={18} strokeWidth={2} /></span><span className="text-[10px] font-medium leading-tight">{a.label}</span></Link>; })}</div></section>

      <section className="px-5 pt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Recent activity</h2><Link to="/history" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">View all <ChevronRight className="h-3.5 w-3.5" /></Link></div>{summaryLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : activity.length === 0 ? <div className="rounded-xl border border-border bg-surface px-4 py-7 text-center text-sm text-muted-foreground">No transactions yet.</div> : <ul className="divide-y divide-border rounded-xl border border-border bg-surface">{activity.map((row) => { const Icon = row.icon; const positive = row.amount >= 0; return <li key={row.id} className="flex items-center gap-3 px-3.5 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{row.label}</p><p className="truncate text-[11px] text-muted-foreground">{row.subtitle}</p></div><span className={`shrink-0 text-sm font-semibold tabular-nums ${positive ? "text-primary" : "text-destructive"}`}>{positive ? "+" : "-"}{formatNaira(Math.abs(row.amount))}</span></li>; })}</ul>}</section>

      {notifications.length > 0 && <section className="px-5 pt-7"><h2 className="mb-3 text-sm font-semibold">Notifications</h2><ul className="divide-y divide-border rounded-xl border border-border bg-surface">{notifications.slice(0, 3).map((n) => <li key={n.id} className="p-3.5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></div><span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(n.created_at)}</span></div></li>)}</ul></section>}
      <TelegramModal />
    </AppShell>
  );
}

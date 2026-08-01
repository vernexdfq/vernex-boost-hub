import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TelegramModal } from "@/components/telegram-modal";

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
  { label: "Virtual\nNumber", icon: Phone, tint: "bg-[#E6F7EE] text-[#0D9488]", to: "/virtual-numbers" },
  { label: "Boost\nAccount", icon: Rocket, tint: "bg-[#F3E8FF] text-[#7C3AED]", to: "/boost" },
  { label: "Buy\nLogs", icon: Store, tint: "bg-[#FFF1E0] text-[#D97706]", to: "/buy-accounts" },
  { label: "Rent\nNumber", icon: PhoneCall, tint: "bg-[#E7F0FF] text-[#1D4ED8]", to: "/rent-number" },
  { label: "Get Affiliate\nWebsite", icon: Globe, tint: "bg-[#E6F7EE] text-[#0D9488]", to: "/affiliate" },
  { label: "Number\nOrders", icon: BarChart3, tint: "bg-[#EEF0FF] text-[#3949AB]", to: "/number-orders" },
  { label: "Boost\nOrders", icon: Star, tint: "bg-[#F3E8FF] text-[#7C3AED]", to: "/boost-orders" },
  { label: "Log\nHistory", icon: Clock, tint: "bg-[#F1F5F9] text-[#0F172A]", to: "/log-history" },
] as const;

const activity = [
  { id: 1, label: "Boosting: Instagram", subtitle: "5,000 followers • Just now", amount: -386.96, icon: Rocket, tint: "bg-[#F3E8FF] text-[#7C3AED]" },
  { id: 2, label: "Refund: Virtual Number", subtitle: "WhatsApp • USA S1", amount: 191.1, icon: ArrowDownLeft, tint: "bg-[#E6F7EE] text-[#0D9488]" },
  { id: 3, label: "Wallet Funding", subtitle: "Paga transfer • Success", amount: 5000, icon: ArrowUpRight, tint: "bg-[#EEF0FF] text-[#3949AB]" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: "Good Night", emoji: "🌙" };
  if (h < 12) return { text: "Good Morning", emoji: "☀️" };
  if (h < 17) return { text: "Good Afternoon", emoji: "🌤️" };
  if (h < 21) return { text: "Good Evening", emoji: "🌆" };
  return { text: "Good Night", emoji: "🌙" };
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Dashboard() {
  const [hidden, setHidden] = useState(false);
  const balance = 0.27;
  const g = greeting();

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-5 pt-6">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl brand-gradient text-base font-bold text-white shadow-[0_8px_20px_-6px_rgba(22,199,132,0.5)]">
          D
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold leading-tight">
            {g.text}, Denny <span className="ml-0.5">{g.emoji}</span>
          </h1>
          <p className="truncate text-xs text-muted-foreground">Your Vernex Dashboard</p>
        </div>
        <Link
          to="/alerts"
          aria-label="Notifications"
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground/90 hover:bg-surface-2 transition"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-surface" />
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
      </section>

      <TelegramModal />
    </AppShell>
  );
}

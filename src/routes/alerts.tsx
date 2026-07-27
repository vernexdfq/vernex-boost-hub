import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Vernex" },
      { name: "description", content: "System notifications, order updates and product announcements from Vernex." },
      { property: "og:title", content: "Vernex Alerts" },
      { property: "og:description", content: "Stay updated on your orders, refunds and new services." },
    ],
  }),
  component: Alerts,
});

const alerts = [
  { id: 1, title: "OTP received on Telegram order", body: "USA S2 • 2 minutes ago", icon: CheckCircle2, tint: "text-emerald-400" },
  { id: 2, title: "New pool: USA S3 now live", body: "20% cheaper WhatsApp OTPs today", icon: Sparkles, tint: "text-primary" },
  { id: 3, title: "Boost order partially delivered", body: "Instagram followers • 3,200 / 5,000", icon: AlertTriangle, tint: "text-amber-400" },
];

function Alerts() {
  return (
    <AppShell>
      <PageHeader title="Alerts" subtitle="System & order updates" right={<Bell className="h-5 w-5 text-muted-foreground" />} />
      <ul className="mt-5 space-y-2 px-5">
        {alerts.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${a.tint}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{a.title}</p>
                <p className="truncate text-xs text-muted-foreground">{a.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCircle2, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { getDashboardSummary, markNotificationsRead } from "@/lib/functions/dashboard.functions";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Verxor" },
      { name: "description", content: "System notifications, order updates and product announcements from Verxor." },
      { property: "og:title", content: "Verxor Alerts" },
      { property: "og:description", content: "Stay updated on your orders, refunds and new services." },
    ],
  }),
  component: Alerts,
});

const iconMap: Record<string, { icon: React.ElementType; tint: string }> = {
  welcome: { icon: Sparkles, tint: "text-primary" },
  credit: { icon: CheckCircle2, tint: "text-indigo-400" },
  order: { icon: CheckCircle2, tint: "text-indigo-400" },
  kyc: { icon: AlertTriangle, tint: "text-amber-500" },
  feature: { icon: Sparkles, tint: "text-primary" },
  general: { icon: Bell, tint: "text-slate-500" },
};

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

function Alerts() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchSummary = useServerFn(getDashboardSummary);
  const markRead = useServerFn(markNotificationsRead);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", user.id],
    queryFn: () => fetchSummary({ data: { limit: 10 } }),
  });

  useEffect(() => {
    markRead({ data: undefined }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
    });
  }, [markRead, queryClient, user.id]);

  const notifications = summary?.notifications ?? [];

  return (
    <AppShell>
      <PageHeader title="Alerts" subtitle="System & order updates" right={<Bell className="h-5 w-5 text-muted-foreground" />} />
      <div className="mt-5 px-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No alerts yet. We'll notify you when orders update.
          </div>
        ) : (
          <ul className="vx-list">
            {notifications.map((n) => {
              const mapped = iconMap[n.type] ?? iconMap.general;
              const Icon = mapped.icon;
              return (
                <li key={n.id} className={`flex gap-3 px-4 py-3.5 ${n.read ? "opacity-70" : ""}`}>
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${mapped.tint}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{relativeTime(n.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

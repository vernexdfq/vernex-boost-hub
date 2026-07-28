import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/boost-orders")({
  head: () => ({
    meta: [
      { title: "Boost Orders — Vernex" },
      { name: "description", content: "Track your active SMM boost orders." },
      { property: "og:title", content: "Vernex — Boost Orders" },
      { property: "og:description", content: "Live progress on every social boost order." },
    ],
  }),
  component: BoostOrders,
});

const orders = [
  { id: "BX-4412", svc: "Instagram Followers", target: "@dennyx", qty: 5000, done: 3820, status: "In progress" },
  { id: "BX-4409", svc: "TikTok Views", target: "@dennyx/video/812", qty: 25000, done: 25000, status: "Completed" },
  { id: "BX-4402", svc: "YouTube Subs", target: "@vernexchannel", qty: 1000, done: 218, status: "In progress" },
];

function BoostOrders() {
  return (
    <AppShell>
      <PageHeader title="Boost Orders" subtitle="SMM delivery tracker" />
      <ul className="px-5 pt-5 space-y-2">
        {orders.map((o) => {
          const pct = Math.round((o.done / o.qty) * 100);
          const done = pct >= 100;
          return (
            <li key={o.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{o.svc}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{o.target}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${done ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{o.status}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent">
                <div className="h-full brand-gradient" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>{o.done.toLocaleString()} / {o.qty.toLocaleString()}</span>
                <span>{pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}

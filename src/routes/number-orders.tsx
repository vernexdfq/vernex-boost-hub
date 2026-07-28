import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Check, Timer, X } from "lucide-react";

export const Route = createFileRoute("/number-orders")({
  head: () => ({
    meta: [
      { title: "Number Orders — Vernex" },
      { name: "description", content: "Your OTP virtual number order history." },
      { property: "og:title", content: "Vernex — OTP Order History" },
      { property: "og:description", content: "Review every OTP order and status." },
    ],
  }),
  component: NumberOrders,
});

const orders = [
  { id: "VX-8842", svc: "WhatsApp", num: "+1 341 802 7714", country: "USA S1", status: "received", otp: "483 921", when: "2m ago" },
  { id: "VX-8841", svc: "Telegram", num: "+1 725 555 0198", country: "USA S2", status: "waiting", when: "5m ago" },
  { id: "VX-8830", svc: "OpenAI", num: "+44 7700 900123", country: "UK S1", status: "failed", when: "1h ago" },
  { id: "VX-8801", svc: "TikTok", num: "+62 812 3456 7890", country: "IDN S1", status: "received", otp: "112 908", when: "3h ago" },
];

const badge = {
  received: { c: "border-emerald-400/30 bg-emerald-400/10 text-emerald-500", label: "Received", Icon: Check },
  waiting: { c: "border-amber-400/30 bg-amber-400/10 text-amber-500", label: "Waiting", Icon: Timer },
  failed: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Failed", Icon: X },
} as const;

function NumberOrders() {
  return (
    <AppShell>
      <PageHeader title="Number Orders" subtitle="OTP delivery log" />
      <ul className="px-5 pt-5 space-y-2">
        {orders.map((o) => {
          const b = badge[o.status as keyof typeof badge];
          const B = b.Icon;
          return (
            <li key={o.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{o.svc} <span className="text-muted-foreground font-normal">• {o.country}</span></p>
                  <p className="mt-0.5 text-[11px] tabular-nums font-mono text-muted-foreground">{o.num}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${b.c}`}>
                  <B className="h-3 w-3" /> {b.label}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>#{o.id}</span>
                <span>{o.when}</span>
              </div>
              {o.otp && <p className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm font-black tracking-[0.3em] text-emerald-600 tabular-nums">{o.otp}</p>}
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}

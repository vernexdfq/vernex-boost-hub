import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ArrowDownLeft, ArrowUpRight, Rocket, Phone } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Transaction History — Vernex" },
      { name: "description", content: "Review your Vernex wallet transactions, orders, and refunds." },
      { property: "og:title", content: "Vernex — Transaction History" },
      { property: "og:description", content: "Every wallet movement, order, and refund in one clean feed." },
    ],
  }),
  component: HistoryPage,
});

const items = [
  { id: 1, label: "Boosting: Instagram", sub: "5,000 followers", amount: -386.96, icon: Rocket, tint: "bg-[oklch(0.35_0.18_300)]/25 text-[oklch(0.78_0.2_300)]" },
  { id: 2, label: "Refund: Virtual Number", sub: "WhatsApp • USA S1", amount: 191.1, icon: ArrowDownLeft, tint: "bg-[oklch(0.4_0.15_165)]/25 text-[oklch(0.78_0.17_165)]" },
  { id: 3, label: "Wallet Funding", sub: "Paga transfer", amount: 5000, icon: ArrowUpRight, tint: "bg-[oklch(0.4_0.15_262)]/25 text-[oklch(0.78_0.16_262)]" },
  { id: 4, label: "Virtual Number: Telegram", sub: "USA S2 • Completed", amount: -420, icon: Phone, tint: "bg-[oklch(0.4_0.15_262)]/25 text-[oklch(0.78_0.16_262)]" },
  { id: 5, label: "Boosting: TikTok", sub: "10,000 views", amount: -1250.5, icon: Rocket, tint: "bg-[oklch(0.35_0.18_300)]/25 text-[oklch(0.78_0.2_300)]" },
];

const fmt = (n: number) => `₦${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function HistoryPage() {
  return (
    <AppShell>
      <PageHeader title="History" subtitle="All wallet movements & orders" />
      <div className="px-5 pt-5">
        <ul className="space-y-2">
          {items.map((row) => {
            const Icon = row.icon;
            const pos = row.amount >= 0;
            return (
              <li key={row.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card-elev">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${row.tint}`}>
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{row.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.sub}</p>
                </div>
                <span className={`shrink-0 text-sm font-bold tabular-nums ${pos ? "text-emerald-400" : "text-destructive"}`}>
                  {pos ? "+" : "-"}{fmt(row.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}

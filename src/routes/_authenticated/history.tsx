import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardSummary } from "@/lib/functions/dashboard.functions";

export const Route = createFileRoute("/_authenticated/history")({
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

const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function HistoryPage() {
  const { user } = Route.useRouteContext();
  const fetchSummary = useServerFn(getDashboardSummary);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", user.id],
    queryFn: () => fetchSummary({ data: { limit: 50 } }),
  });

  const transactions = summary?.transactions ?? [];

  return (
    <AppShell>
      <PageHeader title="History" subtitle="All wallet movements & orders" />
      <div className="px-5 pt-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No transactions yet. Fund your wallet to get started.
          </div>
        ) : (
          <ul className="space-y-2">
            {transactions.map((row) => {
              const pos = row.type === "credit";
              const Icon = pos ? ArrowDownLeft : ArrowUpRight;
              return (
                <li key={row.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card-elev">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${pos ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}`}>
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.description}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.payment_method ?? "Wallet"} • {row.status}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${pos ? "text-primary" : "text-destructive"}`}>
                    {pos ? "+" : "-"}{fmt(row.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

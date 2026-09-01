import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBoostOrders } from "@/lib/functions/boost.functions";

export const Route = createFileRoute("/_authenticated/boost-orders")({
  head: () => ({
    meta: [
      { title: "Boost Orders — Verxor" },
      { name: "description", content: "Track your active SMM boost orders." },
      { property: "og:title", content: "Verxor — Boost Orders" },
      { property: "og:description", content: "Live progress on every social boost order." },
    ],
  }),
  component: BoostOrders,
});

function BoostOrders() {
  const { user } = Route.useRouteContext();
  const fetchOrders = useServerFn(listBoostOrders);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["boost-orders", user.id],
    queryFn: () => fetchOrders({ data: undefined }),
  });

  return (
    <AppShell>
      <PageHeader title="Boost Orders" subtitle="SMM delivery tracker" />
      <div className="px-5 pt-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders?.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No boost orders yet.
          </div>
        ) : (
          <ul className="vx-list">
            {orders?.map((o) => {
              const product = o.boost_products as { platform?: string; service_type?: string } | null;
              const svc = `${product?.platform ?? "Unknown"} ${product?.service_type ?? ""}`;
              const meta = o.metadata as { done?: number } | null;
              const done = meta?.done ?? (o.status === "received" ? o.quantity : 0);
              const pct = Math.min(100, Math.round((done / o.quantity) * 100));
              const completed = o.status === "received";
              return (
                <li key={o.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{svc}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{o.target_url}</p>
                    </div>
                    <span className={`overflow-hidden rounded-full px-2 py-1 text-[10px] font-bold uppercase ${completed ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-600"}`}>
                      {completed ? "Completed" : "In progress"}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent">
                    <div className="h-full brand-gradient" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>{done.toLocaleString()} / {o.quantity.toLocaleString()}</span>
                    <span>{pct}%</span>
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

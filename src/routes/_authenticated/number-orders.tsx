import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Check, Timer, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNumberOrders } from "@/lib/functions/numbers.functions";

export const Route = createFileRoute("/_authenticated/number-orders")({
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

type OrderStatus = "pending" | "active" | "received" | "expired" | "cancelled" | "refunded";

const badge = {
  pending: { c: "border-amber-400/30 bg-amber-400/10 text-amber-500", label: "Pending" },
  active: { c: "border-amber-400/30 bg-amber-400/10 text-amber-500", label: "Active" },
  received: { c: "border-indigo-400/30 bg-indigo-400/10 text-indigo-400", label: "Received" },
  expired: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Expired" },
  cancelled: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Cancelled" },
  refunded: { c: "border-slate-400/30 bg-slate-400/10 text-slate-500", label: "Refunded" },
} as const;

const IconFor = { pending: Timer, active: Timer, received: Check, expired: X, cancelled: X, refunded: X } as const;

function NumberOrders() {
  const { user } = Route.useRouteContext();
  const fetchOrders = useServerFn(listNumberOrders);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["number-orders", user.id],
    queryFn: () => fetchOrders({ data: undefined }),
  });

  return (
    <AppShell>
      <PageHeader title="Number Orders" subtitle="OTP delivery log" />
      <ul className="space-y-2 px-5 pt-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders?.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No number orders yet.
          </div>
        ) : (
          orders?.map((o) => {
            const status: OrderStatus = (o.status as OrderStatus) ?? "pending";
            const b = badge[status];
            const B = IconFor[status];
            const product = o.number_products as { service_name?: string; country_name?: string; server_id?: string; provider?: string } | null;
            return (
              <li key={o.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">
                      {product?.service_name ?? "Unknown"}{" "}
                      <span className="font-normal text-muted-foreground">• {product?.country_name ?? "—"} {product?.server_id ?? ""}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">{o.phone_number ?? "Allocating…"}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${b.c}`}>
                    <B className="h-3 w-3" /> {b.label}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>#{o.id.slice(0, 8).toUpperCase()}</span>
                  <span>₦{Number(o.amount_paid).toLocaleString("en-NG")}</span>
                </div>
                {o.otp_code && status === "received" && (
                  <p className="mt-2 rounded-lg bg-indigo-500/10 px-3 py-2 text-center text-sm font-black tracking-[0.3em] text-indigo-400 tabular-nums">{o.otp_code}</p>
                )}
              </li>
            );
          })
        )}
      </ul>
    </AppShell>
  );
}

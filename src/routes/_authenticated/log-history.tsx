import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  Copy,
  Check,
  FileText,
  Loader2,
  Package,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { naira } from "@/lib/pricing";
import { listAccountOrders } from "@/lib/functions/accounts.functions";

export const Route = createFileRoute("/_authenticated/log-history")({
  head: () => ({
    meta: [
      { title: "Log History — Verxor" },
      { name: "description", content: "Your account log purchase history." },
      { property: "og:title", content: "Verxor — Log History" },
      {
        property: "og:description",
        content: "Track all your aged account and log purchases.",
      },
    ],
  }),
  component: LogHistory,
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function LogHistory() {
  const { user } = Route.useRouteContext();
  const fetchOrders = useServerFn(listAccountOrders);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["account-orders", user.id],
    queryFn: () => fetchOrders({ data: undefined }),
  });

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success("Copied");
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  function CredRow({
    label,
    value,
    orderId,
    field,
  }: {
    label: string;
    value?: string;
    orderId: string;
    field: string;
  }) {
    if (!value) return null;
    const key = `${orderId}-${field}`;
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="truncate font-mono text-[13px] font-semibold">{value}</p>
        </div>
        <button
          type="button"
          onClick={() => copy(value, key)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-primary"
        >
          {copied === key ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          Copy
        </button>
      </div>
    );
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md">
        <Link to="/buy-accounts" aria-label="Back" className="text-primary">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-[15px] font-bold">Log History</h1>
          <p className="text-[11px] text-muted-foreground">Account purchase records</p>
        </div>
        <Link
          to="/buy-accounts"
          className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-primary"
        >
          Shop
        </Link>
      </header>

      <div className="px-5 pt-5 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">No purchases yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Buy accounts from the marketplace to see credentials here.
            </p>
            <Link
              to="/buy-accounts"
              className="mt-4 inline-flex rounded-xl brand-gradient px-4 py-2.5 text-sm font-bold text-white"
            >
              Browse accounts
            </Link>
          </div>
        ) : (
          <ul className="vx-list">
            {orders.map((o) => (
              <li
                key={o.id}
                className="px-4 py-3.5"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{o.product_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {o.platform} · {timeAgo(o.created_at)} ·{" "}
                      <span className="font-semibold capitalize text-indigo-400">
                        {o.status}
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black tabular-nums">
                    {naira(o.amount_paid)}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <CredRow
                    label="Username"
                    value={o.credentials.username}
                    orderId={o.id}
                    field="user"
                  />
                  <CredRow
                    label="Password"
                    value={o.credentials.password}
                    orderId={o.id}
                    field="pass"
                  />
                  <CredRow
                    label="Email"
                    value={o.credentials.email}
                    orderId={o.id}
                    field="email"
                  />
                  <CredRow
                    label="Extra"
                    value={o.credentials.extra}
                    orderId={o.id}
                    field="extra"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

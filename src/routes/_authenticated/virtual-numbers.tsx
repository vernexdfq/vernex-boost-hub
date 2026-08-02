import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Copy, Check, Timer, Loader2, Phone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { naira } from "@/lib/pricing";
import { createNumberOrder, listNumberProducts, listNumberOrders, type NumberProduct } from "@/lib/functions/numbers.functions";

export const Route = createFileRoute("/_authenticated/virtual-numbers")({
  head: () => ({
    meta: [
      { title: "Virtual Numbers — Vernex" },
      { name: "description", content: "Rent virtual numbers for WhatsApp, Telegram, OpenAI and 300+ services. Instant OTP delivery." },
      { property: "og:title", content: "Vernex Virtual Numbers" },
      { property: "og:description", content: "Instant OTPs from 300+ services across USA and global server pools." },
    ],
  }),
  component: VirtualNumbers,
});

type OrderStatus = "pending" | "active" | "received" | "expired" | "cancelled" | "refunded";

const badge = {
  pending: { c: "border-amber-400/30 bg-amber-400/10 text-amber-500", label: "Pending" },
  active: { c: "border-amber-400/30 bg-amber-400/10 text-amber-500", label: "Active" },
  received: { c: "border-emerald-400/30 bg-emerald-400/10 text-emerald-500", label: "Received" },
  expired: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Expired" },
  cancelled: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Cancelled" },
  refunded: { c: "border-slate-400/30 bg-slate-400/10 text-slate-500", label: "Refunded" },
} as const;

const flags: Record<string, string> = {
  US: "🇺🇸",
  GB: "🇬🇧",
  NG: "🇳🇬",
  RU: "🇷🇺",
};

function VirtualNumbers() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listNumberProducts);
  const fetchOrders = useServerFn(listNumberOrders);
  const orderNumber = useServerFn(createNumberOrder);

  const [serverId, setServerId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["number-products"],
    queryFn: () => fetchProducts({ data: undefined }),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["number-orders", user.id],
    queryFn: () => fetchOrders({ data: undefined }),
  });

  useEffect(() => {
    if (products && products.length > 0 && !serverId) {
      setServerId(products[0].server_id);
    }
  }, [products, serverId]);

  const servers = useMemo(() => {
    if (!products) return [];
    const map = new Map<string, NumberProduct[]>();
    for (const p of products) {
      const list = map.get(p.server_id) ?? [];
      list.push(p);
      map.set(p.server_id, list);
    }
    return Array.from(map.entries()).map(([id, list]) => ({
      id,
      label: id,
      provider: list[0].provider,
      country: list[0].country_name,
    }));
  }, [products]);

  const activeServer = servers.find((s) => s.id === serverId) ?? servers[0];

  const filtered = useMemo(() => {
    if (!products || !serverId) return [];
    return products.filter((p) => p.server_id === serverId && p.service_name.toLowerCase().includes(query.toLowerCase()));
  }, [products, serverId, query]);

  async function copy(value: string, key: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function handleOrder(product: NumberProduct) {
    if (busy) return;
    setBusy(product.id);
    try {
      await orderNumber({ data: { productId: product.id, amount: product.selling_price_ngn } });
      toast.success(`${product.service_name} number ordered`);
      queryClient.invalidateQueries({ queryKey: ["number-orders", user.id] });
      queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Virtual Numbers" subtitle="Instant OTP delivery" />

      <div className="px-5 pt-5">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {servers.map((s) => {
            const active = s.id === serverId;
            return (
              <button
                key={s.id}
                onClick={() => setServerId(s.id)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-transparent brand-gradient text-white shadow-[0_8px_20px_-8px_rgba(22,199,132,0.7)]"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label} {s.country}
              </button>
            );
          })}
        </div>
        {activeServer && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Provider: <span className="font-semibold text-foreground">{activeServer.provider}</span>
          </p>
        )}
      </div>

      <div className="px-5 pt-4">
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card-elev focus-within:border-primary/60">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </label>

        {productsLoading ? (
          <div className="mt-6 flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No services found for this server.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {filtered.map((s) => (
              <li key={s.id} className="rounded-2xl border border-border bg-surface p-3.5 shadow-card-elev">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{flags[s.country_code] ?? "🌐"}</span>
                    <span className="text-sm font-bold">{s.service_name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {s.stock_count > 0 ? `${s.stock_count} in stock` : "Out of stock"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-lg font-black tabular-nums text-primary">{naira(s.selling_price_ngn)}</span>
                  <button
                    onClick={() => handleOrder(s)}
                    disabled={busy === s.id || s.stock_count <= 0}
                    className="inline-flex items-center gap-1.5 rounded-xl brand-gradient px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    {busy === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
                    Order
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="px-5 pt-6">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Active Orders</h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        {ordersLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders?.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No active orders yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {orders?.map((o) => {
              const status: OrderStatus = (o.status as OrderStatus) ?? "pending";
              const b = badge[status];
              const product = o.number_products as { service_name?: string; country_name?: string; server_id?: string; provider?: string } | null;
              const serviceName = product?.service_name ?? "Unknown";
              const country = product?.country_name ?? "—";
              const number = o.phone_number ?? "Allocating number…";
              return (
                <li key={o.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold">{serviceName}</p>
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{country} {product?.server_id ?? ""}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${b.c}`}>
                      {status === "active" || status === "pending" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : <Check className="h-3 w-3" />}
                      {b.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5">
                    <span className="truncate text-sm font-semibold tabular-nums">{number}</span>
                    <button
                      onClick={() => copy(number, `num-${o.id}`, "Number")}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg brand-gradient px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      {copied === `num-${o.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === `num-${o.id}` ? "Copied" : "Copy"}
                    </button>
                  </div>

                  {status === "received" && o.otp_code && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300/80">OTP Code</p>
                        <p className="truncate text-lg font-black tracking-[0.3em] text-emerald-300 tabular-nums">{o.otp_code}</p>
                      </div>
                      <button
                        onClick={() => copy(o.otp_code!.replace(/\s/g, ""), `otp-${o.id}`, "OTP")}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-bold text-[oklch(0.2_0.05_160)]"
                      >
                        {copied === `otp-${o.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        Copy OTP
                      </button>
                    </div>
                  )}

                  {(status === "pending" || status === "active") && (
                    <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <Timer className="h-3.5 w-3.5" /> Waiting for SMS…
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

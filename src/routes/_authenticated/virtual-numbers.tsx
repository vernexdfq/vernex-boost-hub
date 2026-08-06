import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Copy,
  Check,
  Timer,
  Loader2,
  ShoppingCart,
  ChevronDown,
  ChevronLeft,
  Bell,
  Smartphone,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { naira } from "@/lib/pricing";
import { fetchAccount } from "@/lib/account";
import {
  createNumberOrder,
  listNumberProducts,
  listNumberOrders,
  type NumberProduct,
} from "@/lib/functions/numbers.functions";

export const Route = createFileRoute("/_authenticated/virtual-numbers")({
  head: () => ({
    meta: [
      { title: "Virtual Numbers — Vernex" },
      {
        name: "description",
        content:
          "Buy a temporary phone number to receive OTP codes from WhatsApp, Telegram, OpenAI and 300+ services.",
      },
      { property: "og:title", content: "Vernex Virtual Numbers" },
      {
        property: "og:description",
        content: "Instant OTPs from 300+ services across USA and global server pools.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VirtualNumbers,
});

type OrderStatus = "pending" | "active" | "received" | "expired" | "cancelled" | "refunded";

const badge = {
  pending: { c: "border-amber-400/30 bg-amber-400/10 text-amber-600", label: "Waiting" },
  active: { c: "border-amber-400/30 bg-amber-400/10 text-amber-600", label: "Waiting" },
  received: { c: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600", label: "Received" },
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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/60 ${className}`} />;
}

function VirtualNumbers() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listNumberProducts);
  const fetchOrders = useServerFn(listNumberOrders);
  const orderNumber = useServerFn(createNumberOrder);

  const [serverKey, setServerKey] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showFund, setShowFund] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["number-products"],
    queryFn: () => fetchProducts({ data: undefined }),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["number-orders", user.id],
    queryFn: () => fetchOrders({ data: undefined }),
  });

  const { data: account } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
  });

  const balance = account?.wallet?.balance ?? 0;

  const servers = useMemo(() => {
    if (!products) return [];
    const map = new Map<string, NumberProduct[]>();
    for (const p of products) {
      const key = `${p.country_code}-${p.server_id}`;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, list]) => ({
      key,
      label: `${list[0].country_name === "United States" ? "USA" : list[0].country_name} (${list[0].server_id})`,
      flag: flags[list[0].country_code] ?? "🌐",
      provider: list[0].provider,
      items: list,
    }));
  }, [products]);

  useEffect(() => {
    if (servers.length > 0 && !serverKey) setServerKey(servers[0].key);
  }, [servers, serverKey]);

  const activeServer = servers.find((s) => s.key === serverKey) ?? servers[0];
  const services = activeServer?.items ?? [];

  useEffect(() => {
    if (services.length > 0 && !services.some((s) => s.id === serviceId)) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  const selected = services.find((s) => s.id === serviceId) ?? null;
  const totalStock = services.reduce((sum, s) => sum + s.stock_count, 0);

  const filteredServices = useMemo(
    () => services.filter((s) => s.service_name.toLowerCase().includes(query.toLowerCase())),
    [services, query],
  );

  useEffect(() => {
    if (!pickerOpen) return;
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);

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

  async function handleOrder() {
    if (!selected || busy) return;
    if (selected.stock_count <= 0) {
      toast.error("This service is out of stock");
      return;
    }
    if (balance < selected.selling_price_ngn) {
      setShowFund(true);
      return;
    }
    setBusy(true);
    try {
      await orderNumber({
        data: { productId: selected.id, amount: selected.selling_price_ngn },
      });
      toast.success(`${selected.service_name} number reserved`);
      queryClient.invalidateQueries({ queryKey: ["number-orders", user.id] });
      queryClient.invalidateQueries({ queryKey: ["number-products"] });
      queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          to="/dashboard"
          aria-label="Back"
          className="inline-flex items-center gap-1 text-sm font-bold text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-bold">Virtual Numbers</h1>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black tabular-nums text-primary">
          {naira(Math.round(balance))}
        </span>
        <Link
          to="/alerts"
          aria-label="Notifications"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface"
        >
          <Bell className="h-4 w-4" />
        </Link>
      </header>

      <div className="px-5 pt-5">
        <h2 className="text-2xl font-black tracking-tight">Virtual Numbers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Buy a temporary phone number to receive OTP codes
        </p>
      </div>

      {/* Server selection */}
      <div className="px-5 pt-4">
        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : productsError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
            <AlertCircle className="mx-auto h-5 w-5 text-destructive" />
            <p className="mt-2 text-sm font-semibold">Couldn't load servers</p>
            <button
              onClick={() => refetchProducts()}
              className="mt-2 rounded-lg brand-gradient px-3 py-1.5 text-[11px] font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {servers.map((s) => {
              const active = s.key === serverKey;
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    setServerKey(s.key);
                    setQuery("");
                  }}
                  className={`rounded-2xl border px-3 py-3 text-sm font-bold transition-all duration-200 ${
                    active
                      ? "border-transparent brand-gradient text-white shadow-[0_10px_24px_-12px_rgba(22,199,132,0.9)]"
                      : "border-border bg-surface text-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="mr-1.5">{s.flag}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Order a Number */}
      <section className="px-5 pt-5">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <h3 className="text-base font-black">Order a Number</h3>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Service{" "}
            <span className="normal-case tracking-normal">
              ({totalStock.toLocaleString("en-NG")} available)
            </span>
          </p>

          <div ref={pickerRef} className="relative mt-2">
            <button
              onClick={() => setPickerOpen((o) => !o)}
              disabled={services.length === 0}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3 text-left disabled:opacity-60"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Smartphone className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                {selected?.service_name ?? "Select a service"}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground transition ${pickerOpen ? "rotate-180" : ""}`}
              />
            </button>

            {pickerOpen && (
              <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
                <label className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search services…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <ul className="max-h-64 overflow-y-auto">
                  {filteredServices.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No services match "{query}"
                    </li>
                  ) : (
                    filteredServices.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            setServiceId(s.id);
                            setPickerOpen(false);
                            setQuery("");
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-surface-2 ${
                            s.id === serviceId ? "bg-primary/5 font-bold text-primary" : ""
                          }`}
                        >
                          <span className="truncate">{s.service_name}</span>
                          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                            {naira(s.selling_price_ngn)}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Price & stock */}
          <div className="mt-3 rounded-2xl border border-border bg-background px-4 py-3">
            {productsLoading ? (
              <Skeleton className="h-10" />
            ) : selected ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-2xl font-black tabular-nums text-primary">
                    {naira(selected.selling_price_ngn)}.00
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {selected.stock_count.toLocaleString("en-NG")} numbers in stock ·{" "}
                    {activeServer?.provider}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    selected.stock_count > 0
                      ? "bg-emerald-400/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {selected.stock_count > 0 ? "Available" : "Out of Stock"}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No services on this server.</p>
            )}
          </div>

          <button
            onClick={handleOrder}
            disabled={busy || !selected || selected.stock_count <= 0}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 text-sm font-black text-white shadow-[0_12px_28px_-14px_rgba(22,199,132,0.9)] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Order Number
          </button>
        </div>
      </section>

      {/* Recent orders */}
      <section className="px-5 pt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-black">Recent Orders</h2>
          <Link
            to="/number-orders"
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-[11px] font-bold text-primary"
          >
            View All
          </Link>
        </div>

        {ordersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No orders yet — pick a service above to get started.
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.slice(0, 5).map((o) => {
              const status: OrderStatus = (o.status as OrderStatus) ?? "pending";
              const b = badge[status];
              const product = o.number_products as {
                service_name?: string;
                country_name?: string;
                server_id?: string;
                provider?: string;
              } | null;
              const serviceName = product?.service_name ?? "Unknown";
              const country = product?.country_name ?? "—";
              const number = o.phone_number ?? "Allocating number…";
              return (
                <li key={o.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Smartphone className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{serviceName}</p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                          {country} {product?.server_id ?? ""} · {timeAgo(o.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${b.c}`}
                    >
                      {status === "active" || status === "pending" ? (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
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
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600/80">
                          OTP Code
                        </p>
                        <p className="truncate text-lg font-black tabular-nums tracking-[0.3em] text-emerald-600">
                          {o.otp_code}
                        </p>
                      </div>
                      <button
                        onClick={() => copy(o.otp_code!.replace(/\s/g, ""), `otp-${o.id}`, "OTP")}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-white"
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

      {/* Insufficient funds modal */}
      {showFund && selected && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 p-4 sm:place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Wallet className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-lg font-black">Insufficient balance</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selected.service_name} costs {naira(selected.selling_price_ngn)} but your wallet has{" "}
              {naira(Math.round(balance))}. Fund{" "}
              <span className="font-bold text-foreground">
                {naira(Math.ceil(selected.selling_price_ngn - balance))}
              </span>{" "}
              more to continue.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowFund(false)}
                className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <Link
                to="/fund"
                className="flex-1 rounded-xl brand-gradient py-3 text-center text-sm font-black text-white"
              >
                Fund wallet
              </Link>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

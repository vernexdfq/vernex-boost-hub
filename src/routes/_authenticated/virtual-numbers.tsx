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
import {
  SMS_SERVER_SLOTS,
  resolveSmsSlotId,
  type SmsSlotId,
} from "@/lib/sms-servers";

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
    ],
  }),
  component: VirtualNumbers,
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold text-slate-900">Virtual Numbers</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Could not load this page. Your servers are still connected — try again.
      </p>
      <p className="max-w-sm text-xs text-slate-400">{error?.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
      >
        Try again
      </button>
    </div>
  ),
});

type OrderStatus = "pending" | "active" | "received" | "expired" | "cancelled" | "refunded";

const badge = {
  pending: { c: "border-amber-400/30 bg-amber-400/10 text-amber-600", label: "Waiting" },
  active: { c: "border-amber-400/30 bg-amber-400/10 text-amber-600", label: "Waiting" },
  received: { c: "border-indigo-400/30 bg-indigo-400/10 text-indigo-600", label: "Received" },
  expired: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Expired" },
  cancelled: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Cancelled" },
  refunded: { c: "border-slate-400/30 bg-slate-400/10 text-slate-500", label: "Refunded" },
} as const;

const SERVER_SLOTS = SMS_SERVER_SLOTS.map((s) => ({
  ...s,
  match: (p: NumberProduct) => {
    try {
      return (
        resolveSmsSlotId(
          p?.country_code ?? "",
          p?.country_name ?? "",
          p?.server_id ?? "",
        ) === s.id
      );
    } catch {
      return false;
    }
  },
}));

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
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

function VirtualNumbers() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listNumberProducts);
  const fetchOrders = useServerFn(listNumberOrders);
  const orderNumber = useServerFn(createNumberOrder);

  const [serverId, setServerId] = useState<SmsSlotId>("US-S1");
  const [countryKey, setCountryKey] = useState<string>("");
  const [serviceKey, setServiceKey] = useState<string>("");
  const [productId, setProductId] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showFund, setShowFund] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["number-products", serverId],
    queryFn: async () => {
      try {
        return (await fetchProducts({ data: { slotId: serverId as "US-S1" } })) ?? [];
      } catch (err) {
        console.error("[virtual-numbers] products", err);
        return [] as NumberProduct[];
      }
    },
    enabled: Boolean(serverId),
    retry: 0,
    staleTime: 60_000,
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
  const activeSlot = SERVER_SLOTS.find((s) => s.id === serverId) ?? SERVER_SLOTS[0];
  const isUsaSlot = activeSlot.group === "usa";

  const slotProducts = useMemo(() => {
    if (!Array.isArray(products)) return [] as NumberProduct[];
    return products
      .filter((p) => p && typeof p === "object" && p.id)
      .map((p) => ({
        ...p,
        service_name: String(p.service_name ?? p.service_key ?? "Service"),
        service_key: String(p.service_key ?? ""),
        country_name: String(p.country_name ?? ""),
        country_code: String(p.country_code ?? ""),
        provider: String(p.provider ?? ""),
        selling_price_ngn: Number(p.selling_price_ngn) || 0,
        stock_count: Number(p.stock_count) || 0,
        provider_cost_usd: Number(p.provider_cost_usd) || 0,
        operator: p.operator ? String(p.operator) : undefined,
        success_rate:
          p.success_rate != null && Number.isFinite(Number(p.success_rate))
            ? Number(p.success_rate)
            : undefined,
      }))
      .sort(
        (a, b) =>
          a.selling_price_ngn - b.selling_price_ngn ||
          b.stock_count - a.stock_count,
      );
  }, [products]);

  const countries = useMemo(() => {
    const map = new Map<string, { key: string; name: string; count: number }>();
    for (const p of slotProducts) {
      const key = (p.country_code || p.country_name || "XX").toUpperCase();
      const name = p.country_name || p.country_code || key;
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { key, name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [slotProducts]);

  useEffect(() => {
    setCountryKey("");
    setServiceKey("");
    setProductId(null);
    setQuery("");
    setCountryOpen(false);
    setServiceOpen(false);
  }, [serverId]);

  // USA slots: lock country to US (no picker). All Countries: pick first / US if present.
  useEffect(() => {
    if (isUsaSlot) {
      const us = countries.find((c) => c.key === "US" || /united|usa/i.test(c.name));
      setCountryKey(us?.key ?? "US");
      return;
    }
    if (!countryKey && countries.length) {
      const us = countries.find((c) => c.key === "US" || /united|usa/i.test(c.name));
      setCountryKey((us ?? countries[0]).key);
    }
  }, [countries, countryKey, isUsaSlot]);

  const countryProducts = useMemo(() => {
    // USA server tabs: show all products from that slot (already USA-scoped by API)
    if (isUsaSlot) return slotProducts;
    if (!countryKey) return slotProducts;
    return slotProducts.filter(
      (p) =>
        (p.country_code || p.country_name || "").toUpperCase() === countryKey ||
        (p.country_code || "").toUpperCase() === countryKey,
    );
  }, [slotProducts, countryKey, isUsaSlot]);

  const services = useMemo(() => {
    const map = new Map<string, { key: string; name: string; count: number }>();
    for (const p of countryProducts) {
      const key = p.service_key || p.service_name;
      const name = p.service_name || p.service_key;
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { key, name, count: 1 });
    }
    const list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q));
  }, [countryProducts, query]);

  useEffect(() => {
    if (!serviceKey && services.length) {
      const wa = services.find((s) => /whatsapp/i.test(s.name));
      setServiceKey((wa ?? services[0]).key);
    }
  }, [services, serviceKey]);

  useEffect(() => {
    setServiceKey("");
    setProductId(null);
  }, [countryKey]);

  const operators = useMemo(() => {
    if (!serviceKey) return [] as NumberProduct[];
    return countryProducts
      .filter((p) => (p.service_key || p.service_name) === serviceKey)
      .sort(
        (a, b) =>
          a.selling_price_ngn - b.selling_price_ngn ||
          b.stock_count - a.stock_count,
      );
  }, [countryProducts, serviceKey]);

  useEffect(() => {
    if (operators.length && (!productId || !operators.some((o) => o.id === productId))) {
      setProductId(operators[0].id);
    }
  }, [operators, productId]);

  const selected = operators.find((p) => p.id === productId) ?? null;
  const activeCountry = countries.find((c) => c.key === countryKey);
  const activeService = services.find((s) => s.key === serviceKey);

  useEffect(() => {
    if (!countryOpen && !serviceOpen) return;
    function onClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [countryOpen, serviceOpen]);

  async function copy(value: string, key: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  async function handleOrder() {
    if (!selected) return;
    if (selected.stock_count <= 0) {
      toast.error("This service is out of stock on the selected server");
      return;
    }
    if (balance < selected.selling_price_ngn) {
      setShowFund(true);
      toast.error("Insufficient balance");
      return;
    }
    setBusy(true);
    try {
      await orderNumber({
        data: {
          productId: selected.id,
          amount: selected.selling_price_ngn,
          slotId: serverId as "US-S1",
        },
      });
      toast.success("Number ordered — waiting for SMS");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["number-orders", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["account", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["number-products"] }),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Order failed";
      toast.error(msg);
      if (/insufficient/i.test(msg)) setShowFund(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell showThemeToggle={false}>
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md">
        <Link
          to="/dashboard"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-black tracking-tight text-slate-900">Virtual Numbers</h1>
          <p className="truncate text-[11px] text-slate-500">
            Buy a temporary phone number to receive OTP codes
          </p>
        </div>
        <div className="rounded-full border border-indigo-500/20 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold tabular-nums text-indigo-700">
          {naira(balance)}
        </div>
        <Link
          to="/alerts"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600"
          aria-label="Alerts"
        >
          <Bell className="h-4 w-4" />
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-5">
        {/* Server chips — slightly larger for better tap targets */}
        <div className="mb-5 flex flex-wrap gap-2">
          {SERVER_SLOTS.map((slot) => {
            const active = slot.id === serverId;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setServerId(slot.id)}
                className={`tap-fast inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                }`}
              >
                <span className="text-base leading-none">{slot.flag}</span>
                <span className="leading-none">{slot.label}</span>
              </button>
            );
          })}
        </div>

        {/* Order card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-200/50 sm:p-5">
          <h2 className="mb-0.5 text-base font-black text-slate-900">Order a Number</h2>
          <p className="mb-4 text-[11px] font-medium text-slate-400">
            {activeSlot.label} · live provider catalog
          </p>

          {productsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-24" />
            </div>
          ) : productsError || (!productsLoading && slotProducts.length === 0) ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
              <p className="text-sm font-bold text-slate-900">
                Server currently offline / try another server
              </p>
              <p className="mt-1 text-xs text-slate-600">
                No live services for this tab. Check the Cloudflare API key for this provider,
                then retry.
              </p>
              <button
                type="button"
                onClick={() => void refetchProducts()}
                className="mt-3 text-sm font-bold text-indigo-600"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Country — only for All Countries servers (like Primex) */}
              {!isUsaSlot && (
                <div className="relative mb-3" ref={countryRef}>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Country ({countries.length} available)
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCountryOpen((v) => !v);
                      setServiceOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-left transition hover:border-indigo-300"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                        🌐
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {activeCountry?.name ?? "Search & select a country"}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                  {countryOpen && (
                    <div className="absolute left-0 right-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {countries.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => {
                            setCountryKey(c.key);
                            setCountryOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                            c.key === countryKey
                              ? "bg-indigo-50 font-bold text-indigo-700"
                              : "text-slate-800"
                          }`}
                        >
                          <span>{c.name}</span>
                          <span className="text-xs text-slate-400">{c.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Service */}
              <div className="relative mb-4" ref={serviceRef}>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Service ({services.length} available)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setServiceOpen((v) => !v);
                    setCountryOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-left transition hover:border-indigo-300"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Smartphone className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {activeService?.name ?? "Search & select a service"}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                {serviceOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search service…"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>
                    <ul className="max-h-48 overflow-y-auto">
                      {services.length === 0 ? (
                        <li className="px-4 py-6 text-center text-sm text-slate-500">No services</li>
                      ) : (
                        services.map((s) => (
                          <li key={s.key}>
                            <button
                              type="button"
                              onClick={() => {
                                setServiceKey(s.key);
                                setServiceOpen(false);
                                setQuery("");
                              }}
                              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                                s.key === serviceKey
                                  ? "bg-indigo-50 font-bold text-indigo-700"
                                  : "text-slate-800"
                              }`}
                            >
                              <span>{s.name}</span>
                              <span className="text-xs text-slate-400">{s.count} tiers</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Operators / price board */}
              <div className="mb-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Select operator
                </p>
                <div className="mb-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                  <span className="font-semibold text-indigo-700">Info: </span>
                  Each operator has different pricing and delivery success rates. Higher % = more
                  likely to receive OTP.
                </div>

                {operators.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                    No operators for this service
                  </div>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
                    {operators.map((op) => {
                      const active = op.id === productId;
                      const label =
                        op.operator || (op.provider ? `${op.provider}` : "default");
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setProductId(op.id)}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                            active
                              ? "border-indigo-500 bg-indigo-50/40 shadow-sm"
                              : "border-slate-200 bg-white hover:border-indigo-200"
                          }`}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                            <Smartphone className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{label}</span>
                              {op.success_rate != null && (
                                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                  {op.success_rate}% SUCCESS
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-slate-500">
                              {op.stock_count.toLocaleString()} available
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-black tabular-nums text-indigo-600">
                            {naira(op.selling_price_ngn)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selected && (
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <div>
                    <div className="text-xl font-black text-indigo-600">
                      {naira(selected.selling_price_ngn)}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-400">
                      📦 {selected.stock_count.toLocaleString()} numbers in stock
                      {selected.operator ? ` · ${selected.operator}` : ""}
                    </div>
                  </div>
                  <span className="h-fit rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                    Available
                  </span>
                </div>
              )}

              {showFund && (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Not enough balance.{" "}
                  <Link to="/fund" className="font-bold text-indigo-600 underline">
                    Fund wallet
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={handleOrder}
                disabled={busy || !selected || selected.stock_count <= 0}
                className="tap-fast flex w-full items-center justify-center space-x-2 rounded-2xl bg-indigo-600 py-3.5 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShoppingCart className="h-5 w-5" />
                )}
                <span>Order Number</span>
              </button>
            </>
          )}
        </div>

        {/* Recent orders */}
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-slate-900">Recent Orders</h2>
            <Link
              to="/number-orders"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-600"
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
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No orders yet — pick a service above to get started.
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.slice(0, 8).map((o) => {
                const status = (o.status as OrderStatus) || "pending";
                const b = badge[status] ?? badge.pending;
                const product = o.number_products as {
                  service_name?: string;
                  country_name?: string;
                  server_id?: string;
                } | null;
                const serviceName = product?.service_name ?? "Number";
                const country = product?.country_name ?? "";
                return (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{serviceName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {country}
                          {product?.server_id ? ` · ${product.server_id}` : ""} ·{" "}
                          {timeAgo(o.created_at)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${b.c}`}
                      >
                        {b.label}
                      </span>
                    </div>
                    {o.phone_number && (
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                        <span className="font-mono text-sm font-semibold tabular-nums text-slate-800">
                          {o.phone_number}
                        </span>
                        <button
                          type="button"
                          onClick={() => copy(String(o.phone_number), `p-${o.id}`, "Number")}
                          className="text-indigo-600"
                          aria-label="Copy number"
                        >
                          {copied === `p-${o.id}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                    {o.otp_code && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                        <span className="font-mono text-base font-black tracking-widest text-indigo-700">
                          {o.otp_code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copy(String(o.otp_code), `o-${o.id}`, "OTP")}
                          className="text-indigo-600"
                          aria-label="Copy OTP"
                        >
                          {copied === `o-${o.id}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                    {(status === "pending" || status === "active") && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-600">
                        <Timer className="h-3.5 w-3.5" /> Waiting for SMS…
                      </p>
                    )}
                    <p className="mt-2 text-right text-xs font-bold tabular-nums text-slate-700">
                      {naira(Number(o.amount_paid))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}

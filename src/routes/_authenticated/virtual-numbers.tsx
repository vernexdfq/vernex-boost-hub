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
  match: (p: NumberProduct) =>
    resolveSmsSlotId(p.country_code, p.country_name, p.server_id) === s.id,
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
    queryKey: ["number-products", serverId],
    queryFn: () => fetchProducts({ data: { slotId: serverId as "US-S1" } }),
    enabled: Boolean(serverId),
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

  const slotProducts = useMemo(() => {
    if (!products) return [] as NumberProduct[];
    return products.filter((p) => activeSlot.match(p));
  }, [products, activeSlot]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return slotProducts;
    return slotProducts.filter(
      (p) =>
        p.service_name.toLowerCase().includes(q) ||
        p.service_key.toLowerCase().includes(q),
    );
  }, [slotProducts, query]);

  useEffect(() => {
    setServiceId(null);
    setQuery("");
    setPickerOpen(false);
  }, [serverId]);

  useEffect(() => {
    if (slotProducts.length > 0 && !serviceId) {
      const wa = slotProducts.find((p) => /whatsapp/i.test(p.service_name));
      setServiceId((wa ?? slotProducts[0]).id);
    }
  }, [slotProducts, serviceId]);

  const selected = slotProducts.find((p) => p.id === serviceId) ?? null;

  useEffect(() => {
    if (!pickerOpen) return;
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);

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

      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-5">
        {/* Server selector — fixed slots for Cloudflare API mapping */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SERVER_SLOTS.map((slot) => {
            const active = slot.id === serverId;
            const count = products?.filter((p) => slot.match(p)).length ?? 0;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setServerId(slot.id)}
                className={`tap-fast flex items-center space-x-2 rounded-2xl p-3 text-left text-sm font-bold transition-all ${
                  active
                    ? "border-2 border-indigo-600 bg-indigo-600 text-white shadow-md"
                    : "border border-slate-200 bg-white text-slate-800 hover:border-indigo-300"
                } ${slot.id === "ALL-S5" ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <span className="text-lg">{slot.flag}</span>
                <span className="min-w-0 flex-1 leading-tight">
                  {slot.label}
                  {!productsLoading && (
                    <span
                      className={`mt-0.5 block text-[10px] font-semibold ${
                        active ? "text-white/80" : "text-slate-400"
                      }`}
                    >
                      {count} services
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Order card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <h2 className="mb-1 text-lg font-black text-slate-900">Order a Number</h2>
          <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Service ({slotProducts.length} available)
            <span className="ml-2 font-medium normal-case tracking-normal text-slate-400">
              · {activeSlot.label}
            </span>
          </p>

          {productsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-24" />
              <Skeleton className="h-14" />
            </div>
          ) : productsError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load services</p>
              <button
                type="button"
                onClick={() => void refetchProducts()}
                className="mt-2 text-sm font-bold text-indigo-600"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Service dropdown */}
              <div className="relative mb-6" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setPickerOpen((v) => !v)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-indigo-300"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 sm:text-base">
                      {selected?.service_name ?? "Select a service"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition ${pickerOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {pickerOpen && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search services…"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-400"
                          autoFocus
                        />
                      </div>
                    </div>
                    <ul className="max-h-64 overflow-y-auto py-1">
                      {filtered.length === 0 ? (
                        <li className="px-4 py-6 text-center text-sm text-slate-500">
                          No services on this server
                        </li>
                      ) : (
                        filtered.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setServiceId(p.id);
                                setPickerOpen(false);
                                setQuery("");
                              }}
                              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                                p.id === serviceId ? "bg-indigo-50" : ""
                              }`}
                            >
                              <span className="font-semibold text-slate-800">{p.service_name}</span>
                              <span className="tabular-nums text-xs font-bold text-indigo-600">
                                {naira(p.selling_price_ngn)}
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
              {selected ? (
                <div className="mb-8 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5">
                  <div>
                    <div className="text-2xl font-black text-indigo-600 sm:text-3xl">
                      {naira(selected.selling_price_ngn)}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-400">
                      📦 {selected.stock_count.toLocaleString()} numbers in stock
                      {selected.provider_cost_usd > 0 && (
                        <span className="ml-2 text-slate-400">
                          · Cost ${selected.provider_cost_usd.toFixed(3)} · {selected.provider}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`h-fit rounded-full border px-3 py-1 text-xs font-bold ${
                      selected.stock_count > 0
                        ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                        : "border-red-100 bg-red-50 text-red-600"
                    }`}
                  >
                    {selected.stock_count > 0 ? "Available" : "Out of Stock"}
                  </span>
                </div>
              ) : (
                <div className="mb-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-sm text-slate-500">
                  No services on {activeSlot.label} yet. Connect this slot&apos;s API in Cloudflare
                  to populate products.
                </div>
              )}

              {showFund && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
                className="tap-fast flex w-full items-center justify-center space-x-2 rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="mt-8">
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

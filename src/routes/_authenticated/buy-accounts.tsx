import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  Search,
  ShoppingCart,
  Wallet,
  Loader2,
  Zap,
  Package,
  ChevronDown,
  X,
  AlertCircle,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { naira } from "@/lib/pricing";
import { fetchAccount } from "@/lib/account";
import {
  listAccountProducts,
  listAccountCategories,
  purchaseAccount,
  type AccountProduct,
} from "@/lib/functions/accounts.functions";

export const Route = createFileRoute("/_authenticated/buy-accounts")({
  head: () => ({
    meta: [
      { title: "Buy Logs & Aged Accounts — Vernex" },
      {
        name: "description",
        content: "Verified aged social media accounts and SMS logs — ready to use.",
      },
      { property: "og:title", content: "Vernex — Buy Aged Accounts" },
      {
        property: "og:description",
        content: "Instagram, Facebook, Gmail and more. Verified & delivered instantly.",
      },
    ],
  }),
  component: BuyAccounts,
});

const tagTint: Record<string, string> = {
  IG: "bg-violet-100 text-violet-700",
  FB: "bg-indigo-100 text-indigo-700",
  GM: "bg-amber-100 text-amber-700",
  TT: "bg-teal-100 text-teal-700",
  X: "bg-slate-200 text-slate-800",
  LI: "bg-blue-100 text-blue-700",
  TG: "bg-sky-100 text-sky-700",
  DC: "bg-indigo-100 text-indigo-600",
  SC: "bg-yellow-100 text-yellow-700",
  YT: "bg-red-100 text-red-700",
  RD: "bg-orange-100 text-orange-700",
  TH: "bg-zinc-200 text-zinc-800",
  SP: "bg-indigo-500/15 text-indigo-300",
  NF: "bg-rose-100 text-rose-700",
  AI: "bg-indigo-500/15 text-indigo-800",
  PX: "bg-cyan-100 text-cyan-700",
  WA: "bg-green-100 text-green-700",
  AM: "bg-orange-100 text-orange-600",
  AP: "bg-pink-100 text-pink-700",
  BP: "bg-lime-100 text-lime-700",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/60 ${className}`} />;
}

function BuyAccounts() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listAccountProducts);
  const fetchCategories = useServerFn(listAccountCategories);
  const buy = useServerFn(purchaseAccount);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<AccountProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [showFund, setShowFund] = useState(false);

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ["account-products"],
    queryFn: () => fetchProducts({ data: undefined }),
  });

  const { data: catData } = useQuery({
    queryKey: ["account-categories"],
    queryFn: () => fetchCategories({ data: undefined }),
  });

  const { data: account } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
  });

  const balance = account?.wallet?.balance ?? 0;
  const categories = catData?.categories ?? ["All"];
  const subcategories = catData?.subcategories ?? {};

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = products;
    if (category !== "All") {
      list = list.filter((p) => p.category === category || p.platform === category);
    }
    if (subcategory) {
      list = list.filter((p) => p.subcategory === subcategory);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.platform.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.features.some((f) => f.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [products, category, subcategory, query]);

  useEffect(() => {
    setSubcategory(null);
    setOpenCat(null);
  }, [category]);

  const total = selected ? selected.price_ngn * qty : 0;

  async function handleBuy() {
    if (!selected) return;
    if (selected.stock < qty) {
      toast.error("Not enough stock");
      return;
    }
    if (balance < total) {
      setShowFund(true);
      return;
    }
    setBusy(true);
    try {
      const result = await buy({
        data: {
          productId: selected.id,
          quantity: qty,
          amount: total,
        },
      });
      toast.success(
        result.status === "delivered"
          ? "Account delivered — open Log History for credentials"
          : "Order placed — credentials coming soon",
      );
      setSelected(null);
      setQty(1);
      queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      queryClient.invalidateQueries({ queryKey: ["account-orders", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md">
        <Link
          to="/dashboard"
          aria-label="Back"
          className="inline-flex shrink-0 items-center text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-bold">Buy Logs</h1>
        <span className="shrink-0 rounded-full bg-indigo-500/12 px-2.5 py-1 text-xs font-black tabular-nums text-indigo-400">
          {naira(Math.round(balance))}
        </span>
        <Link
          to="/log-history"
          className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-primary"
        >
          Orders
        </Link>
      </header>

      <div className="px-5 pt-4 pb-4 space-y-4">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-[20px] brand-gradient p-4 text-white shadow-[0_14px_32px_-16px_rgba(79,70,229,0.35)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 right-8 h-20 w-20 rounded-full bg-white/10" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
            Marketplace
          </p>
          <h2 className="mt-1 text-lg font-black leading-tight">Buy Accounts</h2>
          <p className="mt-1 text-[13px] text-white/90">
            Aged &amp; verified social media accounts — delivered instantly.
          </p>
        </div>

        {/* Wallet card */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card-elev">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/12 text-indigo-400">
            <Wallet className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available balance
            </p>
            <p className="text-xl font-black tabular-nums text-indigo-400">
              {naira(Math.round(balance))}
            </p>
          </div>
          <Link
            to="/fund"
            className="rounded-xl brand-gradient px-3 py-2 text-[12px] font-bold text-white"
          >
            Fund
          </Link>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="relative -mx-5 px-5">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => {
              const active = category === c;
              const subs = c !== "All" ? subcategories[c] ?? [] : [];
              return (
                <div key={c} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (c === "All") {
                        setCategory("All");
                        setOpenCat(null);
                        setSubcategory(null);
                        return;
                      }
                      if (category === c && openCat === c) {
                        setOpenCat(null);
                        return;
                      }
                      setCategory(c);
                      setOpenCat(subs.length ? c : null);
                    }}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
                      active
                        ? "border-transparent brand-gradient text-white shadow-[0_8px_18px_-10px_rgba(79,70,229,0.75)]"
                        : "border-border bg-surface text-muted-foreground"
                    }`}
                  >
                    {c}
                    {subs.length > 0 && (
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition ${openCat === c ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          {openCat && (subcategories[openCat] ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 rounded-2xl border border-border bg-surface p-2 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setSubcategory(null);
                  setOpenCat(null);
                }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  !subcategory ? "bg-indigo-500/15 text-indigo-300" : "text-muted-foreground"
                }`}
              >
                All {openCat}
              </button>
              {(subcategories[openCat] ?? []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSubcategory(s);
                    setOpenCat(null);
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    subcategory === s
                      ? "bg-indigo-500/15 text-indigo-300"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {(subcategory || category !== "All") && (
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-muted-foreground">Showing:</span>
            <span className="rounded-full bg-indigo-500/12 px-2.5 py-0.5 font-bold text-indigo-300">
              {category}
              {subcategory ? ` · ${subcategory}` : ""}
            </span>
            <button
              type="button"
              onClick={() => {
                setCategory("All");
                setSubcategory(null);
              }}
              className="font-bold text-primary"
            >
              Clear
            </button>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
            <AlertCircle className="mx-auto h-5 w-5 text-destructive" />
            <p className="mt-2 text-sm font-semibold">Couldn&apos;t load accounts</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 rounded-lg brand-gradient px-3 py-1.5 text-[11px] font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            No accounts match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelected(p);
                  setQty(1);
                }}
                className="rounded-2xl border border-border bg-surface p-3.5 text-left shadow-card-elev transition active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-black ${
                      tagTint[p.tag] ?? "bg-indigo-500/15 text-indigo-300"
                    }`}
                  >
                    {p.tag}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {p.stock} in stock
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-bold leading-tight">{p.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {p.age_label}
                  {p.country ? ` · ${p.country}` : ""}
                </p>
                {p.instant && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-500/12 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                    <Zap className="h-3 w-3" /> Instant
                  </span>
                )}
                <p className="mt-2 text-lg font-black tabular-nums text-foreground">
                  {naira(p.price_ngn)}
                </p>
                <span className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg brand-gradient py-2 text-[11px] font-bold text-white">
                  <ShoppingCart className="h-3 w-3" /> Buy Now
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 sm:place-items-center">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-surface shadow-xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-base font-black">Product details</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="grid h-8 w-8 place-items-center rounded-full border border-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-12 w-12 place-items-center rounded-2xl text-sm font-black ${
                    tagTint[selected.tag] ?? "bg-indigo-500/15 text-indigo-300"
                  }`}
                >
                  {selected.tag}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black leading-tight">{selected.name}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {selected.platform} · {selected.subcategory}
                    {selected.country ? ` · ${selected.country}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{selected.description}</p>
              {selected.features.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {selected.features.map((f) => (
                    <li
                      key={f}
                      className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-semibold"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Age
                  </p>
                  <p className="font-bold">{selected.age_label}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Stock
                  </p>
                  <p className="font-bold">{selected.stock}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.min(20, selected.stock)}
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.max(1, Math.min(selected.stock, Number(e.target.value) || 1)))
                  }
                  className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-right text-sm font-bold tabular-nums outline-none focus:border-primary"
                />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total
                  </p>
                  <p className="text-xl font-black tabular-nums text-indigo-400">
                    {naira(total)}
                  </p>
                </div>
                {selected.instant ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/12 px-2.5 py-1 text-[11px] font-bold text-indigo-300">
                    <Zap className="h-3.5 w-3.5" /> Instant delivery
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    <Package className="h-3.5 w-3.5" /> Manual delivery
                  </span>
                )}
              </div>
            </div>
            <div className="border-t border-border p-4">
              <button
                type="button"
                onClick={handleBuy}
                disabled={busy || selected.stock < 1}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 text-sm font-black text-white shadow-[0_12px_28px_-14px_rgba(79,70,229,0.45)] disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Buy Now · {naira(total)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient funds */}
      {showFund && (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-foreground/40 p-4 sm:place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Wallet className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-lg font-black">Insufficient balance</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This order costs {naira(total)} but your wallet has {naira(Math.round(balance))}.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
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

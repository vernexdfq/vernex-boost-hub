import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Wallet,
  Loader2,
  Zap,
  Package,
  Menu,
  Check,
  FolderOpen,
  X,
  AlertCircle,
  ChevronRight,
  LayoutGrid,
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
      { title: "Buy Logs & Aged Accounts — Verxor" },
      {
        name: "description",
        content: "Verified aged social media accounts and logs — instant delivery, live stock.",
      },
      { property: "og:title", content: "Verxor — Buy Aged Accounts" },
      {
        property: "og:description",
        content: "Instagram, Facebook, Gmail and more. Verified & delivered instantly.",
      },
    ],
  }),
  component: BuyAccounts,
});

const tagTint: Record<string, string> = {
  IG: "bg-violet-500/15 text-violet-500",
  FB: "bg-blue-500/15 text-blue-500",
  GM: "bg-amber-500/15 text-amber-500",
  OL: "bg-amber-500/15 text-amber-500",
  TT: "bg-teal-500/15 text-teal-500",
  X: "bg-muted text-foreground",
  LI: "bg-blue-500/15 text-blue-500",
  TG: "bg-sky-500/15 text-sky-500",
  DC: "bg-indigo-500/15 text-indigo-400",
  SC: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  YT: "bg-red-500/15 text-red-500",
  RD: "bg-orange-500/15 text-orange-500",
  TH: "bg-muted text-foreground",
  SP: "bg-primary/15 text-primary",
  NF: "bg-rose-500/15 text-rose-500",
  AI: "bg-primary/15 text-primary",
  PX: "bg-cyan-500/15 text-cyan-500",
  WA: "bg-green-500/15 text-green-500",
  AM: "bg-orange-500/15 text-orange-500",
  AP: "bg-pink-500/15 text-pink-500",
  BP: "bg-lime-500/15 text-lime-500",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={"skeleton " + className} />;
}

function fmtCount(n?: number) {
  if (!n || n <= 0) return null;
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
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
  const [drawer, setDrawer] = useState(false);
  const [subSheet, setSubSheet] = useState(false);
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

  const countsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    let all = 0;
    for (const p of products ?? []) {
      all++;
      map[p.category] = (map[p.category] ?? 0) + 1;
    }
    map["All"] = all;
    return map;
  }, [products]);

  // Live item counts per sub-category (for the trigger bar and bottom sheet)
  const subCounts = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const prod of products ?? []) {
      const m = map[prod.category] ?? {};
      m[prod.subcategory] = (m[prod.subcategory] ?? 0) + 1;
      map[prod.category] = m;
    }
    return map;
  }, [products]);

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
  }, [category]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

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

  function selectCategory(c: string, sub: string | null) {
    setCategory(c);
    setSubcategory(sub);
    setDrawer(false);
    setSubSheet(false);
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Browse all services"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold text-foreground">
          Buy Logs
        </h1>
        <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-black tabular-nums text-primary">
          {naira(Math.round(balance))}
        </span>
        <Link
          to="/log-history"
          className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-primary"
        >
          Orders
        </Link>
      </header>

      <div className="space-y-4 px-5 pb-4 pt-4">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-[20px] brand-gradient p-4 text-white shadow-[0_14px_32px_-16px_rgba(37,99,235,0.35)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 right-8 h-20 w-20 rounded-full bg-white/10" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
            Marketplace
          </p>
          <h2 className="mt-1 text-lg font-black leading-tight">Buy Accounts</h2>
          <p className="mt-1 text-[13px] text-white/90">
            Live stock from verified suppliers — delivered instantly.
          </p>
        </div>

        {/* Wallet card */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card-elev">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Wallet className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available balance
            </p>
            <p className="text-xl font-black tabular-nums text-primary">
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
            placeholder="Search platform, country, or account type..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Sliding category tabs */}
        <div className="relative -mx-5 px-5">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => {
              const active = category === c && !subcategory;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => selectCategory(c, null)}
                  className={"inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-bold transition " +
                    (active
                      ? "border-transparent brand-gradient text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.55)]"
                      : "border-border bg-surface text-muted-foreground")}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-category trigger bar (platforms with 2+ sub-categories) */}
        {category !== "All" && (subcategories[category] ?? []).length >= 2 && (
          <button
            type="button"
            onClick={() => setSubSheet(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left shadow-card-elev transition active:scale-[0.99]"
            aria-label="Filter by sub-category"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              {subcategory ? <Check className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              {subcategory ? (
                <>
                  <p className="truncate text-[13.5px] font-bold text-foreground">
                    {category} · {subcategory}
                    <span className="ml-1 font-black text-primary">
                      ({subCounts[category]?.[subcategory] ?? 0})
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Showing this type only</p>
                </>
              ) : (
                <>
                  <p className="truncate text-[13.5px] font-bold text-foreground">
                    All {category} Accounts
                    <span className="ml-1 font-black text-primary">({countsByCategory[category] ?? 0})</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Tap to filter by type</p>
                </>
              )}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-bold text-primary">
              {subcategory ? "Change" : "Filter"}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </button>
        )}

        {/* Active filter chips */}
        {(subcategory || category !== "All") && (
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-muted-foreground">Showing:</span>
            <span className="rounded-full bg-primary/12 px-2.5 py-0.5 font-bold text-primary">
              {category}
              {subcategory ? " · " + subcategory : ""}
            </span>
            <span className="text-muted-foreground">
              {filtered.length} of {(products ?? []).length}
            </span>
            <button
              type="button"
              onClick={() => selectCategory("All", null)}
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
            <p className="mt-2 text-sm font-semibold text-foreground">Couldn't load accounts</p>
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
            {filtered.map((p) => {
              const soldLabel = fmtCount(p.sold);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelected(p);
                    setQty(1);
                  }}
                  className="flex flex-col rounded-2xl border border-border bg-surface p-3.5 text-left shadow-card-elev transition active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={"grid h-10 w-10 place-items-center rounded-xl text-xs font-black " +
                        (tagTint[p.tag] ?? "bg-primary/15 text-primary")}
                    >
                      {p.tag}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {p.stock} in stock
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-bold leading-tight text-foreground">
                    {p.name}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {p.subcategory}
                    {p.country ? " · " + p.country : ""}
                    {soldLabel ? " · " + soldLabel + " sold" : ""}
                  </p>
                  {p.instant && (
                    <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary">
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
              );
            })}
          </div>
        )}
      </div>

      {/* Services sidebar drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <p className="text-[14px] font-black text-foreground">All services</p>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {countsByCategory["All"] ?? 0} live accounts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2.5 py-3">
              <button
                type="button"
                onClick={() => selectCategory("All", null)}
                className={"mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition " +
                  (category === "All"
                    ? "bg-primary/12 text-primary"
                    : "text-foreground hover:bg-muted/50")}
              >
                <LayoutGrid className="h-4 w-4" />
                All
                <span className="ml-auto rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary">
                  {countsByCategory["All"] ?? 0}
                </span>
              </button>

              {categories.filter((c) => c !== "All").map((c) => (
                <div key={c} className="mb-1">
                  <button
                    type="button"
                    onClick={() => selectCategory(c, null)}
                    className={"flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition " +
                      (category === c
                        ? "bg-primary/12 text-primary"
                        : "text-foreground hover:bg-muted/50")}
                  >
                    <span className="truncate">{c}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="ml-auto shrink-0 text-[10px] font-bold tabular-nums text-muted-foreground">
                      {countsByCategory[c] ?? 0}
                    </span>
                  </button>
                  {(subcategories[c] ?? []).length > 0 && (
                    <div className="mb-1 mt-0.5 space-y-0.5 ml-3 border-l border-border pl-2">
                      {(subcategories[c] ?? []).slice(0, 12).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => selectCategory(c, s)}
                          className={"block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold transition " +
                            (subcategory === s && category === c
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:bg-muted/50")}
                        >
                          {s}
                        </button>
                      ))}
                      {(subcategories[c] ?? []).length > 12 && (
                        <p className="px-2.5 py-1 text-[11px] text-muted-foreground">
                          + {(subcategories[c] ?? []).length - 12} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Sub-category bottom sheet */}
      {subSheet && category !== "All" && (
        <div className="fixed inset-0 z-[65] flex items-end bg-foreground/40" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close categories"
            onClick={() => setSubSheet(false)}
            className="absolute inset-0"
          />
          <div className="relative flex max-h-[80vh] w-full flex-col rounded-t-3xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <div>
                <h3 className="text-[15px] font-black text-foreground">
                  {category} Categories
                  <span className="ml-1 text-primary">({(subcategories[category] ?? []).length})</span>
                </h3>
                <p className="text-[11px] text-muted-foreground">Pick a type to narrow the list</p>
              </div>
              <button
                type="button"
                onClick={() => setSubSheet(false)}
                aria-label="Close categories"
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2.5">
              <button
                type="button"
                onClick={() => selectCategory(category, null)}
                className={"mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition " +
                  (!subcategory ? "bg-primary/12" : "hover:bg-muted/50")}
              >
                <span
                  className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " +
                    (!subcategory ? "bg-primary/15 text-primary" : "bg-primary/8 text-primary")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={"block text-[13.5px] font-bold " + (!subcategory ? "text-primary" : "text-foreground")}>
                    All {category}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{countsByCategory[category] ?? 0} accounts</span>
                </span>
                {!subcategory && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>

              {(subcategories[category] ?? []).map((s) => {
                const active = subcategory === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => selectCategory(category, s)}
                    className={"mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition " +
                      (active ? "bg-primary/12" : "hover:bg-muted/50")}
                  >
                    <span
                      className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " +
                        (active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}
                    >
                      <Package className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={"block truncate text-[13.5px] font-bold " + (active ? "text-primary" : "text-foreground")}>
                        {s}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {subCounts[category]?.[s] ?? 0} accounts
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Product detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 sm:place-items-center">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-surface shadow-xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-base font-black text-foreground">Product details</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <div className="flex items-start gap-3">
                <span
                  className={"grid h-12 w-12 place-items-center rounded-2xl text-sm font-black " +
                    (tagTint[selected.tag] ?? "bg-primary/15 text-primary")}
                >
                  {selected.tag}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black leading-tight text-foreground">{selected.name}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {selected.platform} · {selected.subcategory}
                    {selected.country ? " · " + selected.country : ""}
                  </p>
                </div>
              </div>
              {selected.description && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {selected.description}
                </p>
              )}
              {selected.features.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {selected.features.map((f) => (
                    <li
                      key={f}
                      className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-semibold text-foreground"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              {selected.provider === "accszone" && (
                <p className="mt-3 rounded-xl border border-border bg-background px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  Credentials are delivered exactly as the supplier provides them
                  (e.g. login:password or login:password:email:email_pass). Open Log
                  History right after purchase to copy them.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Stock
                  </p>
                  <p className="font-bold text-foreground">{selected.stock}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sold
                  </p>
                  <p className="font-bold text-foreground">{selected.sold ?? "—"}</p>
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
                  className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-right text-sm font-bold tabular-nums text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total
                  </p>
                  <p className="text-xl font-black tabular-nums text-primary">{naira(total)}</p>
                </div>
                {selected.instant ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-bold text-primary">
                    <Zap className="h-3.5 w-3.5" /> Instant delivery
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 text-sm font-black text-white shadow-[0_12px_28px_-14px_rgba(37,99,235,0.45)] disabled:opacity-50"
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
            <h3 className="mt-3 text-lg font-black text-foreground">Insufficient balance</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This order costs {naira(total)} but your wallet has {naira(Math.round(balance))}.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowFund(false)}
                className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-bold text-foreground"
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
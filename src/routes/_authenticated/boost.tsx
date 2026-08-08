import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Rocket,
  Loader2,
  ChevronLeft,
  ChevronDown,
  Bell,
  Search,
  Wallet,
  AlertCircle,
  ExternalLink,
  Clock,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { naira } from "@/lib/pricing";
import { fetchAccount } from "@/lib/account";
import {
  createBoostOrder,
  listBoostOrders,
  listBoostProducts,
  type BoostProduct,
} from "@/lib/functions/boost.functions";

export const Route = createFileRoute("/_authenticated/boost")({
  head: () => ({
    meta: [
      { title: "Boost Account — Vernex" },
      {
        name: "description",
        content:
          "Boost your social accounts with followers, likes, and views across Instagram, TikTok, YouTube, and more.",
      },
      { property: "og:title", content: "Vernex — Social Boost" },
      { property: "og:description", content: "Instant SMM delivery for every major platform." },
    ],
  }),
  component: BoostPage,
});

const POPULAR_PLATFORMS = [
  "Facebook",
  "Instagram",
  "Telegram",
  "TikTok",
  "Twitter",
  "X",
  "WhatsApp",
  "YouTube",
  "Spotify",
  "Audiomack",
  "Boomplay",
  "Apple Music",
  "SoundCloud",
  "Threads",
  "Snapchat",
  "LinkedIn",
  "Discord",
  "Twitch",
  "Kick",
  "Pinterest",
  "Reddit",
] as const;

const statusBadge: Record<string, { c: string; label: string }> = {
  pending: { c: "border-amber-400/30 bg-amber-400/10 text-amber-600", label: "Pending" },
  processing: { c: "border-sky-400/30 bg-sky-400/10 text-sky-600", label: "Processing" },
  in_progress: { c: "border-sky-400/30 bg-sky-400/10 text-sky-600", label: "Processing" },
  completed: { c: "border-emerald-400/30 bg-emerald-400/10 text-indigo-400", label: "Completed" },
  partial: { c: "border-violet-400/30 bg-violet-400/10 text-violet-600", label: "Partial" },
  cancelled: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Cancelled" },
  canceled: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Cancelled" },
  failed: { c: "border-destructive/30 bg-destructive/10 text-destructive", label: "Failed" },
};

function categoryFromService(serviceType: string): string {
  const s = serviceType.toLowerCase();
  if (/(follow|sub)/.test(s)) return "Followers & Subs";
  if (/(like|react|heart)/.test(s)) return "Likes & Reactions";
  if (/(view|play|stream)/.test(s)) return "Views & Plays";
  if (/(comment)/.test(s)) return "Comments";
  if (/(share|retweet|repost)/.test(s)) return "Shares & Reposts";
  if (/(member|group)/.test(s)) return "Members";
  if (/(save|bookmark)/.test(s)) return "Saves";
  if (/(story)/.test(s)) return "Story";
  if (/(live)/.test(s)) return "Live";
  return "Other";
}

function urlPlaceholder(platform: string, serviceType: string): string {
  const p = platform.toLowerCase();
  const s = serviceType.toLowerCase();
  if (p.includes("instagram")) {
    if (/(post|like|comment|view|share|save)/.test(s)) return "https://www.instagram.com/p/…";
    return "https://www.instagram.com/yourhandle";
  }
  if (p.includes("tiktok")) {
    if (/(video|like|view|comment|share)/.test(s)) return "https://www.tiktok.com/@user/video/…";
    return "https://www.tiktok.com/@yourhandle";
  }
  if (p.includes("youtube") || p.includes("you tube")) {
    if (/(view|like|comment)/.test(s)) return "https://www.youtube.com/watch?v=…";
    return "https://www.youtube.com/@yourchannel";
  }
  if (p.includes("twitter") || p === "x") {
    if (/(like|retweet|view|comment)/.test(s)) return "https://x.com/user/status/…";
    return "https://x.com/yourhandle";
  }
  if (p.includes("facebook")) {
    if (/(post|like|share|comment|view)/.test(s)) return "https://www.facebook.com/…/posts/…";
    return "https://www.facebook.com/yourpage";
  }
  if (p.includes("telegram")) return "https://t.me/yourchannel";
  if (p.includes("spotify")) return "https://open.spotify.com/track/…";
  if (p.includes("audiomack")) return "https://audiomack.com/artist/song";
  if (p.includes("snapchat")) return "https://www.snapchat.com/add/yourhandle";
  if (p.includes("linkedin")) return "https://www.linkedin.com/in/yourprofile";
  if (p.includes("threads")) return "https://www.threads.net/@yourhandle";
  if (p.includes("reddit")) return "https://www.reddit.com/r/…/comments/…";
  if (p.includes("twitch")) return "https://www.twitch.tv/yourchannel";
  if (p.includes("discord")) return "https://discord.gg/invite";
  return "https://…";
}

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

function BoostPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listBoostProducts);
  const fetchOrders = useServerFn(listBoostOrders);
  const submitOrder = useServerFn(createBoostOrder);

  const [platform, setPlatform] = useState("");
  const [category, setCategory] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [qty, setQty] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [showFund, setShowFund] = useState(false);

  const [platformOpen, setPlatformOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [platformQuery, setPlatformQuery] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const platformRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading: productsLoading, isError: productsError, refetch } = useQuery({
    queryKey: ["boost-products"],
    queryFn: () => fetchProducts({ data: undefined }),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["boost-orders", user.id],
    queryFn: () => fetchOrders({ data: undefined }),
  });

  const { data: account } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
  });

  const balance = account?.wallet?.balance ?? 0;

  const platforms = useMemo(() => {
    if (!products?.length) return [...POPULAR_PLATFORMS];
    const fromDb = Array.from(new Set(products.map((p) => p.platform)));
    const merged = [
      ...fromDb,
      ...POPULAR_PLATFORMS.filter(
        (p) => !fromDb.some((d) => d.toLowerCase() === p.toLowerCase()),
      ),
    ];
    return merged;
  }, [products]);

  const filteredPlatforms = useMemo(() => {
    const q = platformQuery.trim().toLowerCase();
    if (!q) return platforms;
    return platforms.filter((p) => p.toLowerCase().includes(q));
  }, [platforms, platformQuery]);

  useEffect(() => {
    if (platforms.length && !platform) setPlatform(platforms[0]);
  }, [platforms, platform]);

  const platformProducts = useMemo(() => {
    if (!products || !platform) return [];
    return products.filter((p) => p.platform.toLowerCase() === platform.toLowerCase());
  }, [products, platform]);

  const categories = useMemo(() => {
    const set = new Set(platformProducts.map((p) => categoryFromService(p.service_type)));
    return Array.from(set);
  }, [platformProducts]);

  useEffect(() => {
    if (categories.length && !categories.includes(category)) {
      setCategory(categories[0] ?? "");
    }
  }, [categories, category]);

  const categoryProducts = useMemo(() => {
    if (!category) return platformProducts;
    return platformProducts.filter((p) => categoryFromService(p.service_type) === category);
  }, [platformProducts, category]);

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return categoryProducts;
    return categoryProducts.filter(
      (p) =>
        p.service_type.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q),
    );
  }, [categoryProducts, serviceQuery]);

  useEffect(() => {
    if (categoryProducts.length === 0) {
      setProductId(null);
      return;
    }
    if (!productId || !categoryProducts.some((p) => p.id === productId)) {
      setProductId(categoryProducts[0].id);
      setQty(categoryProducts[0].quantity);
    }
  }, [categoryProducts, productId]);

  const selected = useMemo(
    () => products?.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const minQty = selected ? Math.max(1, selected.quantity) : 1;
  const maxQty = selected ? Math.max(minQty * 100, 100_000) : 100_000;
  const ratePerUnit = selected ? selected.price_ngn / Math.max(1, selected.quantity) : 0;
  const ratePer1000 = ratePerUnit * 1000;
  const total = selected ? Math.ceil(ratePerUnit * qty) : 0;
  const canAfford = balance >= total;

  useEffect(() => {
    if (!platformOpen && !serviceOpen) return;
    function onClick(e: MouseEvent) {
      if (platformRef.current && !platformRef.current.contains(e.target as Node)) {
        setPlatformOpen(false);
      }
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [platformOpen, serviceOpen]);

  async function handleOrder() {
    if (!selected) return;
    if (!url.trim()) {
      toast.error("Enter your profile / post / video URL");
      return;
    }
    try {
      // Basic URL check
      // eslint-disable-next-line no-new
      new URL(url.trim());
    } catch {
      toast.error("Enter a valid URL starting with https://");
      return;
    }
    if (qty < minQty) {
      toast.error(`Minimum quantity is ${minQty.toLocaleString("en-NG")}`);
      return;
    }
    if (qty > maxQty) {
      toast.error(`Maximum quantity is ${maxQty.toLocaleString("en-NG")}`);
      return;
    }
    if (!canAfford) {
      setShowFund(true);
      return;
    }

    setBusy(true);
    try {
      await submitOrder({
        data: {
          productId: selected.id,
          targetUrl: url.trim(),
          quantity: qty,
          amount: total,
        },
      });
      toast.success("Boost order placed — tracking below");
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["boost-orders", user.id] });
      queryClient.invalidateQueries({ queryKey: ["account", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md">
        <Link
          to="/dashboard"
          aria-label="Back"
          className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-[15px] font-bold tracking-tight">Boost Account</h1>
          <p className="truncate text-[11px] text-muted-foreground">SMM delivery in minutes</p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-500/12 px-2.5 py-1 text-xs font-black tabular-nums text-indigo-400">
          {naira(Math.round(balance))}
        </span>
        <Link
          to="/alerts"
          aria-label="Notifications"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface"
        >
          <Bell className="h-4 w-4 text-foreground/80" />
        </Link>
      </header>

      <div className="space-y-4 px-5 pt-5 pb-4">
        {/* Platform */}
        <section>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Platform
          </label>
          <div ref={platformRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setPlatformOpen((o) => !o);
                setServiceOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 text-left transition hover:border-primary/30"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                {platform || "Select platform"}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground transition ${platformOpen ? "rotate-180" : ""}`}
              />
            </button>
            {platformOpen && (
              <div className="absolute z-30 mt-2 max-h-72 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
                <div className="border-b border-border p-2">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      autoFocus
                      value={platformQuery}
                      onChange={(e) => setPlatformQuery(e.target.value)}
                      placeholder="Search platforms…"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <ul className="max-h-52 overflow-y-auto py-1">
                  {filteredPlatforms.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No platforms found
                    </li>
                  ) : (
                    filteredPlatforms.map((p) => (
                      <li key={p}>
                        <button
                          type="button"
                          onClick={() => {
                            setPlatform(p);
                            setPlatformOpen(false);
                            setPlatformQuery("");
                            setCategory("");
                            setProductId(null);
                          }}
                          className={`flex w-full px-4 py-2.5 text-left text-sm transition ${
                            platform === p
                              ? "bg-indigo-500/10 font-bold text-indigo-300"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          {p}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Category chips */}
        {categories.length > 0 && (
          <section>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCategory(c);
                    setProductId(null);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    category === c
                      ? "border-transparent brand-gradient text-white shadow-[0_8px_18px_-10px_rgba(16,185,129,0.8)]"
                      : "border-border bg-surface text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Service */}
        <section>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Service
          </label>
          {productsLoading ? (
            <Skeleton className="h-12" />
          ) : productsError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-center">
              <p className="text-sm font-semibold">Couldn&apos;t load services</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 rounded-lg brand-gradient px-3 py-1.5 text-[11px] font-bold text-white"
              >
                Retry
              </button>
            </div>
          ) : (
            <div ref={serviceRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setServiceOpen((o) => !o);
                  setPlatformOpen(false);
                }}
                disabled={!selected}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 text-left transition hover:border-primary/30 disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  {selected ? (
                    <>
                      <span className="block truncate text-[15px] font-bold">
                        {selected.service_type}
                      </span>
                      <span className="block text-[12px] text-muted-foreground">
                        {selected.quantity.toLocaleString("en-NG")} for{" "}
                        {naira(selected.price_ngn)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[15px] font-bold text-muted-foreground">
                      {platformProducts.length === 0
                        ? "No services for this platform yet"
                        : "Select a service"}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition ${serviceOpen ? "rotate-180" : ""}`}
                />
              </button>
              {serviceOpen && (
                <div className="absolute z-30 mt-2 max-h-80 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
                  <div className="border-b border-border p-2">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        autoFocus
                        value={serviceQuery}
                        onChange={(e) => setServiceQuery(e.target.value)}
                        placeholder="Search services…"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <ul className="max-h-60 overflow-y-auto py-1">
                    {filteredServices.length === 0 ? (
                      <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No matching services
                      </li>
                    ) : (
                      filteredServices.map((s: BoostProduct) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setProductId(s.id);
                              setQty(s.quantity);
                              setServiceOpen(false);
                              setServiceQuery("");
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                              productId === s.id
                                ? "bg-indigo-500/10 font-bold text-indigo-300"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <span className="min-w-0 truncate">{s.service_type}</span>
                            <span className="shrink-0 tabular-nums text-xs font-semibold text-muted-foreground">
                              {s.quantity.toLocaleString("en-NG")} · {naira(s.price_ngn)}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* URL */}
        <section>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Profile / Post / Video / Song URL
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={urlPlaceholder(platform, selected?.service_type ?? "")}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
          />
        </section>

        {/* Quantity */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Quantity
            </label>
            {selected && (
              <span className="text-[11px] font-medium text-muted-foreground">
                Min {minQty.toLocaleString("en-NG")} · Max {maxQty.toLocaleString("en-NG")}
              </span>
            )}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={minQty}
            max={maxQty}
            value={qty}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setQty(Math.max(0, Math.floor(n)));
            }}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-bold tabular-nums outline-none transition focus:border-primary"
          />
        </section>

        {/* Order summary */}
        <section className="rounded-[20px] border border-border/80 bg-surface p-4 shadow-card-elev">
          <h3 className="text-[15px] font-black tracking-tight">Order Summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="truncate text-right font-semibold">
                {selected ? `${selected.platform} · ${selected.service_type}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Quantity</dt>
              <dd className="font-semibold tabular-nums">{qty.toLocaleString("en-NG")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Rate / 1,000</dt>
              <dd className="font-semibold tabular-nums">
                {selected ? naira(Math.ceil(ratePer1000)) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-2">
              <dt className="font-bold">Total</dt>
              <dd className="text-lg font-black tabular-nums text-indigo-400">
                {naira(total)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Wallet</dt>
              <dd
                className={`font-semibold tabular-nums ${canAfford ? "text-foreground" : "text-destructive"}`}
              >
                {naira(Math.round(balance))}
              </dd>
            </div>
          </dl>

          {!canAfford && selected && total > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-destructive">Insufficient balance</p>
                <p className="text-[12px] text-muted-foreground">
                  You need {naira(Math.ceil(total - balance))} more to place this order.
                </p>
              </div>
              <Link
                to="/fund"
                className="shrink-0 rounded-lg brand-gradient px-2.5 py-1.5 text-[11px] font-bold text-white"
              >
                Fund
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={handleOrder}
            disabled={busy || !selected || qty < minQty}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 text-sm font-black text-white shadow-[0_12px_28px_-14px_rgba(16,185,129,0.9)] transition active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Order Boost
          </button>
        </section>

        {/* My Orders */}
        <section className="pt-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-black">My Boost Orders</h2>
            <Link
              to="/boost-orders"
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-[11px] font-bold text-primary"
            >
              View All
            </Link>
          </div>

          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              No boost orders yet — place your first order above.
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.slice(0, 8).map((o) => {
                const st = (o.status || "pending").toLowerCase();
                const b = statusBadge[st] ?? statusBadge.pending;
                const product = o.boost_products as {
                  platform?: string;
                  service_type?: string;
                } | null;
                const platformName = product?.platform ?? (o.metadata as { platform?: string })?.platform ?? "Boost";
                const serviceName =
                  product?.service_type ??
                  (o.metadata as { service_type?: string })?.service_type ??
                  "Service";
                return (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold">
                          {platformName} · {serviceName}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          Qty {Number(o.quantity).toLocaleString("en-NG")} ·{" "}
                          {naira(Number(o.amount_paid))} · {timeAgo(o.created_at)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${b.c}`}
                      >
                        {b.label}
                      </span>
                    </div>
                    {o.target_url && (
                      <a
                        href={o.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex items-center gap-1.5 truncate text-[12px] font-medium text-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{o.target_url}</span>
                      </a>
                    )}
                    {(st === "pending" || st === "processing" || st === "in_progress") && (
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Delivery in progress…
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Insufficient funds modal */}
      {showFund && selected && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 p-4 sm:place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Wallet className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-lg font-black">Insufficient balance</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This boost costs {naira(total)} but your wallet has {naira(Math.round(balance))}.
              Fund{" "}
              <span className="font-bold text-foreground">
                {naira(Math.ceil(total - balance))}
              </span>{" "}
              more to continue.
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

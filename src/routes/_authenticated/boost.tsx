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
  completed: { c: "border-indigo-400/30 bg-indigo-400/10 text-indigo-400", label: "Completed" },
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
    <div className="min-h-screen bg-[#f4f6f9] pb-12 text-slate-800 antialiased">
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center space-x-3">
          <Link to="/dashboard" className="text-slate-600 hover:text-slate-900" aria-label="Back">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Boost Account</h1>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-[#3b3cfb]">
          {naira(Math.round(balance))}
        </div>
      </header>

      <main className="mx-auto mt-4 max-w-xl space-y-4 px-4">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0c0d78] p-5 text-white shadow-lg">
          <div className="relative z-10">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#3b3cfb]">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold">Boost Your Account</h2>
            <p className="mt-1 text-sm text-slate-300">
              Get followers, likes, views & more instantly
            </p>
          </div>
        </div>

        {/* Wallet strip */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-sm font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>WALLET BALANCE</span>
          </div>
          <span className="font-bold text-slate-900">{naira(Math.round(balance))}</span>
        </div>

        {/* Tip */}
        <div className="flex items-start space-x-3 rounded-xl border border-blue-100 bg-blue-50 p-3.5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#3b3cfb]" />
          <p className="text-xs leading-relaxed text-blue-900">
            <strong className="font-semibold">Quick Tip:</strong> Select a platform, pick a
            category, choose a service, then enter your link and quantity.
          </p>
        </div>

        {/* Form card */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Platform */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Platform
            </label>
            <div ref={platformRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setPlatformOpen((o) => !o);
                  setServiceOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm text-slate-800 focus:border-[#3b3cfb]"
              >
                <span className="truncate font-medium">{platform || "Select platform"}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition ${platformOpen ? "rotate-180" : ""}`}
                />
              </button>
              {platformOpen && (
                <div className="absolute z-30 mt-2 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <Search className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        autoFocus
                        value={platformQuery}
                        onChange={(e) => setPlatformQuery(e.target.value)}
                        placeholder="Search platforms…"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {filteredPlatforms.length === 0 ? (
                      <li className="px-4 py-6 text-center text-sm text-slate-400">
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
                                ? "bg-[#3b3cfb]/10 font-semibold text-[#3b3cfb]"
                                : "text-slate-800 hover:bg-slate-50"
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
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategory(c);
                      setProductId(null);
                    }}
                    className={`rounded-xl p-3 text-center text-sm font-semibold transition ${
                      category === c
                        ? "bg-[#3b3cfb] text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Service */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Service
            </label>
            <div ref={serviceRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!platform) {
                    toast.message("Select a platform first");
                    return;
                  }
                  setServiceOpen((o) => !o);
                  setPlatformOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm text-slate-800"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {selected
                    ? `${selected.service_type} (${selected.quantity.toLocaleString("en-NG")} for ${naira(Math.round(ratePer1000))})`
                    : productsLoading
                      ? "Loading services…"
                      : "Select a service"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition ${serviceOpen ? "rotate-180" : ""}`}
                />
              </button>
              {serviceOpen && (
                <div className="absolute z-30 mt-2 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <Search className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        autoFocus
                        value={serviceQuery}
                        onChange={(e) => setServiceQuery(e.target.value)}
                        placeholder="Search services…"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {filteredServices.length === 0 ? (
                      <li className="px-4 py-6 text-center text-sm text-slate-400">
                        {productsLoading ? "Loading…" : "No services for this filter"}
                      </li>
                    ) : (
                      filteredServices.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setProductId(s.id);
                              setServiceOpen(false);
                              setServiceQuery("");
                              setQty(Number(s.quantity) || 1000);
                            }}
                            className={`flex w-full flex-col px-4 py-2.5 text-left text-sm transition ${
                              productId === s.id
                                ? "bg-[#3b3cfb]/10"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <span className="font-semibold text-slate-900">{s.service_type}</span>
                            <span className="text-xs text-slate-500">
                              {s.quantity.toLocaleString("en-NG")}–
                              {"100,000"} ·{" "}
                              {naira(Math.round((s.price_ngn / Math.max(1, s.quantity)) * 1000))}/1k
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Profile / Post / Video / Song URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={selected ? urlPlaceholder(selected.platform, selected.service_type) : "https://…"}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none focus:border-[#3b3cfb]"
            />
          </div>

          {/* Quantity */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Quantity
              </label>
              <span className="text-xs text-slate-400">
                Min {minQty.toLocaleString("en-NG")} - Max {maxQty.toLocaleString("en-NG")}
              </span>
            </div>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
              min={minQty}
              max={maxQty}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none focus:border-[#3b3cfb]"
            />
          </div>

          {/* Order summary */}
          <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Order Summary
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Service</span>
              <span className="max-w-[60%] truncate text-right font-medium text-slate-900">
                {selected
                  ? `${selected.platform} · ${selected.service_type}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Quantity</span>
              <span className="font-medium text-slate-900">
                {qty > 0 ? qty.toLocaleString("en-NG") : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Rate / 1,000</span>
              <span className="font-medium text-slate-900">
                {selected ? naira(Math.round(ratePer1000)) : "—"}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span className="text-[#3b3cfb]">
                {selected && qty > 0 ? naira(total) : "—"}
              </span>
            </div>
            {selected && !canAfford && qty > 0 && (
              <p className="pt-1 text-xs font-medium text-red-600">
                Insufficient balance. Need {naira(Math.ceil(total - balance))} more.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleOrder()}
            disabled={busy || !selected}
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[#3b3cfb] py-3.5 px-4 font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Rocket className="h-5 w-5" />
            )}
            <span>{busy ? "Placing order…" : "Order Boost"}</span>
          </button>
        </div>

        {/* My orders */}
        <section className="space-y-3 pb-4">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm font-bold text-slate-900">My Orders</h2>
            {ordersLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
          {!ordersLoading && (!orders || orders.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No boost orders yet
            </div>
          ) : (
            <ul className="space-y-2">
              {(orders ?? []).map((o: any) => {
                const st = String(o.status || "pending").toLowerCase();
                const badge = statusBadge[st] ?? statusBadge.pending;
                const platform = o.boost_products?.platform ?? o.platform ?? "Boost";
                const service = o.boost_products?.service_type ?? o.service_type ?? "";
                const paid = Number(o.amount_paid ?? o.amount ?? 0);
                return (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {platform} · {service}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Qty {Number(o.quantity).toLocaleString("en-NG")} ·{" "}
                          {naira(paid)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.c}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    {o.target_url && (
                      <a
                        href={o.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex items-center gap-1.5 truncate text-[12px] font-medium text-[#3b3cfb]"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{o.target_url}</span>
                      </a>
                    )}
                    {(st === "pending" || st === "processing" || st === "in_progress") && (
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <Clock className="h-3.5 w-3.5" /> Delivery in progress…
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {showFund && selected && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-4 sm:place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-50 text-red-600">
              <Wallet className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-lg font-black text-slate-900">Insufficient balance</h3>
            <p className="mt-1 text-sm text-slate-500">
              This boost costs {naira(total)} but your wallet has {naira(Math.round(balance))}.
              Fund{" "}
              <span className="font-bold text-slate-900">
                {naira(Math.ceil(total - balance))}
              </span>{" "}
              more to continue.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowFund(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-800"
              >
                Cancel
              </button>
              <Link
                to="/fund"
                className="flex-1 rounded-xl bg-[#3b3cfb] py-3 text-center text-sm font-black text-white"
              >
                Fund wallet
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

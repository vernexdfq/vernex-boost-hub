import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Rocket,
  Loader2,
  ChevronLeft,
  ChevronDown,
  Search,
  Wallet,
  Info,
  X,
  Folder,
  Star,
  Hash,
  CheckCircle2,
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
      {
        property: "og:description",
        content: "Instant SMM delivery for every major platform.",
      },
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
  pending: { c: "border-amber-400/30 bg-amber-400/10 text-amber-400", label: "Pending" },
  processing: { c: "border-sky-400/30 bg-sky-400/10 text-sky-400", label: "Processing" },
  in_progress: { c: "border-sky-400/30 bg-sky-400/10 text-sky-400", label: "Processing" },
  completed: { c: "border-[#16C784]/30 bg-[#16C784]/10 text-[#16C784]", label: "Completed" },
  partial: { c: "border-violet-400/30 bg-violet-400/10 text-violet-400", label: "Partial" },
  cancelled: { c: "border-red-400/30 bg-red-400/10 text-red-400", label: "Cancelled" },
  canceled: { c: "border-red-400/30 bg-red-400/10 text-red-400", label: "Cancelled" },
  failed: { c: "border-red-400/30 bg-red-400/10 text-red-400", label: "Failed" },
};

function categoryFromService(serviceType: string): string {
  const s = serviceType.toLowerCase();
  if (/(follow|sub)/.test(s)) return "Followers & Subscribers";
  if (/(like|react|love)/.test(s)) return "Likes & Reactions";
  if (/(view|play|watch)/.test(s)) return "Views & Plays";
  if (/(share|repost|retweet)/.test(s)) return "Shares & Reposts";
  if (/(comment)/.test(s)) return "Comments";
  if (/(live|stream)/.test(s)) return "Live Stream";
  if (/(member|join)/.test(s)) return "Members";
  return "Other Services";
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
  if (p.includes("youtube")) {
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
  return "https://…";
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
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [platformSearch, setPlatformSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const { data: account } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
    staleTime: 5_000,
    refetchInterval: 12_000,
  });
  const balance = Number(account?.wallet?.balance ?? 0);

  const {
    data: products,
    isLoading: productsLoading,
  } = useQuery({
    queryKey: ["boost-products"],
    queryFn: () => fetchProducts({ data: undefined as never }),
    staleTime: 60_000,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["boost-orders", user.id],
    queryFn: () => fetchOrders({ data: undefined as never }),
    refetchInterval: 20_000,
  });

  const platforms = useMemo(() => {
    const fromApi = new Set((products ?? []).map((p) => p.platform));
    const list = [
      ...POPULAR_PLATFORMS.filter((p) =>
        [...fromApi].some((a) => a.toLowerCase() === p.toLowerCase()),
      ),
      ...[...fromApi]
        .filter(
          (a) => !POPULAR_PLATFORMS.some((p) => p.toLowerCase() === a.toLowerCase()),
        )
        .sort(),
    ];
    return list.length ? list : [...POPULAR_PLATFORMS];
  }, [products]);

  useEffect(() => {
    if (!platform && platforms.length) setPlatform(platforms[0]);
  }, [platforms, platform]);

  const filteredPlatforms = useMemo(() => {
    const q = platformSearch.trim().toLowerCase();
    if (!q) return platforms;
    return platforms.filter((p) => p.toLowerCase().includes(q));
  }, [platforms, platformSearch]);

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

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const categoryProducts = useMemo(() => {
    if (!category) return platformProducts;
    return platformProducts.filter((p) => categoryFromService(p.service_type) === category);
  }, [platformProducts, category]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return categoryProducts;
    return categoryProducts.filter(
      (p) =>
        p.service_type.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q),
    );
  }, [categoryProducts, serviceSearch]);

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

  async function handleOrder(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selected) return;
    if (!url.trim()) {
      toast.error("Enter your profile / post / video URL");
      return;
    }
    try {
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
      void queryClient.invalidateQueries({ queryKey: ["boost-orders", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["account", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] px-4 pb-28 pt-6 font-sans text-slate-100">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-2">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-200"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-white">Boost Account</h1>
        </div>

        {/* Banner */}
        <div className="relative mb-5 overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-6 shadow-xl">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-[#16C784]/10 blur-2xl" />
          <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#16C784]/20 bg-[#16C784]/10 text-[#16C784] shadow-sm">
            <Rocket size={24} />
          </div>
          <h2 className="mb-1 text-xl font-bold tracking-tight text-white">
            Boost Your Account
          </h2>
          <p className="text-xs text-slate-400">
            Get followers, likes, views & more instantly
          </p>
        </div>

        {/* Wallet */}
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#16C784]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Wallet Balance
            </span>
          </div>
          <span className="text-base font-black text-[#16C784]">{naira(balance)}</span>
        </div>

        {/* Tip */}
        <div className="mb-6 flex items-start space-x-3 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 text-slate-300">
          <Info size={18} className="mt-0.5 shrink-0 text-[#16C784]" />
          <p className="text-xs leading-relaxed">
            <strong className="text-white">Quick Tip:</strong> Select a platform, pick a
            category, choose a service, then enter your link and quantity.
          </p>
        </div>

        <form onSubmit={(e) => void handleOrder(e)} className="space-y-5">
          {/* Platform */}
          <div>
            <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Platform
            </label>
            <button
              type="button"
              onClick={() => setPlatformOpen(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-left shadow-sm transition hover:bg-slate-900"
            >
              <span className="text-sm font-semibold text-white">
                {platform || (productsLoading ? "Loading…" : "Select platform")}
              </span>
              <ChevronDown size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Category
            </label>
            <button
              type="button"
              onClick={() => {
                if (!platform) {
                  toast.message("Select a platform first");
                  return;
                }
                setCategoryOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-left shadow-sm transition hover:bg-slate-900"
            >
              <div className="flex items-center space-x-3">
                <Folder size={18} className="text-[#16C784]" />
                <span className="text-sm font-semibold text-white">
                  {category || "Select category"}
                </span>
              </div>
              <ChevronDown size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Service */}
          <div>
            <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Service
            </label>
            <button
              type="button"
              onClick={() => {
                if (!category) {
                  toast.message("Select a category first");
                  return;
                }
                setServiceOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-left shadow-sm transition hover:bg-slate-900"
            >
              <div className="flex min-w-0 items-center space-x-3">
                <Star size={18} className="shrink-0 text-amber-400" />
                <span className="truncate text-sm font-semibold text-white">
                  {selected
                    ? selected.service_type
                    : productsLoading
                      ? "Loading…"
                      : "Select service"}
                </span>
              </div>
              <ChevronDown size={18} className="ml-2 shrink-0 text-slate-400" />
            </button>
          </div>

          {/* Link */}
          <div>
            <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Details
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                selected
                  ? urlPlaceholder(selected.platform, selected.service_type)
                  : "https://…"
              }
              required
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#16C784]"
            />
            <p className="mt-1.5 px-1 text-[11px] text-slate-500">
              Paste your post or profile link
            </p>
          </div>

          {/* Quantity */}
          <div>
            <input
              type="number"
              value={qty || ""}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
              placeholder="Enter quantity"
              min={minQty}
              max={maxQty}
              required
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#16C784]"
            />
            <p className="mt-1.5 px-1 text-[11px] text-slate-500">
              Min: {minQty.toLocaleString("en-NG")} · Max: {maxQty.toLocaleString("en-NG")}
            </p>
          </div>

          {/* Summary */}
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
            <div className="mb-2 flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Hash size={14} className="text-[#16C784]" />
              <span>Order Summary</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="text-slate-400">Rate per 1000</span>
              <span className="font-bold text-white">
                {selected ? naira(Math.round(ratePer1000)) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="text-slate-400">Min / Max</span>
              <span className="font-medium text-white">
                {minQty.toLocaleString("en-NG")} – {maxQty.toLocaleString("en-NG")}
              </span>
            </div>
            {qty > 0 && selected && (
              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span className="text-xs font-semibold text-[#16C784]">Estimated Total</span>
                <span className="text-base font-black text-[#16C784]">{naira(total)}</span>
              </div>
            )}
            {selected && !canAfford && qty > 0 && (
              <p className="text-xs font-medium text-red-400">
                Insufficient balance. Need {naira(Math.ceil(total - balance))} more.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={busy || !selected}
            className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-[#16C784] to-emerald-600 py-4 text-sm font-bold tracking-wide text-slate-950 shadow-lg shadow-[#16C784]/20 transition hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
            <span>{busy ? "Placing order…" : "Place Order"}</span>
          </button>
        </form>

        {/* Orders */}
        <section className="mt-8 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-white">My Orders</h2>
            {ordersLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
          {!ordersLoading && (!orders || orders.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
              No boost orders yet
            </div>
          ) : (
            <ul className="space-y-2">
              {(orders ?? []).map((o: any) => {
                const st = String(o.status || "pending").toLowerCase();
                const badge = statusBadge[st] ?? statusBadge.pending;
                const plat = o.boost_products?.platform ?? o.platform ?? "Boost";
                const service = o.boost_products?.service_type ?? "";
                const paid = Number(o.amount_paid ?? o.amount ?? 0);
                return (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {plat} · {service}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Qty {Number(o.quantity).toLocaleString("en-NG")} · {naira(paid)}
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
                        className="mt-2 flex items-center gap-1.5 truncate text-[12px] font-medium text-[#16C784]"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{o.target_url}</span>
                      </a>
                    )}
                    {(st === "pending" || st === "processing" || st === "in_progress") && (
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
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

      {/* Platform modal */}
      {platformOpen && (
        <SelectModal
          title="Select Platform"
          search={platformSearch}
          onSearch={setPlatformSearch}
          onClose={() => {
            setPlatformOpen(false);
            setPlatformSearch("");
          }}
        >
          {filteredPlatforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPlatform(p);
                setCategory("");
                setProductId(null);
                setPlatformOpen(false);
                setPlatformSearch("");
              }}
              className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition ${
                platform === p
                  ? "bg-[#16C784]/10 font-semibold text-[#16C784]"
                  : "text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span className="text-sm">{p}</span>
              {platform === p && <CheckCircle2 size={16} className="text-[#16C784]" />}
            </button>
          ))}
        </SelectModal>
      )}

      {/* Category modal */}
      {categoryOpen && (
        <SelectModal
          title="Select Category"
          search={categorySearch}
          onSearch={setCategorySearch}
          onClose={() => {
            setCategoryOpen(false);
            setCategorySearch("");
          }}
        >
          {filteredCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No categories</p>
          ) : (
            filteredCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setProductId(null);
                  setCategoryOpen(false);
                  setCategorySearch("");
                }}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition ${
                  category === c
                    ? "bg-[#16C784]/10 font-semibold text-[#16C784]"
                    : "text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Folder
                    size={16}
                    className={category === c ? "text-[#16C784]" : "text-slate-500"}
                  />
                  <span className="text-sm">{c}</span>
                </div>
                {category === c && <CheckCircle2 size={16} className="text-[#16C784]" />}
              </button>
            ))
          )}
        </SelectModal>
      )}

      {/* Service modal */}
      {serviceOpen && (
        <SelectModal
          title="Select Service"
          search={serviceSearch}
          onSearch={setServiceSearch}
          onClose={() => {
            setServiceOpen(false);
            setServiceSearch("");
          }}
        >
          {filteredServices.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {productsLoading ? "Loading…" : "No services"}
            </p>
          ) : (
            filteredServices.map((s) => {
              const rate = (s.price_ngn / Math.max(1, s.quantity)) * 1000;
              const active = productId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setProductId(s.id);
                    setQty(Number(s.quantity) || 1000);
                    setServiceOpen(false);
                    setServiceSearch("");
                  }}
                  className={`mb-2 flex w-full flex-col rounded-xl border p-3.5 text-left transition ${
                    active
                      ? "border-[#16C784]/40 bg-[#16C784]/10 text-white"
                      : "border-slate-800/80 bg-slate-950/40 text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <span className="mb-1 text-xs font-bold text-white">{s.service_type}</span>
                  <div className="mt-1 flex w-full items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-[#16C784]">
                      {naira(Math.round(rate))} per 1000
                    </span>
                    <span>Min: {s.quantity.toLocaleString("en-NG")}</span>
                  </div>
                </button>
              );
            })
          )}
        </SelectModal>
      )}

      {showFund && selected && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 sm:place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/10 text-red-400">
              <Wallet className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-lg font-black text-white">Insufficient balance</h3>
            <p className="mt-1 text-sm text-slate-400">
              This boost costs {naira(total)} but your wallet has {naira(Math.round(balance))}.
              Fund {naira(Math.ceil(total - balance))} more to continue.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowFund(false)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-white"
              >
                Cancel
              </button>
              <Link
                to="/fund"
                className="flex-1 rounded-xl bg-[#16C784] py-3 text-center text-sm font-black text-slate-950"
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

function SelectModal({
  title,
  search,
  onSearch,
  onClose,
  children,
}: {
  title: string;
  search: string;
  onSearch: (v: string) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <div className="py-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none focus:border-[#16C784]"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

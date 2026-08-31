import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Globe,
  Check,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Settings,
  Users,
  Bell,
  Smartphone,
  Sparkles,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { naira } from "@/lib/pricing";
import { fetchAccount } from "@/lib/account";
import {
  createAffiliateOrder,
  listAffiliateOrders,
} from "@/lib/functions/affiliate.functions";

export const Route = createFileRoute("/_authenticated/affiliate")({
  head: () => ({
    meta: [
      { title: "Get Affiliate Website — Verxor" },
      {
        name: "description",
        content:
          "Own your own Verxor reseller platform. Sell virtual numbers, SMM boosts, and social logs under your brand.",
      },
      { property: "og:title", content: "Own Your Own Verxor Platform" },
      {
        property: "og:description",
        content: "Full reseller website with admin panel and profit dashboard.",
      },
    ],
  }),
  component: Affiliate,
});

type Ext = ".com" | ".ng" | ".com.ng";

const PRICING: Record<Ext, number> = {
  ".com": 150_000,
  ".ng": 120_000,
  ".com.ng": 120_000,
};

const EXT_META: { ext: Ext; blurb: string }[] = [
  { ext: ".com", blurb: "Global reach" },
  { ext: ".ng", blurb: "Nigeria focused" },
  { ext: ".com.ng", blurb: "Best of both" },
];

const TAGS = [
  "Virtual Numbers",
  "SMM Boost",
  "Social Logs",
  "Wallet System",
  "Full Admin Panel",
  "Profit Dashboard",
];

const WHAT_YOU_GET = [
  {
    icon: Globe,
    iconClass: "bg-blue-500/10 text-blue-400",
    title: "Your Own Domain & Hosting",
    body: "Your website set up on your chosen domain, fully hosted and live.",
  },
  {
    icon: Smartphone,
    iconClass: "bg-[#16C784]/10 text-[#16C784]",
    title: "Virtual Number Sales",
    body: "Sell virtual numbers from all providers at your own markup price.",
  },
  {
    icon: TrendingUp,
    iconClass: "bg-indigo-500/10 text-indigo-400",
    title: "SMM Boost Services",
    body: "Offer Instagram, TikTok, YouTube boosting to your customers.",
  },
  {
    icon: ShieldCheck,
    iconClass: "bg-purple-500/10 text-purple-400",
    title: "Social Logs Store",
    body: "Sell social media account logs with your own pricing.",
  },
  {
    icon: Wallet,
    iconClass: "bg-amber-500/10 text-amber-400",
    title: "Wallet & Payment System",
    body: "Full wallet system with auto-credit integration.",
  },
  {
    icon: Settings,
    iconClass: "bg-cyan-500/10 text-cyan-400",
    title: "Admin Panel & Profit Dashboard",
    body: "See all your revenue, costs, and profit in one place.",
  },
  {
    icon: Users,
    iconClass: "bg-rose-500/10 text-rose-400",
    title: "User Management",
    body: "Manage your customers, fund wallets, and suspend accounts.",
  },
  {
    icon: Bell,
    iconClass: "bg-emerald-500/10 text-emerald-400",
    title: "Notifications & Announcements",
    body: "Send announcements and push notifications to all users.",
  },
];

function Affiliate() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const submitOrder = useServerFn(createAffiliateOrder);
  const fetchOrders = useServerFn(listAffiliateOrders);

  const [selectedExtension, setSelectedExtension] = useState<Ext>(".com");
  const [websiteName, setWebsiteName] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: account } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  const { data: orders } = useQuery({
    queryKey: ["affiliate-orders", user.id],
    queryFn: () => fetchOrders({ data: undefined as never }),
  });

  const balance = Number(account?.wallet?.balance ?? 0);
  const currentTotal = PRICING[selectedExtension];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = websiteName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!clean || clean.length < 2) {
      toast.error("Enter a valid website name (letters, numbers, hyphens)");
      return;
    }
    if (!contactDetails.trim() || contactDetails.trim().length < 10) {
      toast.error("Enter a valid WhatsApp / phone number");
      return;
    }
    setBusy(true);
    try {
      await submitOrder({
        data: {
          websiteName: clean,
          domain: clean,
          domainExt: selectedExtension,
          phone: contactDetails.trim(),
          notes: additionalNotes.trim() || undefined,
          amount: currentTotal,
        },
      });
      toast.success(
        `Order placed: ${clean}${selectedExtension} — our team will contact you on ${contactDetails.trim()}`,
      );
      setWebsiteName("");
      setContactDetails("");
      setAdditionalNotes("");
      void queryClient.invalidateQueries({ queryKey: ["affiliate-orders", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell showThemeToggle={false}>
      <div className="min-h-screen bg-[#0F172A] px-4 pb-8 pt-4 text-slate-100">
        <div className="mb-4 flex items-center gap-2">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-200"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-white">Affiliate Website</h1>
        </div>

        {/* Banner */}
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-6 shadow-2xl">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[#16C784]/10 blur-3xl" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center space-x-2 rounded-full border border-[#16C784]/20 bg-[#16C784]/10 px-3 py-1 text-xs font-semibold text-[#16C784]">
              <Sparkles size={14} />
              <span>Affiliate Website Program</span>
            </div>
            <h2 className="mb-2 text-2xl font-black leading-tight tracking-tight text-white">
              Own Your Own Platform. Sell Every Verxor Product.
            </h2>
            <p className="mb-5 text-xs leading-relaxed text-slate-400">
              Launch a fully branded reseller site with our complete product catalog under
              your control. Your brand, your profit.
            </p>
            <div className="mb-6 flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center space-x-1 rounded-lg border border-slate-700/60 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-200"
                >
                  <Check size={12} className="text-[#16C784]" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-3">
              <span className="text-xs font-medium text-slate-400">Wallet Balance</span>
              <span className="text-sm font-bold text-[#16C784]">{naira(balance)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Step 1 */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16C784]/10 text-xs font-bold text-[#16C784]">
                1
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Choose Domain Extension
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {EXT_META.map(({ ext, blurb }) => (
                <button
                  key={ext}
                  type="button"
                  onClick={() => setSelectedExtension(ext)}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${
                    selectedExtension === ext
                      ? "border-[#16C784] bg-[#16C784]/5 shadow-lg shadow-[#16C784]/5"
                      : "border-slate-800 bg-slate-800/40 hover:border-slate-700"
                  }`}
                >
                  <div className="text-left">
                    <span className="text-base font-bold text-white">{ext}</span>
                    <p className="mt-0.5 text-[11px] text-slate-400">{blurb}</p>
                  </div>
                  <span className="text-sm font-bold text-[#16C784]">
                    {naira(PRICING[ext])}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16C784]/10 text-xs font-bold text-[#16C784]">
                2
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Preferred Website Name
              </h2>
            </div>
            <div className="flex items-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 transition focus-within:border-[#16C784]">
              <span className="border-r border-slate-800 bg-slate-900 px-3 py-3.5 font-mono text-xs text-slate-400">
                www.
              </span>
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="yoursite"
                required
                className="w-full bg-transparent px-3 py-3.5 text-sm text-white placeholder-slate-600 outline-none"
              />
              <span className="border-l border-slate-800 bg-slate-900 px-3 py-3.5 font-mono text-xs text-slate-400">
                {selectedExtension}
              </span>
            </div>
            <p className="mt-2 px-1 text-[11px] text-slate-500">
              Name only — no www or extension. E.g., mystore
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16C784]/10 text-xs font-bold text-[#16C784]">
                3
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Contact Details
              </h2>
            </div>
            <input
              type="text"
              value={contactDetails}
              onChange={(e) => setContactDetails(e.target.value)}
              placeholder="WhatsApp / Phone — +234 800 000 0000"
              required
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#16C784]"
            />
            <p className="mt-2 px-1 text-[11px] text-slate-500">
              We&apos;ll reach out here to set up your website.
            </p>
          </div>

          {/* Step 4 */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16C784]/10 text-xs font-bold text-[#16C784]">
                4
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Additional Notes
              </h2>
            </div>
            <textarea
              rows={3}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Brand colors, logo notes, launch date..."
              className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#16C784]"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-inner">
            <span className="text-sm font-medium text-slate-400">Total</span>
            <span className="text-xl font-black text-[#16C784]">{naira(currentTotal)}</span>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-[#16C784] to-emerald-600 py-4 text-sm font-bold tracking-wide text-slate-950 shadow-lg shadow-[#16C784]/20 transition hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{busy ? "Submitting…" : "Order My Website"}</span>
          </button>
        </form>

        {/* What you get */}
        <div className="mt-10">
          <h3 className="mb-4 flex items-center space-x-2 px-1 text-base font-bold text-white">
            <Sparkles size={18} className="text-[#16C784]" />
            <span>What You Get</span>
          </h3>
          <div className="space-y-1 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-2 backdrop-blur-md">
            {WHAT_YOU_GET.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-start space-x-3 rounded-2xl p-3 transition hover:bg-slate-800/40"
                >
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                    <p className="mt-0.5 text-xs text-slate-400">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Existing orders */}
        {orders && orders.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Your orders
            </h3>
            <ul className="space-y-2">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      {o.website_name}
                      {o.domain_ext}
                    </span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-400">
                      {o.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{o.phone}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}

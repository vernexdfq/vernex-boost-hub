import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Gift,
  Copy,
  Users,
  Wallet,
  Clock,
  Share2,
  ChevronLeft,
  Info,
  Coins,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { naira } from "@/lib/pricing";
import { fetchAccount } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/reward")({
  head: () => ({
    meta: [
      { title: "Rewards & Referrals — Vernex" },
      {
        name: "description",
        content: "Earn commissions when your friends fund their Vernex wallet.",
      },
      { property: "og:title", content: "Vernex Rewards" },
    ],
  }),
  component: Reward,
});

const COMMISSION_PCT = 5;
const MIN_TOPUP_FOR_REWARD = 1000;
const FIXED_BONUS_NGN = 100;

function buildReferralCode(fullName: string | null | undefined, userId: string): string {
  const base =
    (fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0]
      ?.toUpperCase()
      .replace(/[^A-Z0-9]/g, "") || "USER";
  const tail = userId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `VERNEX-${base}${tail ? `-${tail}` : ""}`.slice(0, 24);
}

function Reward() {
  const { user } = Route.useRouteContext();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: account } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
  });

  const walletBalance = Number(account?.wallet?.balance ?? 0);
  const code = useMemo(
    () => buildReferralCode(account?.profile?.full_name, user.id),
    [account?.profile?.full_name, user.id],
  );

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://vernex.com.ng";
  const referralLink = `${origin}/auth?ref=${encodeURIComponent(code)}`;

  // Live stats — wire to referral tables when available; safe zeros for now
  const totalReferrals = 0;
  const totalEarned = 0;
  const pending = 0;
  const withdrawn = 0;
  const available = Math.max(0, totalEarned - withdrawn - pending);

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success("Copied");
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(
      `Join me on Vernex — virtual numbers, OTP & growth tools.\nUse my code ${code}\n${referralLink}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Vernex",
          text: `Use my Vernex referral code ${code}`,
          url: referralLink,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    await copy(referralLink, "link");
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md">
        <Link
          to="/dashboard"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-bold">Rewards</h1>
          <p className="text-[11px] text-muted-foreground">Refer &amp; earn</p>
        </div>
        <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-bold tabular-nums text-emerald-700">
          {naira(Math.round(walletBalance))}
        </div>
      </header>

      <div className="space-y-4 px-4 pb-8 pt-4">
        {/* Prominent balance strip (requested ₦ display zone) */}
        <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-card-elev">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Wallet balance
          </p>
          <p className="mt-0.5 text-2xl font-black tabular-nums text-emerald-600">
            {naira(walletBalance)}
          </p>
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl brand-gradient p-5 text-white shadow-wallet">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-8 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
              <Gift className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-black tracking-tight">Earn by Referring</p>
              <p className="mt-1 text-[13px] text-white/85">
                Earn <span className="font-bold">{COMMISSION_PCT}%</span> commission when friends
                fund — plus bonuses on qualifying top-ups.
              </p>
            </div>
          </div>

          <div className="relative mt-5 rounded-2xl border border-white/15 bg-white/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                  Your code
                </p>
                <p className="truncate text-sm font-bold tracking-wide">{code}</p>
              </div>
              <button
                type="button"
                onClick={() => copy(code, "code")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[oklch(0.22_0.12_265)]"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied === "code" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Total referrals",
              value: String(totalReferrals),
              icon: Users,
              tone: "text-primary",
            },
            {
              label: "Total earned",
              value: naira(totalEarned),
              icon: Coins,
              tone: "text-emerald-600",
            },
            {
              label: "Pending",
              value: naira(pending),
              icon: Clock,
              tone: "text-amber-600",
            },
            {
              label: "Withdrawn",
              value: naira(withdrawn),
              icon: Wallet,
              tone: "text-sky-600",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev"
              >
                <Icon className={`h-4 w-4 ${s.tone}`} />
                <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-0.5 text-xl font-black tabular-nums">{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Available to withdraw */}
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-card-elev">
          <div className="rounded-2xl bg-[oklch(0.22_0.08_265)] px-4 py-5 text-center text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
              Available to withdraw
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums">{naira(available)}</p>
            <p className="mt-1 text-[12px] text-white/70">
              {available > 0 ? "Ready for your Vernex wallet" : "Refer friends to start earning"}
            </p>
          </div>

          <ul className="mt-4 space-y-2 text-[13px]">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Total earned</span>
              <span className="font-semibold tabular-nums">{naira(totalEarned)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Withdrawn to wallet</span>
              <span className="font-semibold tabular-nums">{naira(withdrawn)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending earnings</span>
              <span className="font-semibold tabular-nums text-amber-600">{naira(pending)}</span>
            </li>
            <li className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">Commission rate</span>
              <span className="font-bold text-primary">{COMMISSION_PCT}%</span>
            </li>
          </ul>

          <button
            type="button"
            disabled={available <= 0}
            onClick={() =>
              toast.message("Nothing to withdraw yet", {
                description: "Earnings appear after referred friends fund their wallet.",
              })
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-50"
          >
            <Wallet className="h-4 w-4" />
            Withdraw to Wallet
          </button>
        </section>

        {/* Referral ID / link */}
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Your referral ID</h2>
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Share your unique code or link. When a friend registers with it and funds their
            wallet, you earn rewards.
          </p>

          <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Referral code
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-mono text-sm font-bold tracking-wide">
              {code}
            </div>
            <button
              type="button"
              onClick={() => copy(code, "code2")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied === "code2" ? "Copied" : "Copy"}
            </button>
          </div>

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Referral link
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[12px] text-muted-foreground">
              {referralLink}
            </div>
            <button
              type="button"
              onClick={() => copy(referralLink, "link")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-bold"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied === "link" ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-[12px] font-bold text-white"
            >
              Share on WhatsApp
            </button>
            <button
              type="button"
              onClick={shareLink}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 py-3 text-[12px] font-bold"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share link
            </button>
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">How it works</h2>
          </div>
          <ol className="space-y-3">
            {[
              {
                t: "Share your referral link",
                d: "Copy your Vernex code or link and share via WhatsApp, SMS, or social media.",
              },
              {
                t: "Friend registers",
                d: "They create a Vernex account using your link or code.",
              },
              {
                t: "Earn your reward",
                d: `When they fund at least ${naira(MIN_TOPUP_FOR_REWARD)}, you earn ${COMMISSION_PCT}% commission (and qualifying bonuses from ${naira(FIXED_BONUS_NGN)}).`,
              },
              {
                t: "Withdraw to your wallet",
                d: "Move referral earnings into your Vernex wallet anytime and spend on numbers, boosts, and more.",
              },
            ].map((step, i) => (
              <li key={step.t} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13px] font-bold">{step.t}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {step.d}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Earnings history */}
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Earnings history</h2>
            </div>
            <span className="text-[11px] text-muted-foreground">0 records</span>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Coins className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold">No earnings yet</p>
            <p className="mt-1 max-w-[240px] text-[12px] text-muted-foreground">
              Share your referral link to start earning commissions on Vernex.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

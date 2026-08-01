import { createFileRoute } from "@tanstack/react-router";
import { Gift, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/reward")({
  head: () => ({
    meta: [
      { title: "Rewards & Referrals — Vernex" },
      { name: "description", content: "Earn commissions when your friends fund their Vernex wallet." },
      { property: "og:title", content: "Vernex Rewards" },
      { property: "og:description", content: "Refer friends. Earn commissions. Withdraw to your wallet anytime." },
    ],
  }),
  component: Reward,
});

function Reward() {
  const code = "VERNEX-DENNY";
  return (
    <AppShell>
      <PageHeader title="Rewards" subtitle="Refer & earn" />
      <div className="px-5 pt-5">
        <div className="rounded-3xl brand-gradient p-5 text-white shadow-wallet">
          <Gift className="h-6 w-6" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Total Earned
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums">₦0.00</p>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 p-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-white/60">Your code</p>
              <p className="truncate text-sm font-bold">{code}</p>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(code);
                toast.success("Referral code copied");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[oklch(0.22_0.12_265)]"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { label: "Referrals", value: "0", icon: Users },
            { label: "Commission", value: "5%", icon: Gift },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-3 text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-black">{s.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

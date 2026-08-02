import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Zap, Building2, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { getWalletFundingDetails } from "@/lib/functions/fund.functions";

export const Route = createFileRoute("/_authenticated/fund")({
  head: () => ({
    meta: [
      { title: "Fund Wallet — Vernex" },
      { name: "description", content: "Fund your Vernex wallet instantly via dedicated virtual bank account or Paystack." },
      { property: "og:title", content: "Fund your Vernex wallet" },
      { property: "og:description", content: "Transfer to your dedicated Nigerian virtual account and get credited instantly." },
    ],
  }),
  component: FundPage,
});

function FundPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const { user } = Route.useRouteContext();
  const fetchDetails = useServerFn(getWalletFundingDetails);

  const { data: account, isLoading } = useQuery({
    queryKey: ["fund-details", user.id],
    queryFn: () => fetchDetails({ data: undefined }),
  });

  const copy = async (value: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <AppShell>
      <PageHeader title="Fund Wallet" subtitle="Instant credit on bank transfer" />

      <section className="px-5 pt-5">
        <div className="relative overflow-hidden rounded-3xl wallet-gradient p-5 shadow-wallet">
          <div className="absolute inset-0 dotted-bg opacity-30" />
          <div className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            <Building2 className="h-3.5 w-3.5" /> Your dedicated account
          </div>

          {isLoading ? (
            <div className="relative mt-8 flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : (
            <dl className="relative mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-widest text-white/50">Bank</dt>
                  <dd className="truncate text-sm font-bold text-white">{account?.bankName}</dd>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-widest text-white/50">Account Number</dt>
                  <dd className="truncate text-lg font-black tracking-wider text-white tabular-nums">
                    {account?.accountNumber}
                  </dd>
                </div>
                <button
                  onClick={() => copy(account?.accountNumber ?? "", "num", "Account number")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[oklch(0.22_0.12_265)] hover:brightness-95 transition"
                >
                  {copied === "num" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "num" ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-widest text-white/50">Account Name</dt>
                  <dd className="truncate text-sm font-bold text-white">{account?.accountName}</dd>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-widest text-white/50">Reference</dt>
                  <dd className="truncate text-sm font-mono text-white/90">{account?.reference}</dd>
                </div>
              </div>
            </dl>
          )}

          <p className="relative mt-4 flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-[12px] leading-relaxed text-emerald-200/90">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            Transfer any amount to this account. Your wallet is credited automatically within seconds.
          </p>
        </div>
      </section>

      <section className="px-5 pt-6">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Instant Gateway
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <button
          onClick={() => toast.info("Card gateway coming live in next deployment")}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-card-elev hover:bg-surface-2 transition"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl brand-gradient text-white">
            <Zap className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Pay with Paystack / Flutterwave</p>
            <p className="text-xs text-muted-foreground">Card, USSD or bank — 1.5% fee</p>
          </div>
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            Fast
          </span>
        </button>
      </section>
    </AppShell>
  );
}

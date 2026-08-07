import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Building2,
  ShieldCheck,
  Loader2,
  ChevronLeft,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { naira } from "@/lib/pricing";
import { fetchAccount } from "@/lib/account";
import { getWalletFundingDetails } from "@/lib/functions/fund.functions";

export const Route = createFileRoute("/_authenticated/fund")({
  head: () => ({
    meta: [
      { title: "Fund Wallet — Vernex" },
      {
        name: "description",
        content: "Fund your Vernex wallet via bank transfer to your permanent virtual account.",
      },
    ],
  }),
  component: FundPage,
});

function FundPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchFunding = useServerFn(getWalletFundingDetails);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: account } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
  });

  const {
    data: funding,
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["wallet-funding", user.id],
    queryFn: () => fetchFunding({ data: undefined }),
    staleTime: 30_000,
  });

  const balance = account?.wallet?.balance ?? 0;

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

  function Row({
    label,
    value,
    mono,
    copyKey,
  }: {
    label: string;
    value: string;
    mono?: boolean;
    copyKey?: string;
  }) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={`mt-0.5 text-sm font-bold ${mono ? "font-mono tabular-nums" : ""}`}>
            {value}
          </p>
        </div>
        {copyKey && (
          <button
            type="button"
            onClick={() => copy(value, copyKey)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-primary"
          >
            {copied === copyKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy
          </button>
        )}
      </div>
    );
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md">
        <Link to="/dashboard" aria-label="Back" className="text-primary">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-[15px] font-bold">Fund Wallet</h1>
          <p className="text-[11px] text-muted-foreground">Bank transfer · instant credit</p>
        </div>
        <button
          type="button"
          onClick={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ["account", user.id] });
          }}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="space-y-4 px-5 pt-5 pb-6">
        {/* Balance */}
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Available balance
              </p>
              <p className="text-2xl font-black tabular-nums text-emerald-600">
                {naira(Math.round(balance))}
              </p>
            </div>
          </div>
        </div>

        {/* Virtual account */}
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <div className="mb-1 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black">Your funding account</h2>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Transfer any amount from your bank app to this account. Your wallet is credited
            automatically.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-center text-sm">
              Could not load funding details.{" "}
              <button type="button" onClick={() => refetch()} className="font-bold text-primary">
                Retry
              </button>
            </div>
          ) : funding?.pending ? (
            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">
              <p className="font-bold text-amber-700">Account is being generated</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {funding.configured
                  ? "Your permanent virtual account is being created with Flutterwave. Tap refresh in a few seconds."
                  : "Flutterwave is not fully configured on the server yet. Contact support if this persists."}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg brand-gradient px-3 py-2 text-[12px] font-bold text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Generate / Refresh
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <Row label="Bank" value={funding?.bankName ?? "—"} />
              <Row
                label="Account number"
                value={funding?.accountNumber ?? "—"}
                mono
                copyKey="acct"
              />
              <Row label="Account name" value={funding?.accountName ?? "—"} copyKey="name" />
              <Row label="Reference" value={funding?.reference ?? "—"} mono copyKey="ref" />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="text-[13px] leading-relaxed text-muted-foreground">
              <p className="font-bold text-foreground">How funding works</p>
              <ul className="mt-2 space-y-1.5">
                <li>· Copy the account number above into your bank app</li>
                <li>· Send any amount in NGN (minimum ₦100 recommended)</li>
                <li>· Wallet balance updates automatically after Flutterwave confirms</li>
                <li>· Keep the reference if you need support on a delayed credit</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

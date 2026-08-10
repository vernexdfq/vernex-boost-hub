import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Loader2,
  ChevronLeft,
  RefreshCw,
  Building2,
  Hash,
  User,
  ShieldCheck,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { naira } from "@/lib/pricing";
import { fetchAccount } from "@/lib/account";
import { getWalletFundingDetails, confirmWalletDeposit } from "@/lib/functions/fund.functions";

export const Route = createFileRoute("/_authenticated/fund")({
  head: () => ({
    meta: [
      { title: "Fund Wallet — Vernex" },
      {
        name: "description",
        content: "Fund your Vernex wallet via bank transfer to your virtual account.",
      },
    ],
  }),
  component: FundPage,
});

type ProviderTab = "primary" | "secondary";

function FundPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchFunding = useServerFn(getWalletFundingDetails);
  const confirmDeposit = useServerFn(confirmWalletDeposit);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderTab>("primary");

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
    error,
  } = useQuery({
    queryKey: ["wallet-funding", user.id],
    queryFn: async () => fetchFunding({ data: undefined as never }),
    staleTime: 15_000,
    retry: 1,
  });

  const balance = account?.wallet?.balance ?? 0;

  const accountNumber =
    funding?.accountNumber ?? account?.wallet?.virtual_account_number ?? null;
  const bankName =
    funding?.bankName ?? account?.wallet?.virtual_bank_name ?? "Wema Bank";
  const reference =
    funding?.reference ??
    account?.wallet?.virtual_account_reference ??
    `VNX-${user.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const accountName =
    funding?.accountName ||
    (account?.profile?.full_name
      ? `VERNEX / ${account.profile.full_name.toUpperCase()}`
      : "VERNEX / CUSTOMER");

  const pending = !accountNumber;
  const statusMessage =
    funding?.message ||
    (isError
      ? error instanceof Error
        ? error.message
        : "Could not load funding details."
      : null);

  // UI tabs mirror the reference (Paga / Palmpay). Values always come from Flutterwave VA.
  const primaryLabel = bankName?.toLowerCase().includes("paga")
    ? "Paga"
    : bankName?.toLowerCase().includes("palm")
      ? "Palmpay"
      : bankName?.split(" ")[0] || "Bank";
  const secondaryLabel = primaryLabel === "Paga" ? "Palmpay" : "Paga";

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

  async function handleRefresh() {
    try {
      await fetchFunding({ data: { force: true } });
      await queryClient.invalidateQueries({ queryKey: ["wallet-funding", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      await refetch();
      toast.success("Permanent account refreshed");
    } catch {
      toast.error("Could not refresh funding details");
    }
  }

  async function handleConfirmDeposit() {
    if (confirming) return;
    setConfirming(true);
    try {
      const result = await confirmDeposit();
      await queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-funding", user.id] });
      if (result.credited > 0) {
        toast.success(result.message);
      } else {
        toast.message(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not confirm deposit");
    } finally {
      setConfirming(false);
    }
  }

  function CopyBtn({
    value,
    copyKey,
  }: {
    value: string;
    copyKey: string;
  }) {
    const done = copied === copyKey;
    return (
      <button
        type="button"
        onClick={() => copy(value, copyKey)}
        className="flex items-center space-x-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-100 active:scale-[0.98]"
      >
        {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span>{done ? "Copied" : "Copy"}</span>
      </button>
    );
  }

  return (
    <AppShell showThemeToggle={false}>
      <div className="mx-auto max-w-md space-y-6 px-4 pb-6 pt-2 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </Link>
            <h1 className="text-lg font-black text-slate-900">Fund Wallet</h1>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isFetching}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition active:scale-95 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Wallet balance card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 to-indigo-950 p-6 text-white shadow-xl">
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-indigo-600/30 blur-2xl" />
          <div className="mb-2 flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <span>Wallet Balance</span>
          </div>
          <div className="mb-2 text-3xl font-black sm:text-4xl">{naira(Number(balance) || 0)}</div>
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-800/50 bg-emerald-950/50 px-3 py-1 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Available for transactions</span>
          </div>
        </div>

        {/* Section title + fee notice */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-indigo-600">
            <Building2 className="h-5 w-5" />
            <span>Fund via Bank Transfer</span>
          </div>
          <div className="flex items-start space-x-3 rounded-2xl border border-amber-200/80 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 sm:text-sm">
            <span className="text-lg">⚠️</span>
            <span>A fee of ₦50 will be deducted from your deposit.</span>
          </div>
        </div>

        {/* Provider tabs (visual — account details from Flutterwave) */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setProvider("primary")}
            className={`flex items-center space-x-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              provider === "primary"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                provider === "primary" ? "bg-white" : "bg-indigo-600"
              }`}
            />
            <span>{primaryLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => setProvider("secondary")}
            className={`flex items-center space-x-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              provider === "secondary"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                provider === "secondary" ? "bg-white" : "bg-indigo-600"
              }`}
            />
            <span>{secondaryLabel}</span>
          </button>
        </div>

        {/* Account details card */}
        <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : pending ? (
            <div className="space-y-3 text-center">
              <p className="text-sm font-bold text-slate-900">Account not ready yet</p>
              <p className="text-xs leading-relaxed text-slate-500">
                {statusMessage ||
                  "We could not generate a virtual account yet. Tap Generate and try again."}
              </p>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98]"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Generate / Refresh
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeposit()}
                disabled={confirming}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {confirming ? "Checking Flutterwave…" : "I've paid — Confirm deposit"}
              </button>
            </div>
          ) : (
            <>
              {/* Bank */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Bank Name
                    </div>
                    <div className="text-base font-black text-slate-900">{bankName}</div>
                  </div>
                </div>
                <CopyBtn value={bankName} copyKey="bank" />
              </div>

              {/* Account number */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                    <Hash className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Account Number
                    </div>
                    <div className="text-lg font-black tracking-wider text-slate-900">
                      {accountNumber}
                    </div>
                  </div>
                </div>
                <CopyBtn value={accountNumber ?? ""} copyKey="acct" />
              </div>

              {/* Account name */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Account Name
                    </div>
                    <div className="text-base font-black text-slate-900">{accountName}</div>
                  </div>
                </div>
                <CopyBtn value={accountName} copyKey="name" />
              </div>

              {reference && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-600">Ref:</span> {reference}
                </div>
              )}

              {funding?.message && (
                <p className="text-xs text-amber-700">{funding.message}</p>
              )}
            </>
          )}
        </div>

        {/* How to fund */}
        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
            How to fund your wallet
          </h3>
          <div className="space-y-3 text-xs text-slate-600 sm:text-sm">
            {[
              "Select a bank and generate your virtual account (one-time).",
              "Copy the account number and open your banking app.",
              "Transfer any amount to the account details shown above.",
              "Your wallet is credited automatically within seconds.",
            ].map((step, i) => (
              <div key={step} className="flex items-start space-x-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Secure badge */}
        <div className="flex items-start space-x-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div>
            <span className="font-bold text-slate-900">Instant & Secure:</span> Transfers are
            processed automatically. Your balance updates within seconds of a successful transfer.
          </div>
        </div>
      </div>
    </AppShell>
  );
}

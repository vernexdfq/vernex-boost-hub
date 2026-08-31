import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, ChevronRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccount } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/rental/credit")({
  head: () => ({
    meta: [{ title: "Credit — Verxor" }],
  }),
  component: CreditPage,
});

const packages = [
  { id: "1", amount: "₦5,000", price: "₦5,000" },
  { id: "2", amount: "₦10,000", price: "₦10,000" },
  { id: "3", amount: "₦20,000", price: "₦20,000" },
  { id: "4", amount: "₦50,000", price: "₦50,000" },
];

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CreditPage() {
  const { user } = Route.useRouteContext();

  const { data: account, isLoading } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  const balance = Number(account?.wallet?.balance ?? 0);

  return (
    <div className="min-h-[100dvh] bg-[#f6f8fc] pb-24">
      <header className="sticky top-0 z-40 border-b border-slate-100/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-lg items-center justify-center px-4">
          <h1 className="text-[17px] font-semibold text-[#0f1332]">Credit</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-6">
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1332] via-[#151a3d] to-[#2563eb] p-5 text-white shadow-lg shadow-[#0f1332]/25">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
          <p className="text-[13px] font-medium text-blue-100">Available credit</p>
          {isLoading ? (
            <div className="mt-2 flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-200" />
              <span className="text-sm text-blue-100">Loading…</span>
            </div>
          ) : (
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
              {formatNaira(balance)}
            </p>
          )}
          <Link
            to="/fund"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-white backdrop-blur transition active:bg-white/25"
          >
            <Wallet size={14} /> Top up wallet
          </Link>
        </div>

        <h2 className="mb-3 text-[15px] font-semibold text-[#0f1332]">Top-up packages</h2>
        <ul className="space-y-2.5">
          {packages.map((p) => (
            <li key={p.id}>
              <Link
                to="/fund"
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition active:bg-slate-50"
              >
                <div>
                  <p className="text-[15px] font-semibold text-[#0f1332]">{p.amount}</p>
                  <p className="text-[12px] text-slate-500">Wallet credit</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-bold text-[#2563eb]">
                  {p.price}
                  <ChevronRight size={16} className="text-slate-300" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

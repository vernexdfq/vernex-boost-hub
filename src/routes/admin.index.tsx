import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, ChevronRight, SlidersHorizontal, Users } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { listChildPanels, type ChildPanel } from "@/lib/functions/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin — Verxor" }],
  }),
  component: AdminOverviewPage,
});

function naira(n: number) {
  return "₦" + (Number(n) || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

function AdminOverviewPage() {
  const fetchPanels = useServerFn(listChildPanels);
  const [panels, setPanels] = useState<ChildPanel[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPanels();
        if (!cancelled) setPanels(res.panels);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load panels");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPanels]);

  const totalBalance = panels.reduce((s, p) => s + (p.walletBalance || 0), 0);

  return (
    <AdminShell title="Overview" subtitle="Verxor control panel" active="overview">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Child Panels
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{panels.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Total Panel Balance
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
              {naira(totalBalance)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Manage
          </p>
          <Link
            to="/admin/panels"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-400"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Child Panels</p>
              <p className="text-xs text-slate-500">
                Wallets, manual funding, contact details & history
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
          <Link
            to="/admin/pricing"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-400"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Pricing</p>
              <p className="text-xs text-slate-500">Exchange rate & per-server markups</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-4 opacity-70">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Boxes className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-400">Providers</p>
              <p className="text-xs text-slate-400">Coming soon — built next</p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

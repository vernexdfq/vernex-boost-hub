import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Hash, ChevronRight, Loader2 } from "lucide-react";
import { listMyRentals } from "@/lib/functions/rentals.functions";
import { flagOf, formatDate } from "@/components/rental/calls-helpers";

export const Route = createFileRoute("/_authenticated/rental/numbers")({
  head: () => ({
    meta: [{ title: "Numbers — Verxor" }],
  }),
  component: NumbersPage,
});

const authRoute = getRouteApi("/_authenticated");

type RentalRow = {
  id: string;
  phone: string;
  country: string;
  flag: string;
  status: string;
  expires: string;
  active: boolean;
};

function NumbersPage() {
  const { user } = authRoute.useRouteContext();
  const listRentals = useServerFn(listMyRentals);
  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["my-rentals", user.id],
    queryFn: () => listRentals({ data: undefined }),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const rows: RentalRow[] = (rentals as Array<Record<string, unknown>>).map((r, i) => {
    const nested = (r["rental_numbers"] as Record<string, unknown> | null) || {};
    const phone = String(nested["phone_number"] || r["phone_number"] || "—");
    const status = String(r["status"] || "active");
    const country = String(nested["country_name"] || "");
    const cc = String(nested["country_code"] || "US");

    return {
      id: String(r["id"] || i),
      phone,
      country,
      flag: flagOf(cc.length === 2 ? cc : "US"),
      status,
      expires: formatDate(String(r["expires_at"] || r["created_at"] || "")),
      active: status === "active",
    };
  });

  return (
    <div className="min-h-[100dvh] bg-white pb-24">
      <header className="sticky top-0 z-40 border-b border-slate-100/90 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <div className="w-9" aria-hidden="true" />
          <h1 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-950">Numbers</h1>
          <Link
            to="/rental/calls"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 active:bg-slate-100"
            aria-label="Rent a number"
          >
            <Plus size={20} strokeWidth={2} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-5 sm:px-6">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center" aria-label="Loading numbers">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <section className="flex min-h-72 flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50/40 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <Hash className="h-5 w-5 text-slate-400" strokeWidth={1.8} />
            </div>
            <h2 className="mt-4 text-[15px] font-semibold text-slate-950">No rented numbers</h2>
            <p className="mt-1 max-w-xs text-[13px] leading-5 text-slate-500">
              Your active virtual numbers will appear here after you rent one.
            </p>
            <Link
              to="/rental/calls"
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 active:bg-slate-900"
            >
              Rent a number
            </Link>
          </section>
        ) : (
          <section aria-label="Your rented numbers">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-400">
                Active numbers
              </p>
              <span className="text-[12px] tabular-nums text-slate-400">{rows.length}</span>
            </div>

            <ul className="divide-y divide-slate-100 border-y border-slate-100 bg-white">
              {rows.map((n) => (
                <li key={n.id}>
                  <div className="group flex min-h-[72px] items-center gap-3 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-xl leading-none">
                      {n.flag}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[14px] font-semibold tabular-nums tracking-[-0.01em] text-slate-950">
                        {n.phone}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-slate-500">
                        {n.country || "Virtual number"} · {n.active ? "Active" : n.status}
                        {n.expires ? ` · ${n.expires}` : ""}
                      </p>
                    </div>
                    <ChevronRight size={17} className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, ChevronRight, MessageSquare, PhoneCall, Radio, Smartphone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { fetchAccount } from "@/lib/account";
import { naira } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/rent-number")({
  head: () => ({
    meta: [
      { title: "Service Rental — Vernex" },
      {
        name: "description",
        content: "Rent and manage international phone numbers for calls and messages.",
      },
      { property: "og:title", content: "Service Rental — Vernex" },
      { property: "og:description", content: "Rent and manage international phone numbers for calls and messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RentNumberPage,
});

const rentalLinks = [
  {
    to: "/rental/calls" as const,
    label: "Calls",
    detail: "Browse available numbers and place calls",
    icon: PhoneCall,
  },
  {
    to: "/rental/messages" as const,
    label: "Messages",
    detail: "Check messages received on your lines",
    icon: MessageSquare,
  },
  {
    to: "/rental/numbers" as const,
    label: "My numbers",
    detail: "View your active and expired rentals",
    icon: Smartphone,
  },
] as const;

const authRoute = getRouteApi("/_authenticated");

function RentNumberPage() {
  const { user } = authRoute.useRouteContext();
  const { data: account, isLoading } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
    staleTime: 5_000,
  });
  const balance = Number(account?.wallet?.balance ?? 0);

  return (
    <AppShell>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
        <Link
          to="/dashboard"
          aria-label="Back to dashboard"
          className="grid size-9 shrink-0 place-items-center rounded-full text-foreground transition hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-bold leading-tight">Service Rental</h1>
        </div>
        <Link
          to="/fund"
          aria-label="Wallet balance; open funding"
          className="flex h-9 max-w-[145px] items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-bold tabular-nums text-foreground"
        >
          <span className="text-success">₦</span>
          <span className="truncate">{isLoading ? "Loading" : naira(balance)}</span>
        </Link>
      </header>

      <section className="space-y-6 px-4 pb-8 pt-4">
        <div className="flex min-h-20 items-center gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3" aria-label="Promotions">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <Bell className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Promotions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">No current offers</p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Your lines</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Phone services</h2>
          </div>
          <Radio className="mb-1 size-5 text-success" aria-hidden="true" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {rentalLinks.map(({ to, label, detail, icon: Icon }, index) => (
            <Link
              key={to}
              to={to}
              className={`flex min-h-[76px] items-center gap-3 px-4 py-3 transition hover:bg-muted ${index > 0 ? "border-t border-border" : ""}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-success">
                <Icon className="size-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>

        <Link
          to="/rental/calls"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-success px-4 text-sm font-bold text-success-foreground transition hover:opacity-90"
        >
          Browse numbers
        </Link>
      </section>
    </AppShell>
  );
}

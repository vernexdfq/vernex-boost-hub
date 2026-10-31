import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Globe2, PhoneCall, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/rent-number")({
  head: () => ({
    meta: [
      { title: "Rent Number — Verxor" },
      {
        name: "description",
        content:
          "Rent a phone number: single-platform OTP, all-platform OTP, or a full two-way mobile line.",
      },
    ],
  }),
  component: RentNumberPage,
});

const tiers = [
  {
    id: "single",
    name: "Single-Platform Rental",
    line: "Verifying one specific app",
    icon: Target,
    tint: "bg-sky-500/10 text-sky-500",
  },
  {
    id: "all",
    name: "All-Platform OTP Rental",
    line: "Registering several apps with one number",
    icon: Globe2,
    tint: "bg-indigo-500/10 text-indigo-500",
  },
  {
    id: "line",
    name: "Full Two-Way Mobile Line",
    line: "Actually talking and texting",
    icon: PhoneCall,
    tint: "bg-emerald-500/10 text-emerald-500",
  },
] as const;

function RentNumberPage() {
  return (
    <AppShell>
      <header className="flex items-center gap-3 px-5 pt-6">
        <Link
          to="/dashboard"
          aria-label="Back to dashboard"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground/90 hover:bg-surface-2 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold leading-tight">Rent Number</h1>
          <p className="truncate text-xs text-muted-foreground">Choose how you want to rent</p>
        </div>
      </header>

      <section className="space-y-3 px-5 pt-6 pb-10">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card-elev backdrop-blur-md"
            >
              <span
                className={"grid h-12 w-12 shrink-0 place-items-center rounded-2xl " + tier.tint}
              >
                <Icon size={24} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold leading-tight">{tier.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{tier.line}</p>
              </div>
            </div>
          );
        })}
        <p className="pt-1 text-center text-[11px] text-muted-foreground">Coming soon</p>
      </section>
    </AppShell>
  );
}

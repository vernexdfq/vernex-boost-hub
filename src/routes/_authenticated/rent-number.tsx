import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, Globe2, PhoneCall, Target } from "lucide-react";
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
    icon: Target,
    tint: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    bestFor: "Verifying one specific app",
    desc: "Locked to one app (e.g. WhatsApp only) for the whole rental duration.",
    features: [
      "Locked to the platform you choose",
      "Codes delivered for the full rental period",
      "Pick the rental duration that fits you",
    ],
  },
  {
    id: "all",
    name: "All-Platform OTP Rental",
    icon: Globe2,
    tint: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    bestFor: "Registering several apps with one number",
    desc: "One number that catches codes from WhatsApp, TikTok, Instagram, Telegram and more — over days or weeks.",
    features: [
      "Codes from every major platform",
      "Register multiple apps on one number",
      "Keep receiving codes for days or weeks",
    ],
  },
  {
    id: "line",
    name: "Full Two-Way Mobile Line",
    icon: PhoneCall,
    tint: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    bestFor: "Actually talking and texting",
    desc: "A real active line: send and receive SMS with anybody, plus voice calling.",
    features: [
      "Two-way SMS with anyone",
      "Make voice calls from your line",
      "A live number on your account",
    ],
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

      <section className="px-5 pt-5">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev backdrop-blur-md">
          <p className="text-sm font-semibold leading-snug">
            Need just a code? Or a full line to talk and text?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pick the option that fits what you are doing. Each one goes live as we launch it.
          </p>
        </div>
      </section>

      <section className="space-y-3 px-5 pt-5 pb-10">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.id}
              className="relative rounded-2xl border border-border bg-surface p-4 shadow-card-elev backdrop-blur-md"
            >
              <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3 w-3" />
                Coming Soon
              </span>
              <div className="flex items-center gap-3 pr-24">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${tier.tint}`}>
                  <Icon size={22} strokeWidth={2.1} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold leading-tight">{tier.name}</h2>
                  <p className="mt-0.5 text-[11px] font-medium text-primary">{tier.bestFor}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{tier.desc}</p>
              <ul className="mt-3 space-y-1.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground/80">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.6} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                className="mt-4 h-11 w-full rounded-xl border border-border bg-background/50 text-sm font-semibold text-muted-foreground"
              >
                Coming Soon
              </button>
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PhoneCall } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/rent-number")({
  head: () => ({
    meta: [
      { title: "Rent Number — Vernex" },
      { name: "description", content: "Rent long-term Non-VoIP numbers by the day, week, or month for unlimited SMS." },
      { property: "og:title", content: "Vernex — Rent Non-VoIP Numbers" },
      { property: "og:description", content: "Weekly & monthly rentals with unlimited SMS delivery." },
    ],
  }),
  component: RentNumber,
});

const countries = ["🇺🇸 USA", "🇬🇧 UK", "🇨🇦 Canada", "🇩🇪 Germany", "🇮🇩 Indonesia"];
const durations = [
  { label: "1 Day", days: 1, mult: 1 },
  { label: "1 Week", days: 7, mult: 5.5 },
  { label: "1 Month", days: 30, mult: 18 },
];

function RentNumber() {
  const [country, setCountry] = useState(countries[0]);
  const [duration, setDuration] = useState(durations[1]);
  const base = 2500;
  const total = Math.ceil(base * duration.mult);

  return (
    <AppShell>
      <PageHeader title="Rent Number" subtitle="Non-VoIP long-term rentals" />

      <div className="px-5 pt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Country</label>
          <div className="flex flex-wrap gap-2">
            {countries.map((c) => (
              <button key={c} onClick={() => setCountry(c)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${country === c ? "border-transparent brand-gradient text-white" : "border-border bg-surface text-muted-foreground"}`}>{c}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Duration</label>
          <div className="grid grid-cols-3 gap-2">
            {durations.map((d) => (
              <button key={d.label} onClick={() => setDuration(d)} className={`rounded-xl border py-3 text-sm font-bold ${duration.label === d.label ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"}`}>{d.label}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card-elev">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Rental Summary</p>
          <p className="mt-1 text-sm">{country} • {duration.label}</p>
          <p className="mt-3 text-3xl font-black tabular-nums">₦{total.toLocaleString("en-NG")}</p>
          <p className="text-[11px] text-muted-foreground">Unlimited incoming SMS during rental period</p>
          <button onClick={() => toast.success(`Rental confirmed: ${country} for ${duration.label}`)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl brand-gradient py-3 text-sm font-bold text-white">
            <PhoneCall className="h-4 w-4" /> Rent Now
          </button>
        </div>
      </div>
    </AppShell>
  );
}

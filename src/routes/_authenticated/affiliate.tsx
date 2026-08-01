import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Globe, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { naira } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/affiliate")({
  head: () => ({
    meta: [
      { title: "Get Affiliate Website — Vernex" },
      { name: "description", content: "Own your own Vernex reseller platform. Sell virtual numbers, SMM boosts, and social logs under your brand." },
      { property: "og:title", content: "Own Your Own Vernex Platform" },
      { property: "og:description", content: "Full reseller website with admin panel and profit dashboard." },
    ],
  }),
  component: Affiliate,
});

const features = [
  "Virtual Numbers",
  "SMM Boost",
  "Social Logs",
  "Wallet System",
  "Full Admin Panel",
  "Profit Dashboard",
];

const domains = [
  { ext: ".com", price: 150000 },
  { ext: ".ng", price: 120000 },
  { ext: ".com.ng", price: 120000 },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0F172A] text-[11px] font-black text-white">
          {n}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Affiliate() {
  const [domain, setDomain] = useState(domains[0]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter your website name and contact phone");
      return;
    }
    toast.success(`Order placed: ${name}${domain.ext} — our team will contact you on ${phone}`);
    setName("");
    setPhone("");
    setNotes("");
  };

  return (
    <AppShell>
      <PageHeader title="Affiliate Website" subtitle="Reseller platform builder" />

      <div className="px-5 pb-24 pt-5">
        <div className="relative overflow-hidden rounded-2xl bg-[#0F172A] p-5 text-white shadow-wallet">
          <div className="absolute inset-0 dotted-bg opacity-40" />
          <div className="relative">
            <Globe className="h-8 w-8 text-primary" />
            <h2 className="mt-3 text-xl font-black leading-tight">
              Own Your Own Platform. Sell Every Vernex Product.
            </h2>
            <p className="mt-2 text-xs text-white/70">
              Launch a fully branded reseller site with our complete product catalog under your control.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {features.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary"
            >
              <Check className="h-3 w-3" /> {f}
            </span>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          <Step n={1} title="Choose domain extension">
            <div className="grid grid-cols-3 gap-2">
              {domains.map((d) => (
                <button
                  key={d.ext}
                  onClick={() => setDomain(d)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    domain.ext === d.ext
                      ? "border-primary bg-primary/10 shadow-[0_8px_20px_-12px_rgba(22,199,132,0.8)]"
                      : "border-border bg-surface"
                  }`}
                >
                  <p className="text-sm font-black">{d.ext}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">{naira(d.price)}</p>
                </button>
              ))}
            </div>
          </Step>

          <Step n={2} title="Preferred website name">
            <div className="flex items-center overflow-hidden rounded-2xl border border-border bg-surface focus-within:border-primary">
              <span className="pl-4 text-sm font-semibold text-muted-foreground">www.</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\s+/g, "").toLowerCase())}
                placeholder="yoursite"
                className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none"
              />
              <span className="grid place-items-center self-stretch bg-accent px-3 text-sm font-bold text-primary">
                {domain.ext}
              </span>
            </div>
          </Step>

          <Step n={3} title="Contact details">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="WhatsApp / Phone — +234 800 000 0000"
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Step>

          <Step n={4} title="Additional notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Brand colors, logo notes, launch date…"
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Step>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Total
              </p>
              <p className="text-2xl font-black tabular-nums">{naira(domain.price)}</p>
            </div>
          </div>

          <button
            onClick={submit}
            className="w-full rounded-2xl bg-[#16C784] py-4 text-sm font-bold text-white shadow-[0_12px_28px_-12px_rgba(22,199,132,0.8)] transition active:scale-[0.99]"
          >
            Order My Website
          </button>
        </div>
      </div>
    </AppShell>
  );
}

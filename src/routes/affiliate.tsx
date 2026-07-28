import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Globe, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/affiliate")({
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

const features = ["Virtual Numbers", "SMM Boost", "Social Logs", "Wallet System", "Full Admin Panel", "Profit Dashboard"];
const domains = [
  { ext: ".com", price: 150000 },
  { ext: ".ng", price: 120000 },
  { ext: ".com.ng", price: 80000 },
];

function Affiliate() {
  const [domain, setDomain] = useState(domains[0]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name.trim() || !phone.trim()) { toast.error("Please enter website name and contact phone"); return; }
    toast.success(`Order placed: ${name}${domain.ext} — our team will contact you on ${phone}`);
    setName(""); setPhone(""); setNotes("");
  };

  return (
    <AppShell>
      <PageHeader title="Affiliate Website" subtitle="Reseller platform builder" />

      <div className="px-5 pt-5">
        <div className="rounded-2xl wallet-gradient p-5 text-white shadow-wallet">
          <Globe className="h-8 w-8 text-white/80" />
          <h2 className="mt-3 text-xl font-black leading-tight">Own Your Own Platform. Sell Every Vernex Product.</h2>
          <p className="mt-2 text-xs text-white/70">Launch a fully branded reseller site with our full product catalog under your control.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {features.map((f) => (
            <span key={f} className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
              <Check className="h-3 w-3" /> {f}
            </span>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Domain Extension</label>
            <div className="grid grid-cols-3 gap-2">
              {domains.map((d) => (
                <button key={d.ext} onClick={() => setDomain(d)} className={`rounded-xl border p-3 text-left ${domain.ext === d.ext ? "border-primary bg-primary/10" : "border-border bg-surface"}`}>
                  <p className="text-sm font-black">{d.ext}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">₦{d.price.toLocaleString("en-NG")}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Preferred Website Name</label>
            <div className="flex overflow-hidden rounded-xl border border-border bg-surface">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mywebsite" className="flex-1 bg-transparent px-4 py-3 text-sm outline-none" />
              <span className="grid place-items-center bg-accent px-3 text-sm font-bold text-primary">{domain.ext}</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">WhatsApp / Contact Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Additional Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Brand colors, logo notes, launch date..." className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
                <p className="text-2xl font-black tabular-nums">₦{domain.price.toLocaleString("en-NG")}</p>
              </div>
              <button onClick={submit} className="rounded-xl brand-gradient px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(22,199,132,0.6)]">
                Order My Website
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

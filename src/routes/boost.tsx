import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Rocket } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/boost")({
  head: () => ({
    meta: [
      { title: "Boost Account — Vernex" },
      { name: "description", content: "Boost your social accounts with followers, likes, and views across Instagram, TikTok, YouTube, and more." },
      { property: "og:title", content: "Vernex — Social Boost" },
      { property: "og:description", content: "Instant SMM delivery for every major platform." },
    ],
  }),
  component: BoostPage,
});

const platforms = ["Instagram", "TikTok", "YouTube", "Facebook", "Twitter/X", "Telegram"];
const categories: Record<string, string[]> = {
  Instagram: ["Followers", "Likes", "Views", "Comments"],
  TikTok: ["Followers", "Likes", "Views", "Shares"],
  YouTube: ["Subscribers", "Views", "Likes", "Watch Time"],
  Facebook: ["Page Likes", "Post Likes", "Followers"],
  "Twitter/X": ["Followers", "Likes", "Retweets"],
  Telegram: ["Members", "Post Views", "Reactions"],
};
const services = ["Real HQ (Slow)", "Premium (Fast)", "Instant Refill", "Guaranteed 30d"];

function BoostPage() {
  const [platform, setPlatform] = useState(platforms[0]);
  const [category, setCategory] = useState(categories[platforms[0]][0]);
  const [service, setService] = useState(services[0]);
  const [url, setUrl] = useState("");
  const [qty, setQty] = useState(1000);

  const rate = 3.5;
  const total = Math.ceil(qty * rate);

  const submit = () => {
    if (!url.trim()) { toast.error("Enter your profile / post URL"); return; }
    toast.success(`Order placed: ${qty} ${category} → ${platform}`);
    setUrl("");
  };

  return (
    <AppShell>
      <PageHeader title="Boost Account" subtitle="SMM delivery in minutes" />

      <div className="px-5 pt-5 space-y-4">
        <Field label="Platform">
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <button key={p} onClick={() => { setPlatform(p); setCategory(categories[p][0]); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${platform === p ? "border-transparent brand-gradient text-white" : "border-border bg-surface text-muted-foreground"}`}>{p}</button>
            ))}
          </div>
        </Field>

        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium outline-none focus:border-primary">
            {categories[platform].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Service">
          <select value={service} onChange={(e) => setService(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium outline-none focus:border-primary">
            {services.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Profile / Post URL">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://instagram.com/yourhandle" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
        </Field>

        <Field label="Quantity">
          <input type="number" min={100} step={100} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold outline-none focus:border-primary" />
        </Field>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
            <p className="text-2xl font-black tabular-nums">₦{total.toLocaleString("en-NG")}</p>
          </div>
          <button onClick={submit} className="inline-flex items-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(22,199,132,0.6)]">
            <Rocket className="h-4 w-4" /> Order Boost
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

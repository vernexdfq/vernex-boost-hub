import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/admin/pricing")({
  head: () => ({
    meta: [
      { title: "Admin — Pricing Settings — Vernex" },
      { name: "description", content: "Configure exchange rate and server markups for virtual number pricing." },
      { property: "og:title", content: "Vernex Admin — Pricing" },
      { property: "og:description", content: "Flexible USD→NGN and per-server markup configuration." },
    ],
  }),
  component: AdminPricing,
});

type ServerMarkup = { name: string; markupPct: number; fixedNgn: number };
type PricingConfig = { usdToNgn: number; servers: ServerMarkup[] };

const KEY = "vernex-pricing-config";
const DEFAULT: PricingConfig = {
  usdToNgn: 1600,
  servers: [
    { name: "5Sim S1", markupPct: 150, fixedNgn: 200 },
    { name: "Telnyx S2", markupPct: 165, fixedNgn: 250 },
    { name: "Grizzly S3", markupPct: 140, fixedNgn: 180 },
    { name: "All Countries S1", markupPct: 155, fixedNgn: 220 },
  ],
};

function load(): PricingConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch { return DEFAULT; }
}

export function priceInNaira(providerUsd: number, cfg = load(), serverIdx = 0) {
  const s = cfg.servers[serverIdx] ?? cfg.servers[0];
  const raw = providerUsd * cfg.usdToNgn * (s.markupPct / 100) + s.fixedNgn;
  return Math.ceil(raw);
}

function AdminPricing() {
  const [cfg, setCfg] = useState<PricingConfig>(DEFAULT);
  const [sample, setSample] = useState(0.35);

  useEffect(() => { setCfg(load()); }, []);

  const save = () => {
    window.localStorage.setItem(KEY, JSON.stringify(cfg));
    toast.success("Pricing configuration saved");
  };

  const updateServer = (i: number, patch: Partial<ServerMarkup>) => {
    setCfg((c) => ({ ...c, servers: c.servers.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));
  };

  return (
    <AppShell>
      <PageHeader title="Pricing Settings" subtitle="Admin: exchange rate & markups" right={<span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Settings2 className="h-4 w-4"/></span>} />

      <div className="px-5 pt-5 space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">USD → NGN Exchange Rate</label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-muted-foreground">₦</span>
            <input type="number" value={cfg.usdToNgn} onChange={(e) => setCfg({ ...cfg, usdToNgn: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-black tabular-nums outline-none focus:border-primary" />
            <span className="text-sm font-bold text-muted-foreground">/ $1</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Per-Server Markup</p>
          {cfg.servers.map((s, i) => (
            <div key={s.name} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
              <p className="text-sm font-bold">{s.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Markup %</label>
                  <input type="number" value={s.markupPct} onChange={(e) => updateServer(i, { markupPct: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold tabular-nums outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fixed ₦</label>
                  <input type="number" value={s.fixedNgn} onChange={(e) => updateServer(i, { fixedNgn: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold tabular-nums outline-none focus:border-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Live Preview</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Provider cost $</span>
            <input type="number" step="0.01" value={sample} onChange={(e) => setSample(Number(e.target.value))} className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm font-bold tabular-nums" />
          </div>
          <div className="mt-3 space-y-1 text-sm">
            {cfg.servers.map((s, i) => (
              <div key={s.name} className="flex justify-between">
                <span className="text-muted-foreground">{s.name}</span>
                <span className="font-black tabular-nums">₦{priceInNaira(sample, cfg, i).toLocaleString("en-NG")}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} className="w-full rounded-xl brand-gradient py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(22,199,132,0.6)]">
          Save Configuration
        </button>

        <p className="pb-4 text-center text-[11px] text-muted-foreground">
          Formula: (USD × Rate × Markup%) + Fixed ₦, rounded up.
        </p>
      </div>
    </AppShell>
  );
}

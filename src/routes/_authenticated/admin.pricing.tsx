import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import {
  DEFAULT_PRICING,
  loadPricing,
  savePricing,
  priceInNaira,
  naira,
  type PricingConfig,
  type ServerConfig,
} from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/pricing")({
  head: () => ({
    meta: [
      { title: "Admin — Pricing Settings — Vernex" },
      { name: "description", content: "Configure USD_TO_NGN_RATE, MARKUP_PERCENTAGE and FIXED_NGN_MARKUP per provider server." },
      { property: "og:title", content: "Vernex Admin — Pricing" },
      { property: "og:description", content: "Flexible exchange rate and per-server markup configuration." },
    ],
  }),
  component: AdminPricing,
});

function AdminPricing() {
  const [cfg, setCfg] = useState<PricingConfig>(DEFAULT_PRICING);
  const [sample, setSample] = useState(0.35);

  useEffect(() => {
    setCfg(loadPricing());
  }, []);

  const save = () => {
    savePricing(cfg);
    toast.success("Pricing configuration saved");
  };

  const updateServer = (id: string, patch: Partial<ServerConfig>) => {
    setCfg((c) => ({
      ...c,
      servers: c.servers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  return (
    <AppShell>
      <PageHeader
        title="Pricing Settings"
        subtitle="Admin: exchange rate & markups"
        right={
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="h-4 w-4" />
          </span>
        }
      />

      <div className="space-y-4 px-5 pb-24 pt-5">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <label className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            USD_TO_NGN_RATE
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-muted-foreground">₦</span>
            <input
              type="number"
              value={cfg.USD_TO_NGN_RATE}
              onChange={(e) => setCfg({ ...cfg, USD_TO_NGN_RATE: Number(e.target.value) })}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-lg font-black tabular-nums outline-none focus:border-primary"
            />
            <span className="text-sm font-bold text-muted-foreground">/ $1</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Per-server markup & provider mapping
          </p>
          {cfg.servers.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{s.label}</p>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {s.provider}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{s.envKeys.join(" · ")}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    MARKUP_PERCENTAGE
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={s.MARKUP_PERCENTAGE}
                    onChange={(e) => updateServer(s.id, { MARKUP_PERCENTAGE: Number(e.target.value) })}
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm font-bold tabular-nums outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    FIXED_NGN_MARKUP
                  </label>
                  <input
                    type="number"
                    value={s.FIXED_NGN_MARKUP}
                    onChange={(e) => updateServer(s.id, { FIXED_NGN_MARKUP: Number(e.target.value) })}
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm font-bold tabular-nums outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Live preview</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Provider cost $</span>
            <input
              type="number"
              step="0.01"
              value={sample}
              onChange={(e) => setSample(Number(e.target.value))}
              className="w-24 rounded-2xl border border-border bg-background px-2 py-1 text-sm font-bold tabular-nums"
            />
          </div>
          <div className="mt-3 space-y-1 text-sm">
            {cfg.servers.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-black tabular-nums">{naira(priceInNaira(sample, cfg, s.id))}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          className="w-full rounded-2xl brand-gradient py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(22,199,132,0.6)]"
        >
          Save Configuration
        </button>

        <p className="text-center text-[11px] text-muted-foreground">
          CEIL((Provider USD × USD_TO_NGN_RATE × MARKUP_PERCENTAGE) + FIXED_NGN_MARKUP)
        </p>
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Copy, Check, Timer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/virtual-numbers")({
  head: () => ({
    meta: [
      { title: "Virtual Numbers — Vernex" },
      { name: "description", content: "Rent virtual numbers for WhatsApp, Telegram, OpenAI and 300+ services. Instant OTP delivery." },
      { property: "og:title", content: "Vernex Virtual Numbers" },
      { property: "og:description", content: "Instant OTPs from 300+ services across USA and global server pools." },
    ],
  }),
  component: VirtualNumbers,
});

const servers = ["USA S1", "USA S2", "USA S3", "All Countries S1", "All Countries S2"];
const services = ["WhatsApp", "Telegram", "OpenAI / ChatGPT", "Tinder", "TikTok", "Google", "Instagram", "Facebook"];

const orders = [
  {
    id: 1,
    service: "WhatsApp",
    flag: "🇺🇸",
    country: "USA S1",
    number: "+1 341 802 7714",
    status: "waiting" as const,
    time: "18:42",
  },
  {
    id: 2,
    service: "Telegram",
    flag: "🇺🇸",
    country: "USA S2",
    number: "+1 725 555 0198",
    status: "received" as const,
    otp: "483 921",
    time: "09:14",
  },
];

function VirtualNumbers() {
  const [server, setServer] = useState(servers[0]);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const filtered = services.filter((s) => s.toLowerCase().includes(query.toLowerCase()));

  const copy = async (value: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <AppShell>
      <PageHeader title="Virtual Numbers" subtitle="Instant OTP delivery" />

      {/* Server pills */}
      <div className="px-5 pt-5">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {servers.map((s) => {
            const active = s === server;
            return (
              <button
                key={s}
                onClick={() => setServer(s)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-transparent brand-gradient text-white shadow-[0_8px_20px_-8px_oklch(0.6_0.22_262/0.7)]"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pt-4">
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card-elev focus-within:border-primary/60">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 300+ services…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </label>

        {query && (
          <ul className="mt-2 max-h-60 overflow-auto rounded-2xl border border-border bg-surface shadow-card-elev">
            {filtered.length === 0 ? (
              <li className="p-3 text-xs text-muted-foreground">No services match "{query}"</li>
            ) : (
              filtered.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => {
                      toast.success(`${s} order placed on ${server}`);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-accent/60"
                  >
                    <span>{s}</span>
                    <span className="text-[11px] font-semibold text-primary">Order →</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Recent orders */}
      <section className="px-5 pt-6">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Active Orders
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{o.flag}</span>
                    <p className="truncate text-sm font-bold">{o.service}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{o.country}</p>
                </div>
                {o.status === "waiting" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                    Waiting
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <Check className="h-3 w-3" /> Received
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5">
                <span className="truncate text-sm font-semibold tabular-nums">{o.number}</span>
                <button
                  onClick={() => copy(o.number, `num-${o.id}`, "Number")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg brand-gradient px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  {copied === `num-${o.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === `num-${o.id}` ? "Copied" : "Copy"}
                </button>
              </div>

              {o.status === "waiting" ? (
                <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" /> Waiting for SMS… expires in {o.time}
                </p>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300/80">
                      OTP Code
                    </p>
                    <p className="truncate text-lg font-black tracking-[0.3em] text-emerald-300 tabular-nums">
                      {o.otp}
                    </p>
                  </div>
                  <button
                    onClick={() => copy(o.otp!.replace(/\s/g, ""), `otp-${o.id}`, "OTP")}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-bold text-[oklch(0.2_0.05_160)]"
                  >
                    {copied === `otp-${o.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy OTP
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}

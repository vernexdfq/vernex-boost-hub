import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Phone,
  Grid3X3,
  MessageSquare,
  Hash,
  Wallet,
  Settings,
  Delete,
  ChevronDown,
  ArrowLeft,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  Check,
} from "lucide-react";
import { naira } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/rent-number")({
  head: () => ({
    meta: [
      { title: "Rent & Call — Vernex" },
      { name: "description", content: "Rent long-term Non-VoIP numbers with a native dialer: calls, keypad, messages, credit and settings." },
      { property: "og:title", content: "Vernex — Rent & Call" },
      { property: "og:description", content: "Telnyx-powered persistent numbers with inbound/outbound calls and SMS." },
    ],
  }),
  component: RentNumber,
});

type TabId = "calls" | "keypad" | "messages" | "numbers" | "credit" | "settings";

const tabs: { id: TabId; label: string; icon: typeof Phone }[] = [
  { id: "calls", label: "Calls", icon: Phone },
  { id: "keypad", label: "Keypad", icon: Grid3X3 },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "numbers", label: "Numbers", icon: Hash },
  { id: "credit", label: "Credit", icon: Wallet },
  { id: "settings", label: "Settings", icon: Settings },
];

const countries = [
  { flag: "🇳🇬", name: "Nigeria", dial: "+234" },
  { flag: "🇺🇸", name: "United States", dial: "+1" },
  { flag: "🇬🇧", name: "United Kingdom", dial: "+44" },
  { flag: "🇨🇦", name: "Canada", dial: "+1" },
  { flag: "🇩🇪", name: "Germany", dial: "+49" },
  { flag: "🇮🇩", name: "Indonesia", dial: "+62" },
];

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const keyLetters: Record<string, string> = {
  "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL",
  "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ", "0": "+",
};

const callLog = [
  { id: 1, name: "+1 341 802 7714", when: "Today, 4:12 PM", dir: "in" as const, dur: "2m 14s" },
  { id: 2, name: "+44 7700 900021", when: "Today, 1:03 PM", dir: "out" as const, dur: "48s" },
  { id: 3, name: "+1 725 555 0198", when: "Yesterday", dir: "missed" as const, dur: "—" },
];

const messages = [
  { id: 1, from: "WhatsApp", body: "Your code is 483-921", when: "4:10 PM" },
  { id: 2, from: "+1 341 802 7714", body: "Package delivered to your address.", when: "1:52 PM" },
  { id: 3, from: "Telegram", body: "Login code: 55219", when: "Yesterday" },
];

const rentedNumbers = [
  { id: 1, flag: "🇺🇸", number: "+1 341 802 7714", plan: "Monthly", renews: "12 Aug", price: 22500 },
  { id: 2, flag: "🇬🇧", number: "+44 7700 900021", plan: "Weekly", renews: "3 Aug", price: 8500 },
];

const durations = [
  { label: "1 Week", mult: 5.5 },
  { label: "1 Month", mult: 18 },
  { label: "1 Year", mult: 180 },
];

function FlagPicker({
  value,
  onChange,
}: {
  value: (typeof countries)[number];
  onChange: (c: (typeof countries)[number]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Select country"
        className="flex items-center gap-1 rounded-2xl border border-border bg-surface px-2.5 py-2"
      >
        <span className="text-xl leading-none">{value.flag}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <ul className="absolute left-0 top-[calc(100%+6px)] z-20 max-h-64 w-52 overflow-auto rounded-2xl border border-border bg-surface p-1 shadow-card-elev">
          {countries.map((c) => (
            <li key={c.name}>
              <button
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.dial}</span>
                {c.name === value.name && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RentNumber() {
  const [tab, setTab] = useState<TabId>("keypad");
  const [country, setCountry] = useState(countries[0]);
  const [digits, setDigits] = useState("");
  const [duration, setDuration] = useState(durations[1]);

  const base = 2500;
  const rentTotal = Math.ceil(base * duration.mult);

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link
          to="/dashboard"
          aria-label="Back to dashboard"
          className="grid h-9 w-9 place-items-center rounded-2xl border border-border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">Rent &amp; Call</p>
          <p className="truncate text-[11px] text-muted-foreground">Non-VoIP numbers · Telnyx</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22C55E]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#22C55E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> Live
        </span>
      </header>

      {/* Body */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {tab === "keypad" && (
          <div className="flex min-h-full flex-col px-5 pt-4">
            <div className="flex items-center gap-2">
              <FlagPicker value={country} onChange={setCountry} />
              <div className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="truncate text-2xl font-black tabular-nums">
                  {country.dial} {digits || <span className="text-muted-foreground">…</span>}
                </p>
              </div>
              <button
                onClick={() => setDigits((d) => d.slice(0, -1))}
                aria-label="Delete digit"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border"
              >
                <Delete className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid flex-1 grid-cols-3 content-center gap-2.5">
              {keys.map((k) => (
                <button
                  key={k}
                  onClick={() => setDigits((d) => d + k)}
                  className="flex aspect-[5/3] flex-col items-center justify-center rounded-2xl border border-border bg-surface transition active:scale-95 active:bg-accent"
                >
                  <span className="text-2xl font-black leading-none">{k}</span>
                  {keyLetters[k] && (
                    <span className="mt-0.5 text-[9px] font-semibold tracking-[0.18em] text-muted-foreground">
                      {keyLetters[k]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                digits
                  ? toast.success(`Calling ${country.dial} ${digits}…`)
                  : toast.error("Enter a number first")
              }
              className="my-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16C784] py-4 text-sm font-bold text-white shadow-[0_12px_28px_-12px_rgba(22,199,132,0.8)]"
            >
              <Phone className="h-4 w-4" /> Call
            </button>
          </div>
        )}

        {tab === "calls" && (
          <ul className="space-y-2 px-5 py-4">
            {callLog.map((c) => {
              const Icon =
                c.dir === "in" ? PhoneIncoming : c.dir === "out" ? PhoneOutgoing : PhoneMissed;
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card-elev"
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-2xl ${
                      c.dir === "missed" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold tabular-nums">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.when}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">{c.dur}</span>
                </li>
              );
            })}
          </ul>
        )}

        {tab === "messages" && (
          <ul className="space-y-2 px-5 py-4">
            {messages.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold">{m.from}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{m.when}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === "numbers" && (
          <div className="space-y-4 px-5 py-4">
            <ul className="space-y-2">
              {rentedNumbers.map((n) => (
                <li
                  key={n.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card-elev"
                >
                  <span className="text-2xl leading-none">{n.flag}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold tabular-nums">{n.number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {n.plan} · renews {n.renews}
                    </p>
                  </div>
                  <span className="text-sm font-black tabular-nums">{naira(n.price)}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Rent a new number
              </p>
              <div className="mt-3 flex items-center gap-2">
                <FlagPicker value={country} onChange={setCountry} />
                <span className="text-sm font-semibold">{country.name}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {durations.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => setDuration(d)}
                    className={`rounded-2xl border py-3 text-sm font-bold ${
                      duration.label === d.label
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-3xl font-black tabular-nums">{naira(rentTotal)}</p>
              <p className="text-[11px] text-muted-foreground">
                Unlimited inbound SMS &amp; calls for the rental period
              </p>
              <button
                onClick={() => toast.success(`Rental confirmed: ${country.name} for ${duration.label}`)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16C784] py-3.5 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" /> Rent Now
              </button>
            </div>
          </div>
        )}

        {tab === "credit" && (
          <div className="space-y-4 px-5 py-4">
            <div className="relative overflow-hidden rounded-2xl bg-[#0F172A] p-5 text-white shadow-wallet">
              <div className="absolute inset-0 dotted-bg opacity-40" />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  Call credit
                </p>
                <p className="mt-2 text-3xl font-black tabular-nums">₦1,240.00</p>
                <p className="mt-1 text-[11px] text-white/60">≈ 62 mins to 🇺🇸 · 41 mins to 🇬🇧</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1000, 2500, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => toast.success(`${naira(v)} credit top-up started`)}
                  className="rounded-2xl border border-border bg-surface py-3 text-sm font-bold shadow-card-elev"
                >
                  {naira(v)}
                </button>
              ))}
            </div>
            <Link
              to="/fund"
              className="block rounded-2xl bg-[#16C784] py-3.5 text-center text-sm font-bold text-white"
            >
              Fund from wallet
            </Link>
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-2 px-5 py-4">
            {[
              "Caller ID",
              "Auto-renew rentals",
              "SMS forwarding to email",
              "Voicemail transcription",
              "Blocked numbers",
            ].map((s) => (
              <button
                key={s}
                onClick={() => toast.success(`${s} updated`)}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface p-4 text-left text-sm font-semibold shadow-card-elev"
              >
                {s}
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Sub navigation */}
      <nav
        aria-label="Rent and call sections"
        className="shrink-0 border-t border-border bg-surface pb-6 pt-2"
      >
        <ul className="grid grid-cols-6 px-1">
          {tabs.map((t) => {
            const active = t.id === tab;
            const Icon = t.icon;
            return (
              <li key={t.id} className="flex">
                <button
                  onClick={() => setTab(t.id)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

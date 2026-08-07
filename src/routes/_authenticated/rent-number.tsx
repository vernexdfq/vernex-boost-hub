import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Phone,
  Grid3X3,
  Hash,
  Wallet,
  Settings,
  Delete,
  ChevronRight,
  ArrowLeft,
  Search,
  Loader2,
  Globe,
  Plus,
  Clock,
  Users,
  Video,
  MessageSquare,
  PhoneCall,
} from "lucide-react";
import { naira } from "@/lib/pricing";
import { fetchAccount } from "@/lib/account";
import {
  listRentalCountries,
  listRentalNumbers,
  listMyRentals,
  createRental,
  type RentalCountry,
  type RentalNumber,
} from "@/lib/functions/rentals.functions";

export const Route = createFileRoute("/_authenticated/rent-number")({
  head: () => ({
    meta: [
      { title: "Rent Numbers — Vernex" },
      {
        name: "description",
        content:
          "Rent long-term Non-VoIP numbers. USA via SignalWire, worldwide via DIDWW.",
      },
      { property: "og:title", content: "Vernex — Rent Numbers" },
      {
        property: "og:description",
        content: "Call, message, and manage rented numbers from one clean dialer.",
      },
    ],
  }),
  component: RentNumberApp,
});

type TabId = "history" | "contacts" | "keypad" | "numbers" | "credit" | "settings";

const TABS: { id: TabId; label: string; icon: typeof Phone }[] = [
  { id: "history", label: "History", icon: Clock },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "keypad", label: "Keypad", icon: Grid3X3 },
  { id: "numbers", label: "Numbers", icon: Hash },
  { id: "credit", label: "Credit", icon: Wallet },
  { id: "settings", label: "Settings", icon: Settings },
];

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"] as const;
const KEY_LETTERS: Record<string, string> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
  "0": "+",
};

const PLANS = ["1 Week", "1 Month", "1 Year"] as const;
const PLAN_MULT: Record<string, number> = {
  "1 Week": 0.35,
  "1 Month": 1,
  "1 Year": 10,
};

function flagOf(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function providerLabel(countryCode: string, provider?: string) {
  const code = countryCode.toUpperCase();
  if (code === "US" || code === "USA" || provider === "signalwire") return "SignalWire";
  return "DIDWW";
}

/* ------------------------------------------------------------------ */
/* Country directory (Globe)                                           */
/* ------------------------------------------------------------------ */

function CountryDirectory({
  countries,
  loading,
  onSelect,
  onClose,
}: {
  countries: RentalCountry[];
  loading: boolean;
  onSelect: (c: RentalCountry) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter(
      (c) =>
        c.country_name.toLowerCase().includes(term) ||
        c.dial_code.includes(term) ||
        c.country_code.toLowerCase().includes(term),
    );
  }, [countries, q]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Choose country</h2>
          <p className="text-[11px] text-muted-foreground">
            USA · SignalWire · Other · DIDWW
          </p>
        </div>
      </div>

      <div className="border-b border-border px-4 py-3">
        <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search country or dial code"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="py-20 text-center text-sm text-muted-foreground">No countries found</p>
        )}
        <ul className="divide-y divide-border">
          {filtered.map((c) => (
            <li key={c.country_code}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/40"
              >
                <span className="text-xl leading-none">{flagOf(c.country_code)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {c.country_name}{" "}
                    <span className="font-normal text-muted-foreground">{c.dial_code}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.available} available · from {naira(c.from_price_ngn)}/mo ·{" "}
                    {providerLabel(c.country_code)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Number catalog for a country                                        */
/* ------------------------------------------------------------------ */

function NumberCatalog({
  country,
  onBack,
}: {
  country: RentalCountry;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const fetchNumbers = useServerFn(listRentalNumbers);
  const rentFn = useServerFn(createRental);
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("1 Month");
  const [picked, setPicked] = useState<RentalNumber | null>(null);

  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ["rental-numbers", country.country_code],
    queryFn: () => fetchNumbers({ data: { countryCode: country.country_code } }),
  });

  const rent = useMutation({
    mutationFn: async (numberId: string) =>
      rentFn({ data: { rentalNumberId: numberId, plan } }),
    onSuccess: () => {
      toast.success("Number rented");
      setPicked(null);
      queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["rental-numbers", country.country_code] });
      queryClient.invalidateQueries({ queryKey: ["rental-countries"] });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (err: Error) => toast.error(err.message || "Rental failed"),
  });

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">
            {flagOf(country.country_code)} {country.country_name}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {providerLabel(country.country_code)} · {country.dial_code}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border px-4 py-2">
        {PLANS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlan(p)}
            className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold ${
              plan === p
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && numbers.length === 0 && (
          <p className="py-20 text-center text-sm text-muted-foreground">
            No numbers available in this country right now.
          </p>
        )}
        <ul className="divide-y divide-border">
          {numbers.map((n) => {
            const price = Math.ceil(n.monthly_price_ngn * (PLAN_MULT[plan] ?? 1));
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setPicked(n)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {n.phone_number}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {n.carrier}
                      {n.region_name ? ` · ${n.region_name}` : ""}
                      {n.area_code ? ` · ${n.area_code}` : ""} ·{" "}
                      {providerLabel(n.country_code, n.provider)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{naira(price)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {picked && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center">
          <div className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 sm:rounded-2xl">
            <p className="font-mono text-lg font-bold tabular-nums">{picked.phone_number}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {picked.country_name} · {picked.carrier} ·{" "}
              {providerLabel(picked.country_code, picked.provider)} · {plan}
            </p>
            <p className="mt-3 text-2xl font-bold tabular-nums text-primary">
              {naira(Math.ceil(picked.monthly_price_ngn * (PLAN_MULT[plan] ?? 1)))}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="flex-1 rounded-lg border border-border py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rent.isPending}
                onClick={() => rent.mutate(picked.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {rent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Rent number
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab panels                                                          */
/* ------------------------------------------------------------------ */

function HistoryPanel() {
  const rows = [
    { id: 1, name: "Outgoing", number: "+1 (415) 555-0142", when: "Today, 2:14 PM", kind: "call" },
    { id: 2, name: "Missed", number: "+1 (212) 555-0198", when: "Yesterday", kind: "missed" },
    { id: 3, name: "SMS", number: "+44 7700 900123", when: "Mon", kind: "sms" },
  ];
  return (
    <div className="flex-1 overflow-y-auto">
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3.5">
            <span
              className={`grid h-10 w-10 place-items-center rounded-full ${
                r.kind === "missed"
                  ? "bg-destructive/10 text-destructive"
                  : r.kind === "sms"
                    ? "bg-sky-500/10 text-sky-600"
                    : "bg-primary/10 text-primary"
              }`}
            >
              {r.kind === "sms" ? (
                <MessageSquare className="h-4 w-4" />
              ) : (
                <PhoneCall className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="font-mono text-[12px] text-muted-foreground tabular-nums">
                {r.number}
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground">{r.when}</span>
          </li>
        ))}
      </ul>
      <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">
        Live call / SMS history appears here once your rented line is active.
      </p>
    </div>
  );
}

function ContactsPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Users className="h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-sm font-semibold">No contacts yet</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Contacts you call or message from your rented numbers will show up here.
      </p>
    </div>
  );
}

function KeypadPanel({
  digits,
  setDigits,
  dialPrefix,
}: {
  digits: string;
  setDigits: (v: string) => void;
  dialPrefix: string;
}) {
  function press(k: string) {
    if (digits.length >= 18) return;
    setDigits(digits + k);
  }

  function call() {
    if (!digits) {
      toast.message("Enter a number to call");
      return;
    }
    toast.message(`Calling ${dialPrefix}${digits}…`, {
      description: "Voice connects when your rental line is provisioned.",
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Outbound · {dialPrefix}
        </p>
        <p className="mt-2 min-h-[2.5rem] font-mono text-3xl font-semibold tracking-wide tabular-nums">
          {digits || "—"}
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3 px-6 pb-4">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className="flex h-16 flex-col items-center justify-center rounded-full border border-border bg-surface active:bg-muted"
          >
            <span className="text-xl font-semibold tabular-nums">{k}</span>
            {KEY_LETTERS[k] && (
              <span className="text-[9px] font-medium tracking-widest text-muted-foreground">
                {KEY_LETTERS[k]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-xs items-center justify-between px-10 pb-6">
        <button
          type="button"
          onClick={() =>
            toast.message("Video", {
              description: "Video sessions attach to your active rented line.",
            })
          }
          className="grid h-12 w-12 place-items-center rounded-full border border-border text-muted-foreground"
          aria-label="Video"
        >
          <Video className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={call}
          className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground"
          aria-label="Call"
        >
          <Phone className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => setDigits(digits.slice(0, -1))}
          className="grid h-12 w-12 place-items-center rounded-full border border-border text-muted-foreground"
          aria-label="Delete"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function NumbersPanel({
  onBrowse,
}: {
  onBrowse: () => void;
}) {
  const fetchMine = useServerFn(listMyRentals);
  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["my-rentals"],
    queryFn: () => fetchMine({ data: undefined }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Hash className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">No rented numbers</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Open the globe to browse USA (SignalWire) and global (DIDWW) inventory.
        </p>
        <button
          type="button"
          onClick={onBrowse}
          className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Browse numbers
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <ul className="divide-y divide-border">
        {rentals.map((r) => {
          const n = r.rental_numbers as RentalNumber | null;
          return (
            <li key={r.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    {n?.phone_number ?? "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {n?.country_name} · {n?.carrier}
                    {n ? ` · ${providerLabel(n.country_code, n.provider)}` : ""}
                  </p>
                </div>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {r.status}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>
                  {r.plan} · renews {formatDate(r.renews_at)}
                </span>
                <span className="font-semibold text-foreground">
                  {naira(Number(r.amount_paid))}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CreditPanel() {
  const { user } = Route.useRouteContext();
  const { data: account } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
  });
  const balance = account?.wallet?.balance ?? 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Available credit
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
          {naira(Math.round(balance))}
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Credit is shared with your Vernex wallet. Rentals and outbound usage draw from this
          balance.
        </p>
        <Link
          to="/fund"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Add credit
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold">How billing works</p>
        <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
          <li>· USA numbers provisioned on SignalWire</li>
          <li>· Other countries provisioned on DIDWW</li>
          <li>· Plans: 1 Week · 1 Month · 1 Year</li>
        </ul>
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="flex-1 overflow-y-auto">
      <ul className="divide-y divide-border">
        {[
          { t: "Default outbound region", d: "+1 United States" },
          { t: "Caller ID", d: "Use active rented number" },
          { t: "Call recording", d: "Off" },
          { t: "Video sessions", d: "Available on active lines" },
          { t: "Notifications", d: "SMS & missed calls" },
        ].map((row) => (
          <li key={row.t} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold">{row.t}</p>
              <p className="text-[12px] text-muted-foreground">{row.d}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

function RentNumberApp() {
  const [tab, setTab] = useState<TabId>("keypad");
  const [digits, setDigits] = useState("");
  const [showGlobe, setShowGlobe] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<RentalCountry | null>(null);

  const fetchCountries = useServerFn(listRentalCountries);
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ["rental-countries"],
    queryFn: () => fetchCountries({ data: undefined }),
  });

  // Keypad always defaults to +1 (USA)
  const dialPrefix = selectedCountry?.dial_code ?? "+1";

  const title =
    tab === "history"
      ? "History"
      : tab === "contacts"
        ? "Contacts"
        : tab === "keypad"
          ? "Keypad"
          : tab === "numbers"
            ? "Numbers"
            : tab === "credit"
              ? "Credit"
              : "Settings";

  if (showGlobe && !selectedCountry) {
    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col bg-background">
        <CountryDirectory
          countries={countries}
          loading={countriesLoading}
          onSelect={(c) => setSelectedCountry(c)}
          onClose={() => setShowGlobe(false)}
        />
      </div>
    );
  }

  if (selectedCountry) {
    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col bg-background">
        <NumberCatalog
          country={selectedCountry}
          onBack={() => {
            setSelectedCountry(null);
            setShowGlobe(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3">
        <Link
          to="/dashboard"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold">
          {tab === "keypad" ? "Rent Numbers" : title}
        </h1>
        <button
          type="button"
          onClick={() => setShowGlobe(true)}
          aria-label="Browse countries"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border"
        >
          <Globe className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTab("credit")}
          aria-label="Credit"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "history" && <HistoryPanel />}
        {tab === "contacts" && <ContactsPanel />}
        {tab === "keypad" && (
          <KeypadPanel digits={digits} setDigits={setDigits} dialPrefix={dialPrefix} />
        )}
        {tab === "numbers" && <NumbersPanel onBrowse={() => setShowGlobe(true)} />}
        {tab === "credit" && <CreditPanel />}
        {tab === "settings" && <SettingsPanel />}
      </div>

      {/* Bottom nav */}
      <nav className="shrink-0 border-t border-border bg-surface pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1">
        <ul className="mx-auto grid max-w-md grid-cols-6 px-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="flex w-full flex-col items-center gap-0.5 py-1.5"
                >
                  <Icon
                    className={`h-[20px] w-[20px] ${active ? "text-primary" : "text-muted-foreground"}`}
                    strokeWidth={active ? 2.35 : 1.9}
                  />
                  <span
                    className={`text-[9px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {t.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

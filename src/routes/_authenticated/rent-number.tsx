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
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Search,
  Loader2,
  Globe,
  BadgeCheck,
  CalendarClock,
} from "lucide-react";
import { naira } from "@/lib/pricing";
import {
  listRentalCountries,
  listRentalNumbers,
  listMyRentals,
  createRental,
  type RentalCountry,
} from "@/lib/functions/rentals.functions";

export const Route = createFileRoute("/_authenticated/rent-number")({
  head: () => ({
    meta: [
      { title: "Rent a Number — Vernex" },
      {
        name: "description",
        content:
          "Rent long-term Non-VoIP numbers by country, carrier, state and area code. Live inventory with expiry dates and instant activation.",
      },
      { property: "og:title", content: "Vernex — Rent a Number" },
      {
        property: "og:description",
        content: "Browse live rental inventory across Austria, Canada, Israel, the UK and the US.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RentNumber,
});

type TabId = "browse" | "numbers" | "keypad" | "credit" | "settings";

const tabs: { id: TabId; label: string; icon: typeof Phone }[] = [
  { id: "browse", label: "Browse", icon: Globe },
  { id: "numbers", label: "My Nos.", icon: Hash },
  { id: "keypad", label: "Keypad", icon: Grid3X3 },
  { id: "credit", label: "Credit", icon: Wallet },
  { id: "settings", label: "Settings", icon: Settings },
];

const plans = ["1 Week", "1 Month", "1 Year"] as const;
const planMultiplier: Record<string, number> = { "1 Week": 0.35, "1 Month": 1, "1 Year": 10 };

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

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const keyLetters: Record<string, string> = {
  "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL",
  "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ", "0": "+",
};

function CountryPicker({
  countries,
  loading,
  onSelect,
}: {
  countries: RentalCountry[];
  loading: boolean;
  onSelect: (c: RentalCountry) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter(
      (c) =>
        c.country_name.toLowerCase().includes(term) ||
        c.dial_code.includes(term) ||
        c.carriers.some((x) => x.toLowerCase().includes(term)),
    );
  }, [countries, q]);

  return (
    <div className="space-y-3 px-5 py-4">
      <label className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search country, code or carrier"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">No countries match that search.</p>
      )}

      <ul className="space-y-2">
        {filtered.map((c) => (
          <li key={c.country_code}>
            <button
              onClick={() => onSelect(c)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-card-elev transition active:scale-[0.99]"
            >
              <span className="text-2xl leading-none">{flagOf(c.country_code)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {c.country_name} <span className="text-muted-foreground">{c.dial_code}</span>
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.available} available · {c.carriers.slice(0, 3).join(", ")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black tabular-nums">{naira(c.from_price_ngn)}</p>
                <p className="text-[10px] text-muted-foreground">from / month</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NumberCatalog({
  country,
  onBack,
}: {
  country: RentalCountry;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [carrier, setCarrier] = useState<string | null>(null);
  const [numberType, setNumberType] = useState<"mobile" | "business" | null>(null);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<(typeof plans)[number]>("1 Month");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchNumbers = useServerFn(listRentalNumbers);
  const rent = useServerFn(createRental);

  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ["rental-numbers", country.country_code, carrier, numberType, search],
    queryFn: () =>
      fetchNumbers({
        data: {
          countryCode: country.country_code,
          ...(carrier ? { carrier } : {}),
          ...(numberType ? { numberType } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      }),
  });

  const mutation = useMutation({
    mutationFn: (rentalNumberId: string) => rent({ data: { rentalNumberId, plan } }),
    onSuccess: () => {
      toast.success(`Number rented for ${plan}`);
      queryClient.invalidateQueries({ queryKey: ["rental-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setPendingId(null),
  });

  const regional = country.regions.length > 0;

  return (
    <div className="space-y-3 px-5 py-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All countries
      </button>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
        <span className="text-2xl leading-none">{flagOf(country.country_code)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {country.country_name} <span className="text-muted-foreground">{country.dial_code}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">{country.available} numbers in stock</p>
        </div>
      </div>

      {regional && (
        <label className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by state or area code (e.g. Florida, 424)"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
      )}

      {regional && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {country.regions.map((r) => (
            <button
              key={r}
              onClick={() => setSearch(search === r ? "" : r)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                search === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[null, ...country.carriers].map((c) => (
          <button
            key={c ?? "all"}
            onClick={() => setCarrier(c)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              carrier === c ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"
            }`}
          >
            {c ?? "All carriers"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {([null, "mobile", "business"] as const).map((t) => (
          <button
            key={t ?? "any"}
            onClick={() => setNumberType(t)}
            className={`rounded-2xl border py-2.5 text-[12px] font-bold capitalize ${
              numberType === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"
            }`}
          >
            {t ?? "All types"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-3 shadow-card-elev">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Rental period
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {plans.map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={`rounded-2xl border py-2.5 text-[12px] font-bold ${
                plan === p ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-14 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {!isLoading && numbers.length === 0 && (
        <p className="py-14 text-center text-sm text-muted-foreground">
          No numbers match these filters. Try another state, area code or carrier.
        </p>
      )}

      <ul className="space-y-2">
        {numbers.map((n) => {
          const price = Math.ceil(n.monthly_price_ngn * (planMultiplier[plan] ?? 1));
          const busy = mutation.isPending && pendingId === n.id;
          return (
            <li key={n.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">{flagOf(n.country_code)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black tabular-nums">{n.phone_number}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {n.carrier}
                    {n.region_name ? ` · ${n.region_name}` : ""}
                    {n.area_code ? ` · area ${n.area_code}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    n.number_type === "business"
                      ? "bg-[#0F172A]/10 text-[#0F172A]"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {n.number_type}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" /> Expires {formatDate(n.expires_at)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5" /> {n.provider}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-black tabular-nums">{naira(price)}</p>
                  <p className="text-[10px] text-muted-foreground">{plan} · all inbound SMS &amp; calls</p>
                </div>
                <button
                  onClick={() => {
                    setPendingId(n.id);
                    mutation.mutate(n.id);
                  }}
                  disabled={mutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Rent
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MyRentals() {
  const fetchRentals = useServerFn(listMyRentals);
  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["my-rentals"],
    queryFn: () => fetchRentals(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <p className="px-5 py-16 text-center text-sm text-muted-foreground">
        You have no rented numbers yet. Browse the catalog to rent one.
      </p>
    );
  }

  return (
    <ul className="space-y-2 px-5 py-4">
      {rentals.map((r) => {
        const n = r.rental_numbers;
        return (
          <li key={r.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black tabular-nums">{n?.phone_number}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {n?.country_name} · {n?.carrier}
                  {n?.region_name ? ` · ${n.region_name}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {r.status}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {r.plan} · renews {formatDate(r.renews_at)}
              </span>
              <span className="font-bold text-foreground">{naira(Number(r.amount_paid))}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RentNumber() {
  const [tab, setTab] = useState<TabId>("browse");
  const [selected, setSelected] = useState<RentalCountry | null>(null);
  const [digits, setDigits] = useState("");

  const fetchCountries = useServerFn(listRentalCountries);
  const { data: countries = [], isLoading } = useQuery({
    queryKey: ["rental-countries"],
    queryFn: () => fetchCountries(),
  });

  const dial = selected?.dial_code ?? "+1";

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link
          to="/dashboard"
          aria-label="Back to dashboard"
          className="grid h-9 w-9 place-items-center rounded-2xl border border-border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold">Rent a Number</h1>
          <p className="truncate text-[11px] text-muted-foreground">Non-VoIP · long-term rentals</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22C55E]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#22C55E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> Live
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {tab === "browse" &&
          (selected ? (
            <NumberCatalog country={selected} onBack={() => setSelected(null)} />
          ) : (
            <CountryPicker countries={countries} loading={isLoading} onSelect={setSelected} />
          ))}

        {tab === "numbers" && <MyRentals />}

        {tab === "keypad" && (
          <div className="flex min-h-full flex-col px-5 pt-4">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="truncate text-2xl font-black tabular-nums">
                  {dial} {digits || <span className="text-muted-foreground">…</span>}
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
                digits ? toast.success(`Calling ${dial} ${digits}…`) : toast.error("Enter a number first")
              }
              className="my-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground"
            >
              <Phone className="h-4 w-4" /> Call
            </button>
          </div>
        )}

        {tab === "credit" && (
          <div className="space-y-4 px-5 py-4">
            <div className="relative overflow-hidden rounded-2xl bg-[#0F172A] p-5 text-white shadow-wallet">
              <div className="absolute inset-0 dotted-bg opacity-40" />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  Rental billing
                </p>
                <p className="mt-2 text-3xl font-black">Wallet-funded</p>
                <p className="mt-1 text-[11px] text-white/60">
                  Rentals are debited from your Vernex wallet at checkout.
                </p>
              </div>
            </div>
            <Link
              to="/fund"
              className="block rounded-2xl bg-primary py-3.5 text-center text-sm font-bold text-primary-foreground"
            >
              Fund wallet
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

      <nav aria-label="Rent sections" className="shrink-0 border-t border-border bg-surface pb-6 pt-2">
        <ul className="grid grid-cols-5 px-1">
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

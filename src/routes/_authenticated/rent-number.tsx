import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Phone,
  Grid3X3,
  Hash,
  Settings,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Search,
  Loader2,
  Globe,
  Plus,
  Clock,
  Users,
  Video,
  Delete,
  X,
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
import { VernexMark } from "@/components/brand";

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
    ],
  }),
  component: RentNumberApp,
});

type TabId = "history" | "contacts" | "keypad" | "numbers" | "settings";

const TABS: { id: TabId; label: string; icon: typeof Phone }[] = [
  { id: "history", label: "History", icon: Clock },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "keypad", label: "Keypad", icon: Grid3X3 },
  { id: "numbers", label: "Numbers", icon: Hash },
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
  "1 Week": 1,
  "1 Month": 3.5,
  "1 Year": 30,
};

function flagOf(code: string) {
  const c = code.toUpperCase();
  if (c.length !== 2) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function providerLabel(countryCode: string, provider?: string) {
  if (provider) return provider;
  return countryCode.toUpperCase() === "US" ? "SignalWire" : "DIDWW";
}

type CallerId = {
  id: string;
  flag: string;
  label: string;
  number: string;
  badge: "Rented" | "Active Outbound";
};

function CountryDirectory({
  countries,
  loading,
  onPick,
  onClose,
}: {
  countries: RentalCountry[];
  loading: boolean;
  onPick: (c: RentalCountry) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.country_code.toLowerCase().includes(term) ||
        c.dial_code.includes(term),
    );
  }, [countries, q]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/80 backdrop-blur-md sm:items-center sm:justify-center sm:p-4">
      <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-900 shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h3 className="text-base font-bold text-white">Select Country</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-slate-800/60 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country or code..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-4 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="space-y-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">No countries match.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.country_code}
                type="button"
                onClick={() => onPick(c)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-800/50"
              >
                <span className="text-lg">{flagOf(c.country_code)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-slate-400">
                    {c.dial_code} · {providerLabel(c.country_code, c.provider)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            ))
          )}
        </div>
      </div>
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
  const { user } = Route.useRouteContext();
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("1 Month");
  const [picked, setPicked] = useState<RentalNumber | null>(null);
  const listFn = useServerFn(listRentalNumbers);
  const rentFn = useServerFn(createRental);

  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ["rental-numbers", country.country_code],
    queryFn: () => listFn({ data: { country_code: country.country_code } }),
  });

  const rent = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error("Pick a number");
      return rentFn({
        data: {
          number_id: picked.id,
          country_code: country.country_code,
          plan,
        },
      });
    },
    onSuccess: () => {
      toast.success("Number rented");
      queryClient.invalidateQueries({ queryKey: ["my-rentals", user.id] });
      queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      setPicked(null);
      onBack();
    },
    onError: (e: Error) => toast.error(e.message || "Rental failed"),
  });

  const price = picked
    ? Math.ceil(Number(picked.price_ngn || picked.monthly_price_ngn || 0) * PLAN_MULT[plan])
    : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-950 text-slate-100">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <button type="button" onClick={onBack} className="text-emerald-400">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {flagOf(country.country_code)} {country.name}
          </p>
          <p className="text-[11px] text-slate-400">
            {providerLabel(country.country_code)} · {country.dial_code}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          </div>
        ) : numbers.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No numbers available right now.</p>
        ) : (
          <ul className="space-y-2">
            {numbers.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setPicked(n)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${
                    picked?.id === n.id
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <p className="font-mono text-sm font-semibold tabular-nums">{n.phone_number}</p>
                  <span className="text-sm font-bold text-emerald-400">
                    {naira(Math.round(Number(n.price_ngn || n.monthly_price_ngn || 0)))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {picked && (
        <div className="border-t border-slate-800 bg-slate-900 p-4">
          <p className="font-mono text-lg font-bold tabular-nums">{picked.phone_number}</p>
          <div className="mt-3 flex gap-2">
            {PLANS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  plan === p
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-slate-700 text-slate-300"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-emerald-400">{naira(price)}</p>
          <button
            type="button"
            disabled={rent.isPending}
            onClick={() => rent.mutate()}
            className="mt-3 w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {rent.isPending ? "Processing…" : "Rent this number"}
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryPanel() {
  const { user } = Route.useRouteContext();
  const listFn = useServerFn(listMyRentals);
  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["my-rentals", user.id],
    queryFn: () => listFn({ data: undefined }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Clock className="h-10 w-10 text-slate-600" />
        <p className="mt-3 text-sm font-semibold text-white">No call history</p>
        <p className="mt-1 text-[13px] text-slate-400">
          Outbound calls from your rented lines will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 overflow-y-auto px-4 py-4">
      {rentals.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-white">{r.phone_number || r.number}</p>
            <p className="font-mono text-[12px] text-slate-400 tabular-nums">
              {formatDate(r.created_at || r.starts_at || "")}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400">{r.status || "active"}</span>
        </li>
      ))}
    </ul>
  );
}

function ContactsPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Users className="h-10 w-10 text-slate-600" />
      <p className="mt-3 text-sm font-semibold text-white">No contacts yet</p>
      <p className="mt-1 text-[13px] text-slate-400">
        Contacts you call or message from your rented numbers will show up here.
      </p>
    </div>
  );
}

function KeypadPanel({
  digits,
  setDigits,
  dialPrefix,
  setDialPrefix,
  setShowCountry,
  callerIds,
  activeCaller,
  setActiveCaller,
}: {
  digits: string;
  setDigits: (v: string) => void;
  dialPrefix: string;
  setDialPrefix: (v: string) => void;
  setShowCountry: (v: boolean) => void;
  callerIds: CallerId[];
  activeCaller: CallerId;
  setActiveCaller: (c: CallerId) => void;
}) {
  const [showCallerMenu, setShowCallerMenu] = useState(false);

  function press(k: string) {
    if (digits.length >= 18) return;
    setDigits(digits + k);
  }

  function backspace() {
    setDigits(digits.slice(0, -1));
  }

  function call() {
    if (!digits) {
      toast.message("Enter a number to call");
      return;
    }
    toast.message(`Calling ${dialPrefix}${digits}…`, {
      description: `From ${activeCaller.label} (${activeCaller.number})`,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4">
      {/* Active Caller ID */}
      <div className="relative mb-4">
        <button
          type="button"
          onClick={() => setShowCallerMenu((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-md transition hover:border-slate-700"
        >
          <div className="flex items-center space-x-3 text-left">
            <span className="text-xl">{activeCaller.flag}</span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Active Caller ID
              </p>
              <p className="text-sm font-bold text-white">
                {activeCaller.label}{" "}
                <span className="ml-1 font-mono text-xs font-normal text-slate-400">
                  {activeCaller.number}
                </span>
              </p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-slate-400" />
        </button>

        {showCallerMenu && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between bg-slate-950/50 p-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Select Outbound Number</span>
              <button type="button" onClick={() => setShowCallerMenu(false)} className="hover:text-white">
                ×
              </button>
            </div>
            <div className="max-h-60 divide-y divide-slate-800/80 overflow-y-auto">
              {callerIds.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveCaller(c);
                    setShowCallerMenu(false);
                  }}
                  className="flex w-full items-center justify-between p-3 text-left transition hover:bg-slate-800/50"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{c.flag}</span>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {c.label}{" "}
                        <span
                          className={`ml-1 rounded px-1.5 py-0.5 text-[10px] ${
                            c.badge === "Rented"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-sky-500/20 text-sky-400"
                          }`}
                        >
                          {c.badge}
                        </span>
                      </p>
                      <p className="font-mono text-xs text-slate-400">{c.number}</p>
                    </div>
                  </div>
                  {activeCaller.id === c.id && (
                    <span className="text-sm font-bold text-emerald-500">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialer card */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-center space-x-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowCountry(true)}
            className="flex items-center space-x-1.5 rounded-xl bg-slate-800 px-2.5 py-1.5 text-sm transition hover:bg-slate-700"
          >
            <span className="text-lg">
              {dialPrefix === "+1" ? "🇺🇸" : dialPrefix === "+44" ? "🇬🇧" : dialPrefix === "+234" ? "🇳🇬" : "🌍"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          <div className="flex-1 text-center font-mono text-2xl font-semibold tracking-wider text-white">
            {dialPrefix}
            {digits}
          </div>
          <button
            type="button"
            onClick={backspace}
            className="p-1 text-slate-400 hover:text-white"
            aria-label="Backspace"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className="flex flex-col items-center justify-center rounded-2xl bg-slate-800/80 py-3.5 shadow-inner transition hover:bg-slate-700 active:scale-95"
            >
              <span className="font-mono text-xl font-bold text-white">{k}</span>
              {KEY_LETTERS[k] && (
                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                  {KEY_LETTERS[k]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-around px-4">
          <button
            type="button"
            onClick={() =>
              toast.message("Video", {
                description: "Video sessions attach to your active rented line.",
              })
            }
            className="rounded-full bg-slate-800 p-3.5 text-slate-300 transition hover:bg-slate-700"
            aria-label="Video"
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={call}
            className="rounded-full bg-emerald-500 p-4 text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-95"
            aria-label="Call"
          >
            <Phone className="h-7 w-7 fill-current" />
          </button>
          <button
            type="button"
            onClick={backspace}
            className="rounded-full bg-slate-800 p-3.5 text-slate-300 transition hover:bg-slate-700"
            aria-label="Delete"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NumbersPanel({ onBrowse }: { onBrowse: () => void }) {
  const { user } = Route.useRouteContext();
  const listFn = useServerFn(listMyRentals);
  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["my-rentals", user.id],
    queryFn: () => listFn({ data: undefined }),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-bold text-white">My numbers</p>
        <button
          type="button"
          onClick={onBrowse}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400"
        >
          <Plus className="h-3.5 w-3.5" /> Rent new
        </button>
      </div>
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        </div>
      ) : rentals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Hash className="h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm font-semibold text-white">No rented numbers</p>
          <p className="mt-1 text-[13px] text-slate-400">
            Browse countries and rent a USA (SignalWire) or global (DIDWW) line.
          </p>
          <button
            type="button"
            onClick={onBrowse}
            className="mt-4 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950"
          >
            Browse numbers
          </button>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto px-4 pb-4">
          {rentals.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3"
            >
              <p className="font-mono text-sm font-semibold tabular-nums text-white">
                {r.phone_number || r.number}
              </p>
              <p className="mt-0.5 text-[12px] text-slate-400">
                {r.status || "active"} · expires {formatDate(r.ends_at || r.expires_at || "")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-3 overflow-y-auto px-4 py-4">
      {[
        ["Default region", "USA (+1)"],
        ["Voice provider (US)", "SignalWire"],
        ["Voice provider (Global)", "DIDWW"],
        ["Caller ID", "Active rented line"],
      ].map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-3"
        >
          <span className="text-sm text-slate-300">{label}</span>
          <span className="text-sm font-semibold text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

function RentNumberApp() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<TabId>("keypad");
  const [digits, setDigits] = useState("");
  const [dialPrefix, setDialPrefix] = useState("+1");
  const [showGlobe, setShowGlobe] = useState(false);
  const [catalogCountry, setCatalogCountry] = useState<RentalCountry | null>(null);

  const listCountries = useServerFn(listRentalCountries);
  const listRentals = useServerFn(listMyRentals);

  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ["rental-countries"],
    queryFn: () => listCountries({ data: undefined }),
  });

  const { data: rentals = [] } = useQuery({
    queryKey: ["my-rentals", user.id],
    queryFn: () => listRentals({ data: undefined }),
  });

  const callerIds: CallerId[] = useMemo(() => {
    const fromRentals: CallerId[] = rentals.map((r, i) => ({
      id: r.id || `r-${i}`,
      flag: flagOf((r.country_code as string) || "US"),
      label: r.label || r.friendly_name || "Rented line",
      number: r.phone_number || r.number || "",
      badge: "Rented" as const,
    }));
    return [
      ...fromRentals,
      {
        id: "sim",
        flag: "🇳🇬",
        label: "SIM Number",
        number: "+234 —",
        badge: "Active Outbound" as const,
      },
    ];
  }, [rentals]);

  const [activeCaller, setActiveCaller] = useState<CallerId>(callerIds[0]);
  // keep activeCaller in sync when list loads
  const effectiveCaller =
    callerIds.find((c) => c.id === activeCaller.id) || callerIds[0] || {
      id: "default",
      flag: "🇺🇸",
      label: "Default",
      number: "+1",
      badge: "Active Outbound" as const,
    };

  const title =
    tab === "history"
      ? "History"
      : tab === "contacts"
        ? "Contacts"
        : tab === "keypad"
          ? "Rent Numbers"
          : tab === "numbers"
            ? "Numbers"
            : "Settings";

  if (catalogCountry) {
    return (
      <div className="flex h-[100dvh] flex-col bg-slate-950">
        <NumberCatalog country={catalogCountry} onBack={() => setCatalogCountry(null)} />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-900 bg-slate-950/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" aria-label="Back" className="text-slate-300 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <VernexMark className="h-7 w-7" />
          <span className="text-sm font-bold tracking-tight text-white">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGlobe(true)}
            aria-label="Browse countries"
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-800 text-slate-300"
          >
            <Globe className="h-4 w-4" />
          </button>
          <Link
            to="/fund"
            className="flex items-center space-x-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Credit</span>
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "history" && <HistoryPanel />}
        {tab === "contacts" && <ContactsPanel />}
        {tab === "keypad" && (
          <KeypadPanel
            digits={digits}
            setDigits={setDigits}
            dialPrefix={dialPrefix}
            setDialPrefix={setDialPrefix}
            setShowCountry={setShowGlobe}
            callerIds={callerIds}
            activeCaller={effectiveCaller}
            setActiveCaller={setActiveCaller}
          />
        )}
        {tab === "numbers" && <NumbersPanel onBrowse={() => setShowGlobe(true)} />}
        {tab === "settings" && <SettingsPanel />}
      </div>

      {/* Bottom nav — 5 items, Credit moved to header */}
      <nav className="z-40 shrink-0 border-t border-slate-900 bg-slate-950/95 pb-[max(env(safe-area-inset-bottom),0.35rem)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex w-full flex-col items-center justify-center py-1 transition ${
                  active ? "text-emerald-400" : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="mb-1 h-5 w-5" strokeWidth={active ? 2.35 : 1.9} />
                <span className="text-[10px] font-medium tracking-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showGlobe && (
        <CountryDirectory
          countries={countries}
          loading={countriesLoading}
          onClose={() => setShowGlobe(false)}
          onPick={(c) => {
            setDialPrefix(c.dial_code || "+1");
            setShowGlobe(false);
            if (tab === "keypad") {
              // selecting country for dial prefix only
            } else {
              setCatalogCountry(c);
            }
            // From globe always allow renting
            setCatalogCountry(c);
          }}
        />
      )}
    </div>
  );
}

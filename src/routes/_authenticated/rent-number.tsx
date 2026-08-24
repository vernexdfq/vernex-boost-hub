import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Phone, Grid3X3, Clock, Users, Plus, Filter, MoreVertical,
  PhoneOutgoing, PhoneMissed, User, Search, ChevronDown, X, Check,
  Delete, ArrowLeft, Loader2, Hash,
} from "lucide-react";
import { naira } from "@/lib/pricing";
import {
  listRentalCountries, listRentalNumbers, listMyRentals, createRental,
  type RentalCountry, type RentalNumber,
} from "@/lib/functions/rentals.functions";

export const Route = createFileRoute("/_authenticated/rent-number")({
  head: () => ({
    meta: [
      { title: "Calls — Vernex" },
      { name: "description", content: "Call from your rented lines. USA via SignalWire, worldwide via DIDWW." },
      { property: "og:title", content: "Vernex — Calls & Rentals" },
    ],
  }),
  component: RentNumberApp,
});

type SubTab = "history" | "contacts" | "keypad";
const KEYS = [
  { digit: "1", letters: "" }, { digit: "2", letters: "ABC" }, { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" }, { digit: "5", letters: "JKL" }, { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" }, { digit: "8", letters: "TUV" }, { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" }, { digit: "0", letters: "+" }, { digit: "#", letters: "" },
] as const;
const PLANS = ["1 Week", "1 Month", "1 Year"] as const;
const PLAN_MULT: Record<string, number> = { "1 Week": 0.35, "1 Month": 1, "1 Year": 10 };

function flagOf(code: string) {
  const c = code.toUpperCase();
  if (c.length !== 2) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}
function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return value;
  }
}

type OutboundLine = { id: string; label: string; number: string; flag: string; type: "rented" | "sim" };

function Avatar({ name, inactive }: { name?: string; inactive?: boolean }) {
  if (name) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[15px] font-semibold text-emerald-800">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${inactive ? "bg-pink-100" : "bg-indigo-50"}`}>
      <User size={20} className={inactive ? "text-pink-400" : "text-indigo-300"} strokeWidth={1.5} />
    </div>
  );
}

function NumberCatalog({ country, onBack }: { country: RentalCountry; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("1 Month");
  const [picked, setPicked] = useState<RentalNumber | null>(null);
  const listFn = useServerFn(listRentalNumbers);
  const rentFn = useServerFn(createRental);
  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ["rental-numbers", country.country_code],
    queryFn: () => listFn({ data: { countryCode: country.country_code } }),
  });
  const rent = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error("Pick a number");
      const result = await rentFn({ data: { rentalNumberId: picked.id, plan } });
      if (result && typeof result === "object" && "ok" in result && result.ok === false) {
        throw new Error((result as { error?: string }).error || "Rental failed");
      }
      return result;
    },
    onSuccess: (result) => {
      const phone =
        result && typeof result === "object" && "phoneNumber" in result
          ? String((result as { phoneNumber?: string }).phoneNumber || "")
          : "";
      toast.success(phone ? `Number rented: ${phone}` : "Number rented");
      queryClient.invalidateQueries({ queryKey: ["my-rentals", user.id] });
      queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      setPicked(null);
      onBack();
    },
    onError: (e: Error) => toast.error(e.message || "Rental failed"),
  });
  const price = picked ? Math.ceil(Number(picked.monthly_price_ngn || 0) * PLAN_MULT[plan]) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white text-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={onBack} className="text-slate-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {flagOf(country.country_code)} {country.country_name}
          </p>
          <p className="text-[11px] text-slate-500">
            {country.dial_code} · from {naira(Math.round(country.from_price_ngn || 0))}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          </div>
        ) : numbers.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No numbers available right now.</p>
        ) : (
          <ul className="space-y-2">
            {numbers.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setPicked(n)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-3.5 text-left ${
                    picked?.id === n.id ? "border-teal-600/40 bg-teal-50" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="font-mono text-[15px] font-semibold tabular-nums">{n.phone_number}</p>
                    {(n.region_name || n.area_code) && (
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {[n.region_name, n.area_code].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-teal-700">
                    {naira(Math.round(Number(n.monthly_price_ngn || 0)))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {picked && (
        <div className="border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="font-mono text-lg font-bold tabular-nums">{picked.phone_number}</p>
          <div className="mt-3 flex gap-2">
            {PLANS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  plan === p ? "bg-teal-700 text-white" : "border border-slate-200 text-slate-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-teal-700">{naira(price)}</p>
          <button
            type="button"
            disabled={rent.isPending}
            onClick={() => rent.mutate()}
            className="mt-3 w-full rounded-2xl bg-teal-700 py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {rent.isPending ? "Processing…" : "Rent this number"}
          </button>
        </div>
      )}
    </div>
  );
}

function RentNumberApp() {
  const { user } = Route.useRouteContext();
  const [subTab, setSubTab] = useState<SubTab>("history");
  const [showHint, setShowHint] = useState(true);
  const [dial, setDial] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [showFromSheet, setShowFromSheet] = useState(false);
  const [showCountrySheet, setShowCountrySheet] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [catalogCountry, setCatalogCountry] = useState<RentalCountry | null>(null);
  const [browseMode, setBrowseMode] = useState(false);

  const listCountries = useServerFn(listRentalCountries);
  const listRentals = useServerFn(listMyRentals);
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ["rental-countries"],
    queryFn: () => listCountries({ data: undefined }),
  });
  const { data: rentals = [], isLoading: rentalsLoading } = useQuery({
    queryKey: ["my-rentals", user.id],
    queryFn: () => listRentals({ data: undefined }),
  });

  const outboundLines: OutboundLine[] = useMemo(() => {
    const fromRentals: OutboundLine[] = (rentals as Array<Record<string, unknown>>).map((r, i) => {
      const nested = (r["rental_numbers"] as Record<string, unknown> | null) || {};
      const phone = String(nested["phone_number"] || r["phone_number"] || "");
      const cc = String(nested["country_code"] || nested["country_name"] || "US");
      const code = cc.length === 2 ? cc : "US";
      return {
        id: String(r["id"] || `r-${i}`),
        label: String(nested["country_name"] || "Rented line"),
        number: phone,
        flag: flagOf(code),
        type: "rented" as const,
      };
    });
    return [
      ...fromRentals,
      { id: "sim", label: "SIM Number", number: "+234 —", flag: "🇳🇬", type: "sim" as const },
    ];
  }, [rentals]);

  const [fromLineId, setFromLineId] = useState("");
  const fromLine =
    outboundLines.find((l) => l.id === fromLineId) ||
    outboundLines[0] || {
      id: "default",
      label: "Default",
      number: "+1",
      flag: "🇺🇸",
      type: "sim" as const,
    };
  const [dialCountry, setDialCountry] = useState({
    code: "US",
    name: "United States",
    dial: "+1",
    flag: "🇺🇸",
  });

  const filteredCountries = useMemo(() => {
    const term = countrySearch.trim().toLowerCase();
    const list = countries.map((c) => ({
      code: c.country_code,
      name: c.country_name,
      dial: c.dial_code || "",
      flag: flagOf(c.country_code),
      raw: c,
    }));
    if (!term) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.dial.includes(term) ||
        c.code.toLowerCase().includes(term),
    );
  }, [countries, countrySearch]);

  const recentRows = useMemo(() => {
    return (rentals as Array<Record<string, unknown>>).map((r) => {
      const nested = (r["rental_numbers"] as Record<string, unknown> | null) || {};
      const phone = String(nested["phone_number"] || r["phone_number"] || "—");
      const status = String(r["status"] || "active");
      const inactive = status !== "active";
      const country = String(nested["country_name"] || "");
      return {
        id: String(r["id"]),
        number: phone,
        inactive,
        label: inactive ? `Inactive number → ${country || "—"}` : `Rented · ${country || "—"}`,
        date: formatDate(String(r["created_at"] || "")),
        direction: inactive ? "missed" : "outbound",
      };
    });
  }, [rentals]);

  if (catalogCountry) {
    return (
      <div className="flex h-[100dvh] flex-col bg-white">
        <NumberCatalog country={catalogCountry} onBack={() => setCatalogCountry(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white pb-[120px] text-slate-900 antialiased">
      <header className="sticky top-0 z-40 bg-white">
        <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            aria-label="Back"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </Link>
          <h1 className="text-[17px] font-semibold text-slate-900">Calls</h1>
          <button
            type="button"
            onClick={() => {
              setBrowseMode(true);
              setShowCountrySheet(true);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            aria-label="Rent number"
          >
            <Plus size={24} className="text-teal-700" strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {subTab === "history" && (
          <>
            <h2 className="mb-2.5 mt-1 text-[15px] font-semibold text-slate-900">Favorites</h2>
            {showHint && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-[#E8F4FC] px-3.5 py-3.5">
                <span className="mt-0.5 text-lg leading-none text-[#3B82C4]">☆</span>
                <div className="flex-1 text-[13px] leading-snug text-[#1E5A8A]">
                  Adding contacts as favorite will make them appear here —{" "}
                  <button type="button" className="font-medium underline">learn more</button>
                </div>
                <button type="button" onClick={() => setShowHint(false)} className="px-0.5 text-base leading-none text-[#7BA3C4]">
                  ×
                </button>
              </div>
            )}
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-slate-900">Recents</h2>
              <div className="flex items-center gap-0.5">
                <button type="button" className="p-2 text-teal-700 active:opacity-60"><Filter size={18} /></button>
                <button type="button" className="p-2 text-teal-700 active:opacity-60"><MoreVertical size={18} /></button>
              </div>
            </div>
            {rentalsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
              </div>
            ) : recentRows.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <Clock className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-900">No call history</p>
                <p className="mt-1 text-[13px] text-slate-500">Rent a number with + then calls appear here.</p>
                <button
                  type="button"
                  onClick={() => {
                    setBrowseMode(true);
                    setShowCountrySheet(true);
                  }}
                  className="mt-4 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Rent a number
                </button>
              </div>
            ) : (
              <ul>
                {recentRows.map((c) => (
                  <li key={c.id} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 active:bg-slate-50">
                    <Avatar inactive={c.inactive} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[16px] font-medium leading-tight ${c.inactive ? "text-red-500" : "text-slate-900"}`}>
                        {c.number}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-slate-500">
                        {c.inactive ? (
                          <PhoneMissed size={13} className="text-red-500" />
                        ) : (
                          <PhoneOutgoing size={13} className="text-slate-400" />
                        )}
                        <span className="truncate">{c.label}</span>
                      </p>
                    </div>
                    <span className="mt-1 shrink-0 self-start text-[12px] text-slate-400">{c.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {subTab === "contacts" && (
          <>
            <div className="relative mb-4 mt-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts"
                className="h-10 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-3 text-[14px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
            {outboundLines.filter((l) => l.type === "rented").length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <Users className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-900">No contacts yet</p>
                <p className="mt-1 text-[13px] text-slate-500">Contacts from rented lines show up here.</p>
              </div>
            ) : (
              <ul>
                {outboundLines
                  .filter((l) => l.type === "rented")
                  .filter(
                    (c) =>
                      c.label.toLowerCase().includes(contactSearch.toLowerCase()) ||
                      c.number.replace(/\s/g, "").includes(contactSearch.replace(/\s/g, "")),
                  )
                  .map((c) => (
                    <li key={c.id} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 active:bg-slate-50">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[15px] font-semibold text-teal-800">
                        {c.label.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-medium text-slate-900">{c.label}</p>
                        <p className="truncate text-[13px] text-slate-500">{c.number}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFromLineId(c.id);
                          setSubTab("keypad");
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 active:bg-teal-100"
                      >
                        <Phone size={18} className="text-teal-700" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}

        {subTab === "keypad" && (
          <div className="flex flex-col items-center pt-2">
            <button
              type="button"
              onClick={() => setShowFromSheet(true)}
              className="mb-5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[14px] font-medium text-slate-800 active:bg-slate-50"
            >
              {fromLine.label}
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            <div className="mb-1 flex min-h-[40px] w-full items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setBrowseMode(false);
                  setShowCountrySheet(true);
                }}
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 active:bg-slate-50"
              >
                <span className="text-xl leading-none">{dialCountry.flag}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <p className="text-[28px] font-light tracking-wide text-slate-900 tabular-nums">
                {dial ? dial : dialCountry.dial}
              </p>
            </div>
            <div className="mt-5 grid w-full max-w-[300px] grid-cols-3 gap-x-5 gap-y-2.5">
              {KEYS.map(({ digit, letters }) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => setDial((d) => (d.length >= 18 ? d : d + digit))}
                  className="mx-auto flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
                >
                  <span className="text-[28px] font-medium leading-none text-slate-900">{digit}</span>
                  {letters ? (
                    <span className="mt-0.5 text-[9px] font-semibold tracking-widest text-slate-400">{letters}</span>
                  ) : digit === "0" ? (
                    <span className="mt-0.5 text-[9px] font-semibold text-slate-400">+</span>
                  ) : (
                    <span className="h-[11px]" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-6 flex w-full max-w-[300px] items-center justify-center gap-8">
              <div className="w-14" />
              <button
                type="button"
                onClick={() => {
                  if (!dial) {
                    toast.message("Enter a number to call");
                    return;
                  }
                  toast.message(`Calling ${dialCountry.dial}${dial}…`, {
                    description: `From ${fromLine.label} (${fromLine.number})`,
                  });
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 shadow-lg shadow-teal-700/30 active:bg-teal-800"
              >
                <Phone size={28} className="text-white" fill="white" strokeWidth={0} />
              </button>
              <button
                type="button"
                onClick={() => setDial((d) => d.slice(0, -1))}
                className="flex h-14 w-14 items-center justify-center active:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300">
                  <Delete size={16} className={dial ? "text-slate-600" : "text-slate-300"} />
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setBrowseMode(true);
                setShowCountrySheet(true);
              }}
              className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-[13px] font-semibold text-teal-800"
            >
              <Hash size={14} /> Browse & rent numbers
            </button>
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
        <div className="pointer-events-auto flex items-center overflow-hidden rounded-full border border-slate-200/70 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.14)]">
          {(
            [
              { id: "history" as const, label: "History", icon: Clock },
              { id: "contacts" as const, label: "Contacts", icon: Users },
              { id: "keypad" as const, label: "Keypad", icon: Grid3X3 },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium ${
                subTab === id ? "bg-slate-100 text-slate-900" : "text-slate-500 active:bg-slate-50"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {showFromSheet && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/45" onClick={() => setShowFromSheet(false)} />
          <div className="relative rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]">
            <div className="flex h-12 items-center justify-between border-b border-slate-100 px-4">
              <h2 className="text-[16px] font-semibold text-slate-900">Call from</h2>
              <button type="button" onClick={() => setShowFromSheet(false)} className="p-1 text-slate-400">
                <X size={20} />
              </button>
            </div>
            <ul>
              {outboundLines.map((line) => (
                <li key={line.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setFromLineId(line.id);
                      setShowFromSheet(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
                  >
                    {line.type === "sim" ? (
                      <span className="flex w-6 justify-center">
                        <span className="inline-block h-3.5 w-2.5 rounded-sm bg-emerald-500" />
                      </span>
                    ) : (
                      <span className="w-6 text-center text-xl leading-none">{line.flag}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-slate-900">{line.label}</p>
                      <p className="text-[13px] text-slate-500">{line.number}</p>
                    </div>
                    {fromLine.id === line.id && <Check size={18} className="shrink-0 text-teal-700" />}
                  </button>
                </li>
              ))}
            </ul>
            <div className="h-3" />
          </div>
        </div>
      )}

      {showCountrySheet && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => {
              setShowCountrySheet(false);
              setCountrySearch("");
              setBrowseMode(false);
            }}
          />
          <div className="relative flex max-h-[75vh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 px-4">
              <h2 className="text-[16px] font-semibold text-slate-900">
                {browseMode ? "Rent a number" : "Select country"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCountrySheet(false);
                  setCountrySearch("");
                  setBrowseMode(false);
                }}
                className="p-1 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="shrink-0 px-4 py-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country"
                  className="h-10 w-full rounded-xl bg-slate-100 pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  autoFocus
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {countriesLoading ? (
                <li className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
                </li>
              ) : filteredCountries.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-slate-500">No countries match</li>
              ) : (
                filteredCountries.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setDialCountry({
                          code: c.code,
                          name: c.name,
                          dial: c.dial || "+1",
                          flag: c.flag,
                        });
                        setShowCountrySheet(false);
                        setCountrySearch("");
                        setDial("");
                        if (browseMode && c.raw) setCatalogCountry(c.raw);
                        setBrowseMode(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
                    >
                      <span className="text-2xl leading-none">{c.flag}</span>
                      <div className="flex-1">
                        <p className="text-[15px] font-medium text-slate-900">{c.name}</p>
                        {browseMode && c.raw && (
                          <p className="text-[12px] text-slate-500">
                            from {naira(Math.round(c.raw.from_price_ngn || 0))}
                          </p>
                        )}
                      </div>
                      <span className="text-[14px] text-slate-500">{c.dial}</span>
                      {dialCountry.code === c.code && !browseMode && (
                        <Check size={18} className="shrink-0 text-teal-700" />
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

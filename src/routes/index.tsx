import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Phone,
  Rocket,
  KeyRound,
  ClipboardList,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Check,
} from "lucide-react";
import { VernexMark } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Vernex — Your second number, anywhere in the world",
      },
      {
        name: "description",
        content:
          "Verify accounts, rent virtual numbers, and manage your digital presence — all from one powerful toolkit built for Nigerians doing global business.",
      },
      { property: "og:title", content: "Vernex — Virtual Numbers & OTP" },
      {
        property: "og:description",
        content:
          "Canada & USA OTP-ready numbers, long-term rentals, and social growth tools with instant Naira wallet funding.",
      },
    ],
  }),
  component: Landing,
});

const NAV = [
  { label: "Virtual Numbers", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Countries", href: "#countries" },
  { label: "Support", href: "#faq" },
];

const FLOAT_CARDS = [
  {
    flag: "🇨🇦",
    label: "Canada Mobile",
    number: "+1 (555) 012-3456",
    badge: "OTP READY",
    badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
    anim: "animate-float-slow",
  },
  {
    flag: "🇫🇷",
    label: "France Line",
    number: "+33 6 12 34 56 78",
    badge: "ACTIVE",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    anim: "animate-float-fast",
    delay: "1s",
  },
];

const COUNTRIES = [
  ["🇮🇳", "India"],
  ["🇮🇩", "Indonesia"],
  ["🇺🇦", "Ukraine"],
  ["🇷🇺", "Russia"],
  ["🇿🇦", "South Africa"],
  ["🇪🇸", "Spain"],
  ["🇮🇹", "Italy"],
  ["🇹🇷", "Turkey"],
  ["🇵🇱", "Poland"],
  ["🇲🇽", "Mexico"],
  ["🇺🇸", "United States"],
  ["🇬🇧", "United Kingdom"],
];

const FEATURES = [
  {
    icon: Phone,
    title: "Virtual Numbers",
    body: "Instant OTP numbers for WhatsApp, TikTok, Instagram, Google and 300+ services.",
  },
  {
    icon: KeyRound,
    title: "Rent a Line",
    body: "Keep a dedicated USA or global number for hours or days — exclusive to you.",
  },
  {
    icon: Rocket,
    title: "SMM Boost",
    body: "Grow followers, likes, and views with tracked delivery from your Vernex wallet.",
  },
  {
    icon: ClipboardList,
    title: "Buy Accounts",
    body: "Aged and verified social accounts delivered instantly after wallet payment.",
  },
];

const FAQS = [
  {
    q: "What's the difference between Virtual Number and Rent?",
    a: "Virtual Numbers are temporary lines for OTP verification (about 20 minutes). Rent gives you a dedicated number for hours or days that stays exclusively yours.",
  },
  {
    q: "Which platforms can I verify with Vernex?",
    a: "WhatsApp, TikTok, Instagram, Facebook, Telegram, Google, and hundreds more services supported by our providers.",
  },
  {
    q: "Can I get a refund if the number doesn't work?",
    a: "Yes. If no SMS is received within the active window, unused credit for that order is returned to your wallet automatically where the provider allows it.",
  },
  {
    q: "How do I fund my wallet?",
    a: "Open Fund Wallet from your dashboard and pay with bank transfer or card. Balance updates as soon as payment confirms.",
  },
  {
    q: "Is there a mobile app?",
    a: "Vernex is a mobile-first web app. Install it to your home screen from Chrome or Safari for an app-like experience.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [going, setGoing] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    void import("@/routes/auth").catch(() => undefined);
  }, []);

  const enter = () => {
    if (going) return;
    setGoing(true);
    requestAnimationFrame(() => {
      void navigate({ to: "/auth" });
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4F5FC] font-sans text-[#0F172A] antialiased selection:bg-emerald-500 selection:text-white">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-emerald-100/50 via-[#F4F5FC]/30 to-transparent" />
      <div className="animate-pulse-glow pointer-events-none absolute right-10 top-20 -z-10 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div
        className="animate-pulse-glow pointer-events-none absolute left-10 top-40 -z-10 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl"
        style={{ animationDelay: "2.5s" }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <VernexMark className="h-9 w-9 rounded-xl shadow-lg shadow-emerald-500/20" />
            <span className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              Vernex<span className="text-emerald-600">.</span>com.ng
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-emerald-600">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/auth"
              preload="intent"
              className="hidden text-sm font-semibold text-slate-700 transition hover:text-emerald-600 sm:inline-block"
            >
              Log In
            </Link>
            <button
              type="button"
              onClick={enter}
              disabled={going}
              className="tap-fast rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition-all duration-200 hover:bg-emerald-600 active:scale-[0.98] sm:px-5"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 text-slate-600 md:hidden"
              aria-label="Menu"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2">
              {NAV.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-slate-100 py-3.5 text-[15px] font-medium text-slate-800"
                >
                  {l.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  enter();
                }}
                className="tap-fast mb-3 mt-3 flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white"
              >
                Get a Number Now
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative px-6 pb-20 pt-14 md:pb-28 md:pt-20">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="animate-float-slow mb-8 inline-flex items-center space-x-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Canada &amp; USA — OTP Ready
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Your second number,{" "}
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">
              anywhere in the world.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg font-normal leading-relaxed text-slate-600 sm:text-xl">
            Verify accounts, rent virtual numbers, and manage your digital presence — all from one
            powerful toolkit built for Nigerians doing global business.
          </p>

          <div className="mb-14 flex flex-col items-center justify-center sm:flex-row">
            <button
              type="button"
              onClick={enter}
              disabled={going}
              className="tap-fast inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 font-bold text-white shadow-xl shadow-emerald-600/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 active:scale-[0.99] sm:w-auto"
            >
              Get a Number Now
              <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Floating feature cards */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
            {FLOAT_CARDS.map((c) => (
              <div
                key={c.number}
                className={`${c.anim} flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-emerald-500/5 backdrop-blur-md`}
                style={c.delay ? { animationDelay: c.delay } : undefined}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-lg">
                    {c.flag}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">{c.label}</div>
                    <div className="text-sm font-bold text-slate-800">{c.number}</div>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${c.badgeClass}`}
                >
                  {c.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-y border-slate-200/60 bg-white py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
          {[
            ["50+", "COUNTRIES"],
            ["200K+", "NUMBERS DELIVERED"],
            ["98%", "OTP SUCCESS RATE"],
            ["24/7", "PLATFORM ACCESS"],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="mb-1 text-3xl font-black text-slate-900 sm:text-4xl">{v}</div>
              <div className="text-sm font-medium text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Countries */}
      <section id="countries" className="relative overflow-hidden px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-600">
              Global coverage
            </h2>
            <h3 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Unlock numbers from any country instantly.
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {COUNTRIES.map(([flag, name]) => (
              <button
                key={name}
                type="button"
                onClick={enter}
                className="tap-fast group flex cursor-pointer items-center space-x-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl"
              >
                <span className="text-2xl">{flag}</span>
                <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-600">
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-slate-200/60 bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-600">
              Features
            </h2>
            <h3 className="text-3xl font-black text-slate-900">Everything in one toolkit</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 shadow-sm"
                >
                  <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{f.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50 sm:p-12">
          <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Start with any amount
          </h2>
          <p className="mx-auto mt-3 max-w-md text-slate-600">
            Fund your Naira wallet, then buy OTPs, rent numbers, or boost accounts — pay only for
            what you use.
          </p>
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-slate-700">
            {[
              "Instant bank-transfer funding",
              "OTP numbers from ₦200+",
              "5% referral commission",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                {t}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={enter}
            className="tap-fast mt-8 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
          >
            Create free account
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-slate-200/60 bg-white px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-black text-slate-900">FAQ</h2>
          <div className="space-y-2">
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-[#F8FAFC]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                  >
                    <span className="text-sm font-bold text-slate-900">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <p className="border-t border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-600">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-emerald-600 px-6 py-14 text-center text-white">
        <h2 className="text-2xl font-black sm:text-3xl">Ready for your second number?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/90">
          Join Vernex and get OTP-ready lines from Canada, the USA, and 50+ countries.
        </p>
        <button
          type="button"
          onClick={enter}
          className="tap-fast mt-6 inline-flex items-center rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-lg transition hover:bg-slate-50"
        >
          Get a Number Now
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Vernex.com.ng · Virtual numbers &amp; digital growth tools
      </footer>
    </div>
  );
}

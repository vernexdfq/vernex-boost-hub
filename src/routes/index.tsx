import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { VernexMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Vernex - Connect | Verify | Grow",
      },
      {
        name: "description",
        content:
          "Virtual numbers for instant OTP, dedicated rentals, social & music growth, and premium accounts — all from one professional toolkit.",
      },
      {
        property: "og:title",
        content: "Vernex - Connect | Verify | Grow",
      },
    ],
  }),
  component: Landing,
});

const NAV = [
  { label: "Services", href: "#services" },
  { label: "Coverage", href: "#coverage" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const COUNTRIES: [string, string][] = [
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

const SERVICES = [
  {
    id: "otp",
    title: "Virtual Numbers",
    subtitle: "Vernex Instant OTP",
    desc: "Instant OTP numbers for WhatsApp, TikTok, Instagram, Google and 300+ services.",
    href: "/auth",
    banner: "/banners/banner-otp.png",
    points: ["Instant delivery", "100+ countries", "Secure & private"],
  },
  {
    id: "rentals",
    title: "Rent a Line",
    subtitle: "Vernex Rentals",
    desc: "Keep a dedicated USA or global number for hours or days — exclusive to you.",
    href: "/auth",
    banner: "/banners/banner-rentals.png",
    points: ["Dedicated lines", "Voice & SMS", "Long-term validity"],
  },
  {
    id: "boost",
    title: "SMM Boost",
    subtitle: "Social & Music Growth",
    desc: "Grow followers, likes, views and streams with tracked delivery from your Vernex wallet.",
    href: "/auth",
    // File on disk for growth/rocket art is banner-accounts.png (upload names were swapped)
    banner: "/banners/banner-accounts.png",
    points: ["Live order tracking", "Social & music platforms", "Real engagement"],
  },
  {
    id: "accounts",
    title: "Buy Accounts",
    subtitle: "Premium Accounts",
    desc: "Aged and verified social accounts delivered instantly after wallet payment.",
    href: "/auth",
    // File on disk for accounts/logs art is banner-boost.png (upload names were swapped)
    banner: "/banners/banner-boost.png",
    points: ["Aged profiles", "PVA & ID verified", "Instant delivery"],
  },
];

const FAQS = [
  {
    q: "What's the difference between Virtual Number and Rent?",
    a: "Virtual Numbers are temporary lines for OTP verification (about 20 minutes). Rent gives you a dedicated number for hours or days that stays exclusively yours.",
  },
  {
    q: "Which platforms can I verify with Vernex?",
    a: "You can verify WhatsApp, Telegram, Google, Instagram, Twitter/X, TikTok, and over 300+ other online platforms seamlessly.",
  },
  {
    q: "Can I get a refund if the number doesn't work?",
    a: "Yes. If an OTP code is not delivered within the time window, our system automatically refunds your balance.",
  },
  {
    q: "How do I fund my wallet?",
    a: "Log in, open Fund Wallet, and transfer to your unique virtual account. Deposits credit automatically after payment is confirmed.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [going, setGoing] = useState(false);

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
    <div className="min-h-screen overflow-x-hidden bg-[#F4F5FC] font-sans text-[#0F172A] antialiased selection:bg-blue-500 selection:text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[560px] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-blue-100/50 via-[#F4F5FC]/40 to-transparent" />
      <div className="animate-pulse-glow pointer-events-none absolute right-8 top-24 -z-10 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
      <div
        className="animate-pulse-glow pointer-events-none absolute left-8 top-40 -z-10 h-72 w-72 rounded-full bg-indigo-200/25 blur-3xl"
        style={{ animationDelay: "2.5s" }}
      />

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-18 sm:px-6">
          <Link to="/" className="flex items-center space-x-3">
            <VernexMark className="h-9 w-9 rounded-xl shadow-md shadow-blue-500/15" />
            <span className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              Vernex<span className="text-blue-600">.</span>com.ng
            </span>
          </Link>

          <nav className="hidden items-center space-x-8 text-sm font-medium text-slate-600 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-blue-600">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              to="/auth"
              preload="intent"
              className="hidden px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-blue-600 sm:inline-block"
            >
              Log In
            </Link>
            <button
              type="button"
              onClick={enter}
              disabled={going}
              className="tap-fast rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition-all duration-200 hover:bg-blue-600 sm:px-5"
            >
              Get Started
            </button>
            <ThemeToggle className="hidden sm:grid" />
            <button
              type="button"
              className="p-2 text-slate-600 md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-slate-100 py-3.5 text-[15px] font-medium text-slate-800"
                >
                  {item.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  enter();
                }}
                className="tap-fast mb-3 mt-3 flex w-full items-center justify-center rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white"
              >
                Get a Number Now
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative px-5 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="animate-float-slow mb-7 inline-flex items-center space-x-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Canada & USA — OTP Ready
            </span>
          </div>

          <h1 className="mb-5 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Your second number{" "}
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
              anywhere in the world.
            </span>
          </h1>

          <p className="mx-auto mb-9 max-w-2xl text-base font-normal leading-relaxed text-slate-600 sm:text-lg">
            Verify accounts, rent virtual numbers, boost social growth, and manage your digital presence — all from one powerful toolkit.
          </p>

          <div className="mb-14 flex flex-col items-center justify-center space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
            <button
              type="button"
              onClick={enter}
              disabled={going}
              className="tap-fast inline-flex w-full transform items-center justify-center rounded-2xl bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 sm:w-auto"
            >
              Get a Number Now
              <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Floating preview cards */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
            <div className="animate-float-slow flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-blue-500/5 backdrop-blur-md">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-lg">
                  🇨🇦
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Canada Mobile</div>
                  <div className="text-sm font-bold text-slate-800">+1 (555) 012-3456</div>
                </div>
              </div>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                OTP READY
              </span>
            </div>

            <div
              className="animate-float-fast flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-blue-500/5 backdrop-blur-md"
              style={{ animationDelay: "1s" }}
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-lg">
                  🇫🇷
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">France Line</div>
                  <div className="text-sm font-bold text-slate-800">+33 6 12 34 56 78</div>
                </div>
              </div>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-y border-slate-200/60 bg-white py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 text-center sm:px-6 md:grid-cols-4">
          {[
            ["50+", "COUNTRIES"],
            ["200K+", "NUMBERS DELIVERED"],
            ["98%", "OTP SUCCESS RATE"],
            ["24/7", "PLATFORM ACCESS"],
          ].map(([value, label]) => (
            <div key={label}>
              <div className="mb-1 text-3xl font-black text-slate-900 sm:text-4xl">{value}</div>
              <div className="text-xs font-medium text-slate-500 sm:text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services with full floating banners */}
      <section id="services" className="relative px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">Services</p>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">Everything in one toolkit</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {SERVICES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={enter}
                className={`tap-fast group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white text-left shadow-lg shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 ${
                  i % 2 === 0 ? "animate-float-slow" : "animate-float-fast"
                }`}
              >
                {/* Full banner — no crop, no overlay */}
                <div className="w-full overflow-hidden bg-[#0B1220]">
                  <img
                    src={s.banner}
                    alt={s.title}
                    className="h-auto w-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>

                {/* Title + description below the full image */}
                <div className="p-5 sm:p-6">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-blue-600">
                    {s.subtitle}
                  </p>
                  <h3 className="mb-2 text-lg font-black text-slate-900 sm:text-xl">{s.title}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-slate-600">{s.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.points.map((p) => (
                      <span
                        key={p}
                        className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section id="coverage" className="relative overflow-hidden border-t border-slate-200/60 bg-white px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">Global Coverage</p>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Numbers from countries worldwide
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {COUNTRIES.map(([flag, name], i) => (
              <button
                key={name}
                type="button"
                onClick={enter}
                className={`tap-fast group flex cursor-pointer items-center space-x-3 rounded-2xl border border-slate-200/80 bg-[#F8FAFF] p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md ${
                  i % 2 === 0 ? "animate-float-slow" : "animate-float-fast"
                }`}
              >
                <span className="text-xl">{flag}</span>
                <span className="text-left text-xs font-bold text-slate-800 group-hover:text-blue-600 sm:text-sm">
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative px-5 py-16 sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] bg-slate-900 p-8 text-white shadow-2xl sm:p-12">
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="relative mx-auto mb-10 max-w-lg text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-300">Flexible funding</p>
            <h2 className="mb-3 text-3xl font-black sm:text-4xl">Start with any amount</h2>
            <p className="text-sm text-slate-400">
              Fund your Naira wallet, then buy OTPs, rent numbers, or boost accounts — pay only for what you use.
            </p>
          </div>
          <div className="relative mx-auto mb-10 grid max-w-xl grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[
              "Instant bank-transfer funding",
              "OTP numbers from affordable rates",
              "Referral rewards available",
              "24/7 automated delivery",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center space-x-3 rounded-xl border border-slate-700/50 bg-slate-800/80 p-4"
              >
                <span className="font-bold text-blue-400">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="relative text-center">
            <button
              type="button"
              onClick={enter}
              disabled={going}
              className="tap-fast inline-flex items-center justify-center rounded-2xl bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Create free account
              <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-slate-200/60 bg-white px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">Support</p>
            <h2 className="text-3xl font-black text-slate-900">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-slate-200 bg-[#F8FAFF] p-5 sm:p-6">
                <h3 className="mb-2 text-sm font-bold text-slate-900 sm:text-base">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-900 px-5 py-10 text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              V
            </div>
            <span className="font-bold text-white">Vernex.com.ng</span>
          </div>
          <div className="text-center text-sm sm:text-left">
            © {new Date().getFullYear()} Vernex.com.ng — Connect · Verify · Grow
          </div>
        </div>
      </footer>
    </div>
  );
}

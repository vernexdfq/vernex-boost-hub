import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone,
  Rocket,
  KeyRound,
  ClipboardList,
  BarChart3,
  ChevronDown,
  Menu,
  X,
  Check,
  Star,
} from "lucide-react";
import { VernexMark } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vernex — Instant Virtual Numbers, SMM Boost & Wallet" },
      {
        name: "description",
        content:
          "Get virtual numbers for OTP verification, rent long-term Non-VoIP lines, and boost your social accounts — all from one Nigerian wallet.",
      },
      { property: "og:title", content: "Vernex — Virtual Numbers & SMM Boost" },
      {
        property: "og:description",
        content:
          "Instant OTPs from 300+ services, social growth tools, and instant Naira wallet funding.",
      },
    ],
  }),
  component: Landing,
});

const NAV = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Countries", href: "#countries" },
  { label: "Pricing", href: "#pricing" },
  { label: "Download App", href: "#download" },
  { label: "Support", href: "#faq" },
];

const LIVE_FEED = [
  { flag: "🇺🇸", country: "United States", number: "+1 (415) 555-0192", badge: "OTP", tone: "otp" },
  { flag: "🇬🇧", country: "United Kingdom", number: "+44 7911 123456", badge: "ACTIVE", tone: "active" },
  { flag: "🇩🇪", country: "Germany", number: "+49 170 1234567", badge: "RENT", tone: "rent" },
  { flag: "🇨🇦", country: "Canada", number: "+1 (647) 555-0178", badge: "OTP", tone: "otp" },
  { flag: "🇫🇷", country: "France", number: "+33 6 12 34 56 78", badge: "ACTIVE", tone: "active" },
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
  ["🇨🇦", "Canada"],
  ["🇩🇪", "Germany"],
  ["🇫🇷", "France"],
  ["🇧🇷", "Brazil"],
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
    a: "Vernex is a mobile-first web app. Install it to your home screen from Chrome or Safari for an app-like experience. Native store builds are on the roadmap.",
  },
  {
    q: "Is Vernex legal to use in Nigeria?",
    a: "Yes. Vernex provides legitimate virtual numbers and digital services. Always use accounts and numbers in line with each platform's terms of service.",
  },
];

function badgeClass(tone: string) {
  if (tone === "active") return "bg-sky-500/10 text-sky-400 border-sky-500/20";
  if (tone === "rent") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
}

function LiveCard({
  flag,
  country,
  number,
  badge,
  tone,
}: {
  flag: string;
  country: string;
  number: string;
  badge: string;
  tone: string;
}) {
  return (
    <div className="flex w-72 shrink-0 items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
      <div>
        <div className="mb-1 flex items-center space-x-2">
          <span className="text-lg leading-none">{flag}</span>
          <span className="text-sm font-semibold text-slate-100">{country}</span>
        </div>
        <p className="font-mono text-xs text-slate-400 tabular-nums">{number}</p>
      </div>
      <span
        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${badgeClass(tone)}`}
      >
        {badge}
      </span>
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [marqueePaused, setMarqueePaused] = useState(false);

  const enter = () => navigate({ to: "/auth" });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <VernexMark className="h-8 w-8" />
            <span className="text-xl font-bold tracking-wider text-emerald-400">
              Vernex<span className="text-white">.ng</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={enter}
              className="hidden rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-600 sm:inline-flex"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-700 text-slate-100"
              aria-label="Menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-800 bg-slate-900">
            <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2">
              {NAV.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-slate-800 py-3.5 text-[15px] font-medium text-slate-100"
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
                className="mb-2 mt-3 w-full rounded-lg bg-emerald-500 py-3.5 text-sm font-bold text-slate-950"
              >
                Get Started →
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mb-6 inline-flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span>Canada · OTP Ready</span>
        </div>
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
          Your second number, anywhere in the world.
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400 sm:text-xl">
          Verify accounts, rent virtual numbers, and manage your digital presence — all from one
          powerful toolkit built for global business.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={enter}
            className="w-full rounded-lg bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-600 sm:w-auto"
          >
            Create Free Account
          </button>
          <a
            href="#how"
            className="w-full rounded-lg border border-slate-700 px-6 py-3.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 sm:w-auto"
          >
            How it works
          </a>
        </div>
      </section>

      {/* Live marquee — continuously scrolling number cards */}
      <section className="overflow-hidden border-y border-slate-800/60 bg-slate-900/50 py-8">
        <div className="mx-auto mb-4 flex max-w-7xl items-center justify-between px-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          <span>Live System Feed</span>
          <span className="flex items-center text-emerald-400">
            <span className="mr-1.5 h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
            5 Live
          </span>
        </div>

        <div className="relative w-full overflow-hidden">
          <div
            className={`vernex-marquee-track py-2${marqueePaused ? " is-paused" : ""}`}
            onMouseEnter={() => setMarqueePaused(true)}
            onMouseLeave={() => setMarqueePaused(false)}
            onTouchStart={() => setMarqueePaused(true)}
            onTouchEnd={() => setMarqueePaused(false)}
          >
            <div className="vernex-marquee-group">
              {LIVE_FEED.map((row) => (
                <LiveCard key={`a-${row.number}`} {...row} />
              ))}
            </div>
            <div className="vernex-marquee-group" aria-hidden>
              {LIVE_FEED.map((row) => (
                <LiveCard key={`b-${row.number}`} {...row} />
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-3 max-w-7xl px-4 text-right font-mono text-xs text-slate-500">
          Last updated: just now
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
          — How it works
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
          From zero to verified in under 2 minutes.
        </h2>
        <p className="mt-2 max-w-lg text-[15px] text-slate-400">
          No contracts, no SIM card, no waiting. Just instant access to numbers that work.
        </p>
        <ol className="mt-8 space-y-4">
          {[
            {
              n: "01",
              icon: <KeyRound className="h-5 w-5 text-emerald-400" />,
              title: "Create your account",
              body: "Sign up on Vernex with your phone number and PIN. Fund your wallet — quick and secure.",
            },
            {
              n: "02",
              icon: <span className="text-lg leading-none">🌍</span>,
              title: "Pick your country",
              body: "Browse 50+ countries. Select the one you need — USA, UK, Canada, Germany, and many more.",
            },
            {
              n: "03",
              icon: <Phone className="h-5 w-5 text-emerald-400" />,
              title: "Receive your OTP",
              body: "Your SMS or OTP lands in your Vernex dashboard in seconds. Copy, verify, done.",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="relative rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <span className="absolute right-4 top-4 text-4xl font-black text-slate-800">
                {s.n}
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10">
                {s.icon}
              </span>
              <h3 className="mt-3 text-base font-bold text-white">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
          — Features
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
          Everything you need to go global.
        </h2>
        <p className="mt-2 text-[15px] text-slate-400">One platform. Every use case.</p>
        <ul className="mt-8 space-y-5">
          {[
            {
              icon: <KeyRound className="h-5 w-5" />,
              title: "OTP Verification",
              body: "Receive one-time passwords from WhatsApp, TikTok, Instagram, Facebook, Telegram, and hundreds more.",
            },
            {
              icon: <ClipboardList className="h-5 w-5" />,
              title: "Rent a Number",
              body: "Need a dedicated line? Rent a number for hours or days — stays active and exclusively yours.",
            },
            {
              icon: <Rocket className="h-5 w-5" />,
              title: "Account Boost",
              body: "Grow your social media presence with our account boost services — safely and effectively.",
            },
            {
              icon: <BarChart3 className="h-5 w-5" />,
              title: "SMS & Activity Log",
              body: "Every message, every verification — logged and accessible in your dashboard.",
            },
          ].map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                {f.icon}
              </span>
              <div>
                <h3 className="text-[15px] font-bold text-white">{f.title}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Countries */}
      <section id="countries" className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
          — Countries
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
          50+ countries. One platform.
        </h2>
        <p className="mt-2 text-[15px] text-slate-400">
          Can&apos;t find a country? Request yours and we&apos;ll prioritise it.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {COUNTRIES.map(([flag, name]) => (
            <div
              key={name}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3"
            >
              <span className="text-lg leading-none">{flag}</span>
              <span className="truncate text-[13px] font-semibold text-slate-100">{name}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={enter}
          className="mt-4 w-full rounded-xl border border-dashed border-slate-700 py-3 text-[13px] font-semibold text-emerald-400"
        >
          +29 more →
        </button>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
          — Pricing
        </p>
        <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-white">
          Simple, transparent pricing.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-[15px] text-slate-400">
          Pay only for what you use. Fund your wallet and pick the service you need — no
          subscriptions.
        </p>
        <div className="mt-8 space-y-4">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-[17px] font-bold text-white">Virtual Number</h3>
            <p className="mt-1 text-sm text-slate-400">
              A temporary number active for ~20 minutes. Perfect for one-time OTP verification on
              any platform.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {[
                "20-minute active window",
                "Works on WhatsApp, TikTok, Instagram & more",
                "Multiple OTPs receivable",
                "Full credit refund if no SMS received",
                "Instant delivery to your dashboard",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={enter}
              className="mt-5 w-full rounded-lg bg-emerald-500 py-3.5 text-sm font-bold text-slate-950"
            >
              Get a Virtual Number
            </button>
          </article>

          <article className="relative rounded-2xl border border-emerald-500/40 bg-slate-900 p-5">
            <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950">
              Most popular
            </span>
            <h3 className="text-[17px] font-bold text-white">Rent a Number</h3>
            <p className="mt-1 text-sm text-slate-400">
              Lease a dedicated number for a custom duration — hours to days. Exclusively yours for
              the full period.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {[
                "Flexible duration — hours to days",
                "Number stays exclusively assigned to you",
                "Ideal for business registrations",
                "USA on SignalWire · Global on DIDWW",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={enter}
              className="mt-5 w-full rounded-lg border border-slate-700 bg-slate-950 py-3.5 text-sm font-bold text-white"
            >
              Rent a Number
            </button>
          </article>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-slate-800 bg-slate-900 px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
            — Trusted by thousands
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            Real people, real results.
          </h2>
          <div className="mt-8 space-y-4">
            {[
              {
                quote:
                  "I needed a US number to verify my Stripe account for my online store. Vernex delivered an OTP in under 30 seconds. Mind blown.",
                name: "Adewale Okafor",
                role: "E-commerce entrepreneur · Lagos",
                initials: "AO",
              },
              {
                quote:
                  "Finally a Nigerian platform that actually works. I've been using Vernex to verify my clients' social accounts. The rental feature is exactly what I needed.",
                name: "Chioma Ezenwachi",
                role: "Social media manager · Abuja",
                initials: "CE",
              },
            ].map((t) => (
              <blockquote
                key={t.name}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-4 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-slate-950">
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{t.name}</p>
                    <p className="text-[11px] text-slate-500">{t.role}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Questions? We&apos;ve got answers.
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Can&apos;t find it? Email{" "}
          <a href="mailto:support@vernex.com.ng" className="font-semibold text-emerald-400">
            support@vernex.com.ng
          </a>
        </p>
        <div className="mt-6 space-y-2">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="rounded-xl border border-slate-800 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-slate-100"
                >
                  <span>{f.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <p className="border-t border-slate-800 px-4 py-3 text-sm leading-relaxed text-slate-400">
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section id="download" className="bg-emerald-500 px-4 py-14 text-center text-slate-950">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Ready to unlock any number, from anywhere?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-900/80">
          Join thousands of Nigerians using Vernex to work, verify, and grow — without limits.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={enter}
            className="rounded-lg bg-slate-950 py-3.5 text-sm font-bold text-white"
          >
            Create Free Account →
          </button>
          <a
            href="#download"
            className="rounded-lg border border-slate-950/20 py-3.5 text-sm font-semibold text-slate-950"
          >
            📱 Download the App
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2">
            <VernexMark className="h-8 w-8" />
            <span className="text-base font-bold text-emerald-400">
              Vernex<span className="text-white">.ng</span>
            </span>
          </div>
          <p className="mt-3 max-w-md text-[13px] leading-relaxed text-slate-500">
            Your digital toolkit for virtual numbers, OTP verification, and social media growth —
            built for Nigeria, ready for the world.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-8 text-[13px] sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                Product
              </p>
              <ul className="mt-3 space-y-2 text-slate-400">
                <li>Virtual Numbers</li>
                <li>Rent a Number</li>
                <li>Account Boost</li>
                <li>SMS Log</li>
                <li>Pricing</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">App</p>
              <ul className="mt-3 space-y-2 text-slate-400">
                <li>Download App</li>
                <li>
                  <button type="button" onClick={enter} className="text-left">
                    Log In
                  </button>
                </li>
                <li>
                  <button type="button" onClick={enter} className="text-left">
                    Sign Up
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                Help
              </p>
              <ul className="mt-3 space-y-2 text-slate-400">
                <li>Support Centre</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-900 pt-5 text-[11px] text-slate-600">
            <p>© {new Date().getFullYear()} Vernex · vernex.com.ng · All rights reserved.</p>
            <p className="mt-1">support@vernex.com.ng</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

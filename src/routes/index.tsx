import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Phone,
  Rocket,
  Store,
  PhoneCall,
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
      {
        title: "Vernex — Instant Virtual Numbers, SMM Boost & Wallet",
      },
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

const SAMPLE_NUMBERS = [
  { flag: "🇺🇸", number: "+1 (415) 555-0192", meta: "USA · OTP Ready" },
  { flag: "🇬🇧", number: "+44 7911 123456", meta: "UK · Active Rental" },
  { flag: "🇨🇦", number: "+1 (647) 555-0178", meta: "Canada · OTP Ready" },
];

const LIVE_BOARD = [
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

const badgeClass = (tone: string) => {
  if (tone === "active") return "bg-emerald-500/15 text-emerald-400";
  if (tone === "rent") return "bg-amber-500/15 text-amber-400";
  return "bg-sky-500/15 text-sky-400";
};

function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Public landing only — users sign in with phone + PIN (no auto-login).
  const enter = () => navigate({ to: "/auth" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <VernexMark className="h-8 w-8" />
            <span className="text-[17px] font-bold tracking-tight">
              Vernex<span className="text-primary">.ng</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-border"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-border bg-background">
            <nav className="mx-auto flex max-w-5xl flex-col px-4 py-2">
              {NAV.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border py-3.5 text-[15px] font-medium text-foreground"
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
                className="mt-3 mb-2 w-full rounded-xl brand-gradient py-3.5 text-sm font-bold text-white"
              >
                Get Started →
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-8 pb-6">
        <div className="flex flex-col items-center gap-3">
          <a
            href="#download"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-[12px] font-semibold"
          >
            <span className="text-base leading-none">▶</span>
            Google Play
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
              Live
            </span>
          </a>
          <a
            href="#download"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-[12px] font-semibold text-background"
          >
            <span className="text-base leading-none"></span>
            Download on the App Store
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
              Live
            </span>
          </a>
        </div>

        <ul className="mx-auto mt-6 max-w-sm space-y-2.5">
          {SAMPLE_NUMBERS.map((n) => (
            <li
              key={n.number}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm"
            >
              <span className="text-xl leading-none">{n.flag}</span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[14px] font-semibold tabular-nums">{n.number}</p>
                <p className="text-[11px] text-muted-foreground">{n.meta}</p>
              </div>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            </li>
          ))}
        </ul>
      </section>

      {/* Stats strip */}
      <section className="brand-gradient px-4 py-10 text-center text-white">
        <p className="text-5xl font-black tracking-tight">50+</p>
        <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/80">
          Countries
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">
          — How it works
        </p>
        <h2 className="mt-2 text-[28px] font-black leading-tight tracking-tight">
          From zero to verified in under 2 minutes.
        </h2>
        <p className="mt-2 max-w-lg text-[15px] text-muted-foreground">
          No contracts, no SIM card, no waiting. Just instant access to numbers that work.
        </p>

        <ol className="mt-8 space-y-4">
          {[
            {
              n: "01",
              icon: <KeyRound className="h-5 w-5 text-primary" />,
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
              icon: <Phone className="h-5 w-5 text-primary" />,
              title: "Receive your OTP",
              body: "Your SMS or OTP lands in your Vernex dashboard in seconds. Copy, verify, done.",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="relative rounded-2xl border border-border bg-surface p-5"
            >
              <span className="absolute right-4 top-4 text-4xl font-black text-muted/40">
                {s.n}
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                {s.icon}
              </span>
              <h3 className="mt-3 text-[16px] font-bold">{s.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">
          — Features
        </p>
        <h2 className="mt-2 text-[28px] font-black leading-tight tracking-tight">
          Everything you need to go global.
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">One platform. Every use case.</p>

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
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                {f.icon}
              </span>
              <div>
                <h3 className="text-[15px] font-bold">{f.title}</h3>
                <p className="mt-0.5 text-[14px] leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Live board */}
        <div className="mt-10 rounded-2xl bg-[#0B1220] p-4 text-white">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
            Active numbers
          </p>
          <ul className="space-y-2">
            {LIVE_BOARD.map((row) => (
              <li
                key={row.number}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
              >
                <span className="text-lg leading-none">{row.flag}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{row.country}</p>
                  <p className="font-mono text-[12px] text-white/60 tabular-nums">{row.number}</p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass(row.tone)}`}
                >
                  {row.badge}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-[11px] text-white/50">
            <span>Last updated: just now</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />5 Live
            </span>
          </div>
        </div>
      </section>

      {/* Countries */}
      <section id="countries" className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">
          — Countries
        </p>
        <h2 className="mt-2 text-[28px] font-black leading-tight tracking-tight">
          50+ countries. One platform.
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Can&apos;t find a country? Request yours and we&apos;ll prioritise it.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {COUNTRIES.map(([flag, name]) => (
            <div
              key={name}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-3"
            >
              <span className="text-lg leading-none">{flag}</span>
              <span className="truncate text-[13px] font-semibold">{name}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={enter}
          className="mt-4 w-full rounded-xl border border-dashed border-border py-3 text-[13px] font-semibold text-primary"
        >
          +29 more →
        </button>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-center text-[12px] font-bold uppercase tracking-[0.16em] text-primary">
          — Pricing
        </p>
        <h2 className="mt-2 text-center text-[28px] font-black leading-tight tracking-tight">
          Simple, transparent pricing.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-[15px] text-muted-foreground">
          Pay only for what you use. Fund your wallet and pick the service you need — no
          subscriptions.
        </p>

        <div className="mt-8 space-y-4">
          <article className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-[17px] font-bold">Virtual Number</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">
              A temporary number active for ~20 minutes. Perfect for one-time OTP verification on
              any platform.
            </p>
            <ul className="mt-4 space-y-2 text-[14px]">
              {[
                "20-minute active window",
                "Works on WhatsApp, TikTok, Instagram & more",
                "Multiple OTPs receivable",
                "Full credit refund if no SMS received",
                "Instant delivery to your dashboard",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={enter}
              className="mt-5 w-full rounded-xl brand-gradient py-3.5 text-sm font-bold text-white"
            >
              Get a Virtual Number
            </button>
          </article>

          <article className="relative rounded-2xl border-2 border-primary/40 bg-surface p-5">
            <span className="absolute -top-2.5 right-4 rounded-full brand-gradient px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Most popular
            </span>
            <h3 className="text-[17px] font-bold">Rent a Number</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Lease a dedicated number for a custom duration — hours to days. Exclusively yours for
              the full period.
            </p>
            <ul className="mt-4 space-y-2 text-[14px]">
              {[
                "Flexible duration — hours to days",
                "Number stays exclusively assigned to you",
                "Ideal for business registrations",
                "USA on SignalWire · Global on DIDWW",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={enter}
              className="mt-5 w-full rounded-xl border border-border bg-background py-3.5 text-sm font-bold"
            >
              Rent a Number
            </button>
          </article>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#0B1220] px-4 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-emerald-400/90">
            — Trusted by thousands
          </p>
          <h2 className="mt-2 text-[28px] font-black leading-tight tracking-tight">
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
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-white/85">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-[12px] font-bold text-white">
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold">{t.name}</p>
                    <p className="text-[11px] text-white/55">{t.role}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-[28px] font-black leading-tight tracking-tight">
          Questions? We&apos;ve got answers.
        </h2>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Can&apos;t find it? Email{" "}
          <a href="mailto:support@vernex.com.ng" className="font-semibold text-primary">
            support@vernex.com.ng
          </a>
        </p>

        <div className="mt-6 space-y-2">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="rounded-xl border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px] font-semibold"
                >
                  <span>{f.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <p className="border-t border-border px-4 py-3 text-[14px] leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section id="download" className="brand-gradient px-4 py-14 text-center text-white">
        <h2 className="text-[28px] font-black leading-tight tracking-tight">
          Ready to unlock any number, from anywhere?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[14px] text-white/85">
          Join thousands of Nigerians using Vernex to work, verify, and grow — without limits.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={enter}
            className="rounded-xl bg-white py-3.5 text-sm font-bold text-foreground"
          >
            Create Free Account →
          </button>
          <a
            href="#download"
            className="rounded-xl border border-white/30 py-3.5 text-sm font-semibold text-white"
          >
            📱 Download the App
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B1220] px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2">
            <VernexMark className="h-8 w-8" />
            <span className="text-[16px] font-bold">
              Vernex<span className="text-primary">.ng</span>
            </span>
          </div>
          <p className="mt-3 max-w-md text-[13px] leading-relaxed text-white/60">
            Your digital toolkit for virtual numbers, OTP verification, and social media growth —
            built for Nigeria, ready for the world.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-8 text-[13px]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                Product
              </p>
              <ul className="mt-3 space-y-2 text-white/75">
                <li>Virtual Numbers</li>
                <li>Rent a Number</li>
                <li>Account Boost</li>
                <li>SMS Log</li>
                <li>Pricing</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">App</p>
              <ul className="mt-3 space-y-2 text-white/75">
                <li>Download App</li>
                <li>Android (Play Store)</li>
                <li>iOS (App Store)</li>
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
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                Help
              </p>
              <ul className="mt-3 space-y-2 text-white/75">
                <li>Support Centre</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-5 text-[11px] text-white/45">
            <p>© {new Date().getFullYear()} Vernex · vernex.com.ng · All rights reserved.</p>
            <p className="mt-1">support@vernex.com.ng</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

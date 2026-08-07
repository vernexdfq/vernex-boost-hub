import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Phone,
  Rocket,
  Store,
  PhoneCall,
  ShieldCheck,
  Zap,
  Wallet,
  Star,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

import { VernexMark } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vernex — Instant Virtual Numbers, SMM Boost & Wallet" },
      { name: "description", content: "Get virtual numbers for OTP verification, rent long-term Non-VoIP lines, and boost your social accounts — all from one Nigerian wallet." },
      { property: "og:title", content: "Vernex — Virtual Numbers & SMM Boost" },
      { property: "og:description", content: "Instant OTPs from 300+ services, social growth tools, and instant Naira wallet funding." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Always show the public landing page. Users must explicitly sign in
  // with phone + PIN (no permanent auto-login redirect).
  const enter = () => {
    navigate({ to: "/auth" });
  };


  const navLinks = [
    { label: "How it works", href: "#how" },
    { label: "Features", href: "#features" },
    { label: "Countries", href: "#countries" },
    { label: "Pricing", href: "#pricing" },
    { label: "Download App", href: "#download" },
    { label: "Support", href: "#faq" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <VernexMark className="h-9 w-9" />
            <span className="text-lg font-black tracking-tight">Vernex</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={enter} className="hidden rounded-xl brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(22,199,132,0.5)] md:inline-flex">
              Sign Up / Login
            </button>
            <button onClick={() => setMenuOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-xl border border-border md:hidden" aria-label="Menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-surface md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
              {navLinks.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                  {l.label}
                </a>
              ))}
              <button onClick={enter} className="mt-2 rounded-xl brand-gradient px-4 py-2.5 text-sm font-semibold text-white">
                Sign Up / Login
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50/60 to-transparent" />
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <Zap className="h-3.5 w-3.5" /> Trusted by 40,000+ users
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Instant Virtual Numbers, <span className="bg-gradient-to-r from-[#16C784] to-[#0D9488] bg-clip-text text-transparent">Real Naira Wallet.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Verify accounts with OTPs from 300+ services, rent long-term Non-VoIP numbers, and boost your socials — all from one dashboard.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={enter} className="inline-flex items-center gap-2 rounded-2xl brand-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(22,199,132,0.6)]">
              Get a Number Now <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              <a href="#download" className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold">▶ Google Play</a>
              <a href="#download" className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold"> App Store</a>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-3xl font-black tracking-tight">How it works</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">Three steps and you're live.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: 1, t: "Create account", d: "Sign up in 30 seconds with your email or phone." },
            { n: 2, t: "Pick country & service", d: "Choose from 50+ countries and 300+ services." },
            { n: 3, t: "Receive OTP instantly", d: "Get your code delivered in seconds. Refund if it fails." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-surface p-6 shadow-card-elev">
              <span className="grid h-10 w-10 place-items-center rounded-xl brand-gradient text-sm font-black text-white">{s.n}</span>
              <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-surface-2">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-3xl font-black tracking-tight">Everything you need</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Phone, t: "OTP Verification", d: "Instant one-time codes from 300+ services." },
              { icon: PhoneCall, t: "Rent Numbers", d: "Long-term Non-VoIP numbers by the week or month." },
              { icon: Rocket, t: "Account Boost", d: "Followers, likes, views across every major platform." },
              { icon: Store, t: "SMS Logs", d: "Buy verified aged accounts and social logs." },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-border bg-surface p-5 shadow-card-elev">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-base font-bold">{f.t}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Countries */}
      <section id="countries" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-3xl font-black tracking-tight">Supported Countries</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">50+ regions and growing.</p>
        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {[
            ["🇺🇸","USA"],["🇬🇧","UK"],["🇨🇦","Canada"],["🇳🇬","Nigeria"],["🇮🇳","India"],["🇷🇺","Russia"],
            ["🇩🇪","Germany"],["🇫🇷","France"],["🇮🇩","Indonesia"],["🇧🇷","Brazil"],["🇿🇦","S.Africa"],["🇵🇭","Philippines"],
          ].map(([f, n]) => (
            <div key={n} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-card-elev">
              <span className="text-2xl leading-none">{f}</span>
              <span className="text-sm font-semibold">{n}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-surface-2">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-3xl font-black tracking-tight">Simple, transparent pricing</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-card-elev">
              <h3 className="text-lg font-bold">Virtual Numbers</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pay per OTP</p>
              <p className="mt-4 text-4xl font-black tracking-tight">₦850<span className="text-sm font-medium text-muted-foreground">/OTP</span></p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/>Instant delivery</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/>Auto refund on failure</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/>300+ services</li>
              </ul>
              <button onClick={enter} className="mt-6 w-full rounded-xl brand-gradient py-3 text-sm font-semibold text-white">Get Started</button>
            </div>
            <div className="rounded-2xl border-2 border-primary bg-surface p-6 shadow-card-elev">
              <h3 className="text-lg font-bold">Rent Numbers</h3>
              <p className="mt-1 text-sm text-muted-foreground">Long-term Non-VoIP</p>
              <p className="mt-4 text-4xl font-black tracking-tight">₦12,500<span className="text-sm font-medium text-muted-foreground">/week</span></p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/>Unlimited SMS</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/>Weekly / monthly plans</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/>Non-VoIP quality</li>
              </ul>
              <button onClick={enter} className="mt-6 w-full rounded-xl bg-[#0F172A] py-3 text-sm font-semibold text-white">Rent Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-3xl font-black tracking-tight">Loved by verifiers & marketers</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { n: "Tunde A.", r: "Vernex saved my WhatsApp business. OTP arrived in 4 seconds." },
            { n: "Chioma E.", r: "Best rates in Naija for TikTok boosts. My wallet funds instantly." },
            { n: "Musa K.", r: "I resell numbers with the affiliate site — clean profit weekly." },
          ].map((t) => (
            <div key={t.n} className="rounded-2xl border border-border bg-surface p-5 shadow-card-elev">
              <div className="flex gap-0.5 text-primary">{Array.from({length:5}).map((_,i)=><Star key={i} className="h-4 w-4 fill-current"/>)}</div>
              <p className="mt-3 text-sm text-foreground/90">"{t.r}"</p>
              <p className="mt-3 text-xs font-semibold text-muted-foreground">{t.n}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-surface-2">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="text-center text-3xl font-black tracking-tight">Frequently asked</h2>
          <div className="mt-8 space-y-2">
            {[
              { q: "How fast do OTPs arrive?", a: "Most codes land in under 10 seconds. If nothing arrives within 15 minutes we automatically refund your wallet." },
              { q: "Can I use the numbers for WhatsApp / Telegram?", a: "Yes — 300+ services are supported including WhatsApp, Telegram, OpenAI, Tinder, and many more." },
              { q: "How do I fund my Naira wallet?", a: "Instant transfers via your dedicated virtual account (Paystack, Flutterwave, Monnify)." },
              { q: "Do you offer resale accounts?", a: "Yes. Order an affiliate reseller site to sell every Vernex product under your own brand." },
            ].map((f, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold">
                  {f.q}
                  <ChevronDown className={`h-4 w-4 transition ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <p className="px-4 pb-4 text-sm text-muted-foreground">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download / CTA */}
      <section id="download" className="mx-auto max-w-6xl px-5 py-16">
        <div className="rounded-3xl wallet-gradient p-8 text-center shadow-wallet sm:p-12">
          <Wallet className="mx-auto h-10 w-10 text-white/80" />
          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Start verifying in 30 seconds</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/70">Create your Vernex wallet today and get ₦500 in signup credit.</p>
          <button onClick={enter} className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#0F172A]">Get a Number Now</button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Vernex. All rights reserved.</p>
          <div className="flex gap-4"><a href="#" className="hover:text-foreground">Terms</a><a href="#" className="hover:text-foreground">Privacy</a><a href="#" className="hover:text-foreground">Contact</a></div>
        </div>
      </footer>
    </div>
  );
}

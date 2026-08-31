import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Globe2,
  Menu,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { VerxorMark } from "@/components/brand";
import { InstallPrompt } from "@/components/install-prompt";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Verxor — Your complete digital ecosystem" },
      {
        name: "description",
        content:
          "Verxor brings virtual numbers, number rentals, digital accounts, social & music growth, and affiliate websites into one global platform.",
      },
      {
        property: "og:title",
        content: "Verxor — Your complete digital ecosystem",
      },
      {
        property: "og:description",
        content:
          "One global platform for the digital services you use every day.",
      },
    ],
  }),
  component: Landing,
});

const NAV = [
  { label: "Services", href: "#services" },
  { label: "Global coverage", href: "#coverage" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

const COUNTRIES: [string, string][] = [
  ["🇳🇬", "Nigeria"],
  ["🇬🇭", "Ghana"],
  ["🇰🇪", "Kenya"],
  ["🇿🇦", "South Africa"],
  ["🇺🇸", "United States"],
  ["🇬🇧", "United Kingdom"],
  ["🇨🇦", "Canada"],
  ["🇫🇷", "France"],
  ["🇩🇪", "Germany"],
  ["🇮🇳", "India"],
  ["🇦🇪", "United Arab Emirates"],
  ["🇦🇺", "Australia"],
];

const SERVICES = [
  {
    id: "virtual-numbers",
    eyebrow: "01 · Virtual Numbers",
    title: "Instant virtual numbers",
    desc: "Get a temporary number when you need a fast SMS or OTP verification flow.",
    banner: "/banners/banner-otp.png",
    fallback: "otp",
    points: ["Instant delivery", "100+ countries", "SMS / OTP"],
  },
  {
    id: "number-rentals",
    eyebrow: "02 · Number Rentals",
    title: "Dedicated numbers",
    desc: "Rent a number for longer-term use when continuity matters more than a one-time code.",
    banner: "/banners/banner-rentals.png",
    fallback: "rentals",
    points: ["Dedicated line", "Longer validity", "Private use"],
  },
  {
    id: "accounts-logs",
    eyebrow: "03 · Accounts & Logs",
    title: "Premium digital accounts",
    desc: "Browse ready-to-use digital account products through a simple, organized marketplace.",
    banner: "/banners/banner-accounts.png",
    fallback: "accounts",
    points: ["Organized catalog", "Wallet checkout", "Fast delivery"],
  },
  {
    id: "growth",
    eyebrow: "04 · Social & Music Growth",
    title: "Grow your digital presence",
    desc: "Manage social and music growth orders from one place with clear order status and wallet billing.",
    banner: "/banners/banner-boost.png",
    fallback: "growth",
    points: ["Social platforms", "Music growth", "Order tracking"],
  },
  {
    id: "affiliate",
    eyebrow: "05 · Affiliate Website",
    title: "Build your own Verxor-powered store",
    desc: "Launch a branded reseller experience and offer eligible Verxor products under your own business identity.",
    banner: "/banners/banner-affiliate.png",
    fallback: "affiliate",
    points: ["Your brand", "Product catalog", "Admin control"],
  },
];

const FAQS = [
  {
    q: "What is Verxor?",
    a: "Verxor is a global digital-services platform bringing several everyday digital products into one account, wallet, and streamlined checkout experience.",
  },
  {
    q: "Are Verxor numbers available internationally?",
    a: "Yes. Our first service is designed around global virtual numbers, with availability varying by country, service, and live inventory.",
  },
  {
    q: "How does the wallet work?",
    a: "Your account uses an isolated multi-currency wallet architecture. Your country or location may suggest a local currency and payment method, but your funds are not automatically converted or locked.",
  },
  {
    q: "Can I switch my currency?",
    a: "Yes. Currency and country selection remain under your control. Location signals are used only to make a useful suggestion.",
  },
  {
    q: "How do I get started?",
    a: "Create an account, choose the product you need, fund the appropriate wallet, and complete checkout. Product availability and pricing are shown before you confirm an order.",
  },
];

function BannerSlot({
  src,
  alt,
  kind,
}: {
  src: string;
  alt: string;
  kind: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <BannerFallback kind={kind} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="block h-auto w-full object-cover"
    />
  );
}

function BannerFallback({ kind }: { kind: string }) {
  const labels: Record<string, [string, string]> = {
    otp: ["OTP verification", "+1 202 555 0143"],
    rentals: ["Dedicated number", "+1 416 555 0182"],
    accounts: ["Premium account", "Ready to use"],
    growth: ["Growth order", "Processing · 84%"],
    affiliate: ["Your reseller store", "Verxor-powered"],
  };
  const [label, value] = labels[kind] ?? ["Verxor service", "Ready"];

  return (
    <div className="relative flex aspect-[16/8.4] items-center overflow-hidden bg-[#F7F9FD] px-6 sm:px-10">
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-100/80 blur-2xl" />
      <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-slate-200/50 blur-2xl" />
      <div className="relative grid w-full grid-cols-[1.05fr_.95fr] items-center gap-5">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Verxor</div>
          <div className="max-w-sm text-xl font-black leading-tight tracking-tight text-[#0F1332] sm:text-3xl">
            {label}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 sm:text-sm">{value}</div>
        </div>
        <div className="ml-auto w-full max-w-[240px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/30">
          <div className="mb-3 flex items-center justify-between">
            <span className="h-2 w-16 rounded-full bg-slate-200" />
            <span className="h-7 w-7 rounded-lg bg-blue-50" />
          </div>
          <div className="mb-2 h-2.5 w-4/5 rounded-full bg-slate-100" />
          <div className="mb-4 h-2.5 w-3/5 rounded-full bg-slate-100" />
          <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2">
            <span className="text-[10px] font-semibold text-slate-500">Status</span>
            <span className="text-[10px] font-bold text-blue-600">ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-[#0F172A] antialiased selection:bg-blue-600 selection:text-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Verxor home">
            <VerxorMark className="h-10 w-10 rounded-xl" />
            <div className="leading-none">
              <div className="text-[19px] font-black tracking-[-0.04em] text-[#0F1332]">
                Ver<span className="text-[#2563EB]">xor</span>
              </div>
              <div className="mt-1 hidden text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:block">
                Your complete digital ecosystem
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[13px] font-semibold text-slate-600 transition-colors hover:text-[#2563EB]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              preload="intent"
              className="hidden rounded-xl px-3 py-2.5 text-[13px] font-bold text-slate-700 transition-colors hover:text-[#2563EB] sm:block"
            >
              Log in
            </Link>
            <button
              type="button"
              onClick={enter}
              disabled={going}
              className="tap-fast rounded-xl bg-[#2563EB] px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-blue-600/15 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60 sm:px-5"
            >
              Get started
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="rounded-xl p-2 text-slate-700 md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="mx-auto max-w-7xl px-5 py-2">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-slate-100 py-4 text-sm font-semibold text-slate-800"
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
                className="my-4 flex w-full items-center justify-center rounded-xl bg-[#2563EB] py-3.5 text-sm font-bold text-white"
              >
                Open Verxor
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </nav>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-100 bg-[#FBFCFF]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(37,99,235,0.10),transparent_34%),radial-gradient(circle_at_15%_70%,rgba(15,19,50,0.04),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-2 shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Sparkles className="h-3 w-3" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                  Built for the modern internet
                </span>
              </div>

              <h1 className="max-w-3xl text-[43px] font-black leading-[1.02] tracking-[-0.055em] text-[#0F1332] sm:text-6xl lg:text-[70px]">
                Your complete
                <span className="block text-[#2563EB]">digital ecosystem.</span>
              </h1>

              <p className="mt-6 max-w-xl text-[16px] leading-7 text-slate-600 sm:text-[18px] sm:leading-8">
                One account for virtual numbers, dedicated rentals, digital accounts, social & music growth, and tools to build your own digital business.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={enter}
                  disabled={going}
                  className="tap-fast inline-flex items-center justify-center rounded-2xl bg-[#2563EB] px-7 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60"
                >
                  Explore Verxor
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <a
                  href="#services"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:text-[#2563EB]"
                >
                  Explore services
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#2563EB]" /> Secure account</span>
                <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-[#2563EB]" /> Global-first</span>
                <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4 text-[#2563EB]" /> Fast delivery</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[580px] lg:ml-auto">
              <div className="absolute -inset-5 rounded-[40px] bg-blue-100/40 blur-3xl" />
              <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-300/40 sm:p-4">
                <div className="rounded-[24px] border border-slate-100 bg-[#F8FAFD] p-5 sm:p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <VerxorMark className="h-10 w-10 rounded-xl" />
                      <div>
                        <div className="text-sm font-black text-[#0F1332]">Ver<span className="text-[#2563EB]">xor</span></div>
                        <div className="text-[10px] font-semibold text-slate-400">One account. Every service.</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">ONLINE</span>
                  </div>

                  <div className="rounded-2xl bg-[#0F1332] p-5 text-white shadow-xl shadow-slate-900/15 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Available balance</div>
                        <div className="mt-2 text-3xl font-black tracking-tight">$0.00</div>
                      </div>
                      <div className="rounded-xl bg-white/10 p-2.5"><Globe2 className="h-5 w-5 text-white/80" /></div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-white/10 px-3 py-3 text-xs font-semibold">Fund wallet</div>
                      <div className="rounded-xl bg-white/10 px-3 py-3 text-xs font-semibold">View history</div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      ["Virtual numbers", "OTP"],
                      ["Rent a number", "Rental"],
                      ["Social growth", "Growth"],
                      ["Affiliate website", "Business"],
                    ].map(([name, tag]) => (
                      <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div className="text-xs font-bold text-[#0F1332]">{name}</div>
                        <div className="mt-1 text-[10px] font-semibold text-slate-400">{tag}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-100 px-5 py-9 sm:px-6 md:grid-cols-4 lg:px-8">
            {[
              ["100+", "countries targeted"],
              ["1", "unified account"],
              ["5", "core services"],
              ["24/7", "platform access"],
            ].map(([value, label]) => (
              <div key={label} className="px-4 py-2 text-center first:pl-0 last:pr-0 md:px-6">
                <div className="text-2xl font-black tracking-tight text-[#0F1332] sm:text-3xl">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400 sm:text-[11px]">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="scroll-mt-20 bg-[#F8FAFD] px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563EB]">The Verxor ecosystem</div>
                <h2 className="text-3xl font-black tracking-[-0.04em] text-[#0F1332] sm:text-5xl">Everything important. One place.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-500">Designed as one product, not a collection of disconnected tools. Your account, wallet and order experience stay consistent across every service.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {SERVICES.map((service, index) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={enter}
                  className={`tap-fast group overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60 ${index === 4 ? "md:col-span-2" : ""}`}
                >
                  <div className="overflow-hidden border-b border-slate-100 bg-[#F7F9FD]">
                    <BannerSlot src={service.banner} alt={`${service.title} — Verxor`} kind={service.fallback} />
                  </div>
                  <div className="p-6 sm:p-7">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#2563EB]">{service.eyebrow}</div>
                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                      <div className="max-w-xl">
                        <h3 className="text-xl font-black tracking-[-0.025em] text-[#0F1332] sm:text-2xl">{service.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{service.desc}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center text-xs font-bold text-[#2563EB]">Explore <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {service.points.map((point) => (
                        <span key={point} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                          <Check className="h-3 w-3 text-[#2563EB]" /> {point}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="coverage" className="scroll-mt-20 border-y border-slate-100 bg-white px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]"><Globe2 className="h-5 w-5" /></div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563EB]">Global by design</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#0F1332] sm:text-4xl">Built for users everywhere.</h2>
              <p className="mt-4 text-sm leading-6 text-slate-500">Country and currency signals help personalize the experience without taking control away from the user.</p>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {COUNTRIES.map(([flag, name]) => (
                <button key={name} type="button" onClick={enter} className="tap-fast flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#FAFBFD] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md">
                  <span className="text-xl">{flag}</span>
                  <span className="text-xs font-bold text-slate-700">{name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-[#F8FAFD] px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563EB]">Simple by design</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#0F1332] sm:text-4xl">From sign-up to service in minutes.</h2>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                ["01", "Create your account", "Set up one Verxor account and keep your services, orders and wallet activity together."],
                ["02", "Choose a service", "Select a number, rental, account product, growth service or business option from the ecosystem."],
                ["03", "Pay & manage", "Use the appropriate wallet, complete checkout and follow the status of your order from one dashboard."],
              ].map(([number, title, text]) => (
                <div key={number} className="rounded-[26px] border border-slate-200 bg-white p-6 sm:p-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F1332] text-xs font-black text-white">{number}</div>
                  <h3 className="mt-6 text-lg font-black text-[#0F1332]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-[#0F1332] px-7 py-12 text-white shadow-2xl shadow-slate-300/40 sm:px-12 sm:py-14">
            <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">One ecosystem. One account.</div>
                <h2 className="max-w-2xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">Start building your digital workflow with Verxor.</h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Create your account today and explore the platform as it grows into a complete global digital ecosystem.</p>
              </div>
              <button type="button" onClick={enter} disabled={going} className="tap-fast inline-flex items-center justify-center rounded-2xl bg-white px-7 py-4 text-sm font-black text-[#0F1332] transition-all hover:-translate-y-0.5 hover:bg-blue-50 disabled:opacity-60">
                Get started <ArrowRight className="ml-2 h-5 w-5 text-[#2563EB]" />
              </button>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-slate-100 bg-[#F8FAFD] px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563EB]">FAQ</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#0F1332]">Questions, answered.</h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, index) => {
                const open = openFaq === index;
                return (
                  <div key={faq.q} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <button type="button" onClick={() => setOpenFaq(open ? null : index)} className="flex w-full items-center justify-between gap-5 p-5 text-left sm:p-6" aria-expanded={open}>
                      <span className="text-sm font-bold text-[#0F1332] sm:text-[15px]">{faq.q}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && <div className="px-5 pb-5 text-sm leading-6 text-slate-500 sm:px-6 sm:pb-6">{faq.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <VerxorMark className="h-9 w-9 rounded-xl" />
            <div>
              <div className="text-sm font-black text-[#0F1332]">Ver<span className="text-[#2563EB]">xor</span></div>
              <div className="text-[10px] font-semibold text-slate-400">Your complete digital ecosystem</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
            <a href="#services" className="hover:text-[#2563EB]">Services</a>
            <a href="#coverage" className="hover:text-[#2563EB]">Coverage</a>
            <a href="#faq" className="hover:text-[#2563EB]">FAQ</a>
            <Link to="/auth" className="hover:text-[#2563EB]">Account</Link>
          </div>
          <div className="text-xs text-slate-400">© {new Date().getFullYear()} Verxor. All rights reserved.</div>
        </div>
      </footer>

      <InstallPrompt />
    </div>
  );
}

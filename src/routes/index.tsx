import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { VernexMark } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Vernex - Your second number, anywhere in the world.",
      },
      {
        name: "description",
        content:
          "Verify accounts, rent virtual numbers, and manage your digital presence — all from one powerful toolkit built for Nigerians doing global business.",
      },
      {
        property: "og:title",
        content: "Vernex - Your second number, anywhere in the world.",
      },
    ],
  }),
  component: Landing,
});

const NAV = [
  { label: "Virtual Numbers", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#reviews" },
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
    <div className="min-h-screen overflow-x-hidden bg-[#F4F5FC] font-sans text-[#0F172A] antialiased selection:bg-indigo-500 selection:text-white">
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-[#E0E7FF]/60 via-[#F4F5FC]/30 to-transparent" />
      <div className="animate-pulse-glow pointer-events-none absolute right-10 top-20 -z-10 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />
      <div
        className="animate-pulse-glow pointer-events-none absolute left-10 top-40 -z-10 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl"
        style={{ animationDelay: "2.5s" }}
      />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <Link to="/" className="flex items-center space-x-3">
            <VernexMark className="h-10 w-10 rounded-xl shadow-lg shadow-indigo-500/20" />
            <span className="text-xl font-black tracking-tight text-slate-900">
              Vernex<span className="text-indigo-600">.</span>com.ng
            </span>
          </Link>

          <nav className="hidden items-center space-x-8 text-sm font-medium text-slate-600 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-indigo-600"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              to="/auth"
              preload="intent"
              className="hidden px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-indigo-600 sm:inline-block"
            >
              Log In
            </Link>
            <button
              type="button"
              onClick={enter}
              disabled={going}
              className="tap-fast rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition-all duration-200 hover:bg-indigo-600 sm:px-5"
            >
              Get Started
            </button>
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
                className="tap-fast mb-3 mt-3 flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white"
              >
                Get a Number Now
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pb-24 pt-16 md:pb-32 md:pt-24">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="animate-float-slow mb-8 inline-flex items-center space-x-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Canada &amp; USA — OTP Ready
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Your second number, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              anywhere in the world.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg font-normal leading-relaxed text-slate-600 sm:text-xl">
            Verify accounts, rent virtual numbers, and manage your digital presence — all from one
            powerful toolkit built for Nigerians doing global business.
          </p>

          <div className="mb-16 flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <button
              type="button"
              onClick={enter}
              disabled={going}
              className="tap-fast inline-flex w-full transform items-center justify-center rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 sm:w-auto"
            >
              Get a Number Now
              <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Floating cards */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
            <div className="animate-float-slow flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-md">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-lg">
                  🇨🇦
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Canada Mobile</div>
                  <div className="text-sm font-bold text-slate-800">+1 (555) 012-3456</div>
                </div>
              </div>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                OTP READY
              </span>
            </div>

            <div
              className="animate-float-fast flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-md"
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
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="features" className="relative border-y border-slate-200/60 bg-white py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
          {[
            ["50+", "COUNTRIES"],
            ["200K+", "NUMBERS DELIVERED"],
            ["98%", "OTP SUCCESS RATE"],
            ["24/7", "PLATFORM ACCESS"],
          ].map(([value, label]) => (
            <div key={label}>
              <div className="mb-1 text-3xl font-black text-slate-900 sm:text-4xl">{value}</div>
              <div className="text-sm font-medium text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Countries */}
      <section id="pricing" className="relative overflow-hidden px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-indigo-600">
              Global coverage
            </h2>
            <h3 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Unlock numbers from any country instantly.
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {COUNTRIES.map(([flag, name]) => (
              <button
                key={name}
                type="button"
                onClick={enter}
                className="tap-fast group flex cursor-pointer items-center space-x-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl"
              >
                <span className="text-2xl">{flag}</span>
                <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <section id="reviews" className="border-t border-slate-200/60 bg-white px-6 py-10 text-center">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Vernex.com.ng · Your second number, anywhere in the world.
        </p>
      </section>
    </div>
  );
}

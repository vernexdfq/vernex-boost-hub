import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Shield,
  User,
  Settings,
  Lock,
  Cookie,
  Scale,
  Plug,
  RefreshCw,
  Mail,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Verxor" },
      {
        name: "description",
        content: "How Verxor collects, uses, and protects your personal data.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

const SECTIONS = [
  {
    id: "01",
    title: "Information We Collect",
    icon: User,
    body: "We may collect personal details such as your full name, email address, phone number, payment information, and usage data when you create an account or use our services. Additional verification details may be requested for security and compliance purposes.",
  },
  {
    id: "02",
    title: "How We Use Your Information",
    icon: Settings,
    body: "Your information helps us process transactions, verify identity (KYC), deliver digital services (virtual numbers, eSIMs, boosting), improve user experience, and enhance platform security. We may also use anonymized data for service optimization and analytics.",
  },
  {
    id: "03",
    title: "Data Protection",
    icon: Lock,
    body: "We use industry-standard encryption (SSL/TLS), secure infrastructure, and access controls to protect your data. Sensitive fields such as payment details are handled by certified payment partners and are never stored in plain text on our servers.",
  },
  {
    id: "04",
    title: "Cookies",
    icon: Cookie,
    body: "Our platform uses cookies to remember your preferences and improve performance. You can disable cookies in your browser settings, though some features may not function properly without them.",
  },
  {
    id: "05",
    title: "Your Rights",
    icon: Scale,
    body: "You have the right to access, modify, or delete your personal data at any time. For data deletion or account closure, please reach out to our support team with your registered email address.",
  },
  {
    id: "06",
    title: "Third-Party Services",
    icon: Plug,
    body: "We work with trusted providers (SMS gateways, payment processors, SMM suppliers) to deliver services. These providers have their own privacy policies, and we encourage you to review them before use.",
  },
  {
    id: "07",
    title: "Updates to This Policy",
    icon: RefreshCw,
    body: "We may update this Privacy Policy from time to time to reflect service improvements or legal requirements. All updates will be published on this page, and continued use of our services implies acceptance of any changes.",
  },
] as const;

function PrivacyPolicy() {
  const [openId, setOpenId] = useState<string | null>("01");

  return (
    <AppShell>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md">
        <Link
          to="/profile"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-bold">Privacy Policy</h1>
          <p className="text-[11px] text-muted-foreground">Legal document</p>
        </div>
      </header>

      <div className="space-y-4 px-4 pb-10 pt-4">
        <div className="relative overflow-hidden rounded-2xl wallet-gradient p-5 text-white shadow-wallet">
          <div className="absolute inset-0 dotted-bg opacity-30" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Legal document
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight">Privacy Policy</h2>
            <p className="mt-1.5 text-sm text-white/80">
              Your trust is our foundation. Here's exactly how we collect, use, and protect your personal data.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-white/70">
              <span>Last updated: January 2025</span>
              <span>·</span>
              <span>3 min read</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> SSL Encrypted
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <div className="flex gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              At Verxor, your privacy and trust are our top priorities. This policy describes how we collect,
              use, and protect your personal data when you use our{" "}
              <span className="font-semibold text-foreground">Virtual Numbers, rentals, or Boosting Services</span>.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const open = openId === s.id;
            return (
              <div
                key={s.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card-elev"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : s.id)}
                  className="tap-fast flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">{s.title}</span>
                  <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary">
                    {s.id}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-card-elev">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold">Have questions?</h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            If you have concerns about our Privacy Policy or how your data is handled, our support team is here to help.
          </p>
          <a
            href="mailto:help@verxor.com"
            className="tap-fast mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm"
          >
            <Mail className="h-4 w-4" />
            help@verxor.com
          </a>
        </div>
      </div>
    </AppShell>
  );
}

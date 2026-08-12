import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Copy,
  Check,
  Lock,
  Shield,
  FileText,
  Bell,
  HelpCircle,
  MessageSquare,
  LogOut,
  ChevronRight,
  Send,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { fetchAccount } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import { copyWithHaptic } from "@/lib/haptic";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Vernex" },
      {
        name: "description",
        content: "Manage your Vernex account, security PIN and preferences.",
      },
      { property: "og:title", content: "Vernex Profile" },
      {
        property: "og:description",
        content: "Update account details, security PIN and preferences.",
      },
    ],
  }),
  component: Profile,
});

function buildReferralCode(fullName: string | null | undefined, userId: string) {
  const base =
    (fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0]
      ?.toUpperCase()
      .replace(/[^A-Z0-9]/g, "") || "USER";
  const tail = userId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `VERNEX-${base}${tail ? `-${tail}` : ""}`.slice(0, 24);
}

function formatMemberSince(iso?: string | null) {
  if (!iso) return "2026";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return "2026";
  }
}

function Profile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
  });

  const name =
    data?.profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Vernex user";
  const email = data?.profile?.email ?? user.email ?? "—";
  const phone = data?.profile?.phone ?? "—";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  const referralCode = useMemo(
    () => buildReferralCode(data?.profile?.full_name, user.id),
    [data?.profile?.full_name, user.id],
  );

  const memberSince = formatMemberSince(
    (user as { created_at?: string }).created_at ?? null,
  );

  async function handleCopyReferral() {
    const ok = await copyWithHaptic(referralCode);
    if (ok) {
      setCopied(true);
      toast.success("Referral code copied");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy");
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell showThemeToggle={false}>
      <div className="min-h-screen bg-[#0F172A] px-4 pb-8 pt-6 text-slate-100">
        {/* Header card */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-5 shadow-lg">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/15 blur-2xl" />
          <div className="relative flex items-center space-x-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 text-xl font-bold text-white shadow-md">
              {initials || "V"}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">{name}</h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Member since {memberSince}
              </p>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Account Information
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-sm backdrop-blur-md">
            <InfoRow icon={User} label="Full Name" value={name} />
            <InfoRow icon={Mail} label="Email" value={email} />
            <InfoRow icon={Phone} label="Phone" value={phone} />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-blue-400">
                  <Copy size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Referral Code
                  </p>
                  <p className="text-sm font-semibold text-white">{referralCode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyReferral()}
                className="tap-fast flex items-center space-x-1.5 rounded-xl bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Security
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-sm backdrop-blur-md">
            <MenuRow
              icon={Lock}
              iconClass="bg-amber-500/10 text-amber-400"
              label="Change PIN"
              onClick={() => toast.message("Open Change PIN from Security soon.")}
            />
            <MenuRow
              icon={Shield}
              iconClass="bg-blue-500/10 text-blue-400"
              label="Change Password"
              onClick={() => toast.message("Password change coming soon.")}
            />
            <MenuRow
              icon={FileText}
              iconClass="bg-blue-500/10 text-blue-400"
              label="Privacy Policy"
              border={false}
              onClick={() => toast.message("Privacy Policy")}
            />
          </div>
        </div>

        {/* Support */}
        <div className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Support
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-sm backdrop-blur-md">
            <Link
              to="/alerts"
              className="flex w-full items-center justify-between border-b border-slate-800/60 p-4 text-left transition hover:bg-slate-800/40"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Bell size={18} />
                </div>
                <span className="text-sm font-medium text-white">Notifications</span>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </Link>

            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="flex w-full items-center justify-between border-b border-slate-800/60 p-4 text-left transition hover:bg-slate-800/40"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <HelpCircle size={18} />
                </div>
                <span className="text-sm font-medium text-white">Help & Support</span>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() =>
                window.open(
                  "https://t.me/vernex_support",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-800/40"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <MessageSquare size={18} />
                </div>
                <span className="text-sm font-medium text-white">Feedback</span>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="tap-fast flex w-full items-center justify-center space-x-2 rounded-2xl border border-slate-800 bg-slate-900 py-3.5 font-semibold text-red-400 shadow-sm transition hover:border-red-500/30 hover:bg-red-500/10"
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>

        {/* Support modal */}
        {supportOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="w-full max-w-md rounded-t-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:rounded-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Support Center</h3>
                  <p className="text-xs text-slate-400">
                    Hi {name.split(" ")[0]}! How can we help you today?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSupportOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <SupportLink
                  href="https://t.me/vernex_support"
                  title="Telegram Support"
                  subtitle="Chat with us instantly via Telegram."
                  icon={<Send size={20} />}
                  iconClass="bg-blue-500/10 text-blue-400"
                  badge="1-4 hrs"
                  badgeClass="bg-blue-500/20 text-blue-300"
                />
                <SupportLink
                  href="https://t.me/VernexOfficial"
                  title="Join Our Telegram Channel"
                  subtitle="Get announcements, tips, and updates."
                  icon={<Send size={20} />}
                  iconClass="bg-blue-500/10 text-blue-400"
                  badge="Community"
                  badgeClass="bg-blue-500/20 text-blue-400"
                />
                <SupportLink
                  href="https://wa.me/2348062362896"
                  title="WhatsApp Support"
                  subtitle="Message us directly on WhatsApp."
                  icon={<MessageCircle size={20} />}
                  iconClass="bg-blue-500/10 text-blue-400"
                  trailing={<ExternalLink size={16} className="text-slate-400" />}
                />
                <SupportLink
                  href="https://whatsapp.com/channel/0029Vb9BSNW9Bb5tm67fvH3B"
                  title="Join Our WhatsApp Channel"
                  subtitle="Stay updated via WhatsApp broadcasts."
                  icon={<MessageCircle size={20} />}
                  iconClass="bg-blue-500/10 text-blue-400"
                  badge="Community"
                  badgeClass="bg-blue-500/20 text-blue-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="tap-fast mt-6 w-full rounded-xl bg-slate-800 py-3 font-medium text-white transition hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  border = true,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value?: string;
  border?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 ${
        border ? "border-b border-slate-800/60" : ""
      }`}
    >
      {children ? (
        children
      ) : (
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-blue-400">
            <Icon size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <p className="text-sm font-semibold text-white">{value}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({
  icon: Icon,
  iconClass,
  label,
  onClick,
  border = true,
}: {
  icon: React.ComponentType<{ size?: number }>;
  iconClass: string;
  label: string;
  onClick: () => void;
  border?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap-fast flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-800/40 ${
        border ? "border-b border-slate-800/60" : ""
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <ChevronRight size={18} className="text-slate-500" />
    </button>
  );
}

function SupportLink({
  href,
  title,
  subtitle,
  icon,
  iconClass,
  badge,
  badgeClass,
  trailing,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
  badge?: string;
  badgeClass?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 transition hover:bg-slate-800"
    >
      <div className="flex items-center space-x-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-105 ${iconClass}`}
        >
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      {badge ? (
        <span className={`rounded-lg px-2 py-1 text-xs font-medium ${badgeClass}`}>
          {badge}
        </span>
      ) : (
        trailing
      )}
    </a>
  );
}

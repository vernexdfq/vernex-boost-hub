import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
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
  Delete,
  Eye,
  EyeOff,
  Loader2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { fetchAccount } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import { copyWithHaptic } from "@/lib/haptic";
import { saveUserPin } from "@/lib/functions/auth.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Profile — Vernex" }],
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

function Profile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["account", user.id],
    queryFn: () => fetchAccount(user.id),
  });

  const name =
    data?.profile?.full_name?.trim() || user.email?.split("@")[0] || "Vernex user";
  const email = data?.profile?.email ?? user.email ?? "—";
  const phone = data?.profile?.phone ?? "—";
  const pinSet = Boolean(data?.profile?.pin_set);
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

  async function handleCopyReferral() {
    const ok = await copyWithHaptic(referralCode);
    if (ok) {
      setCopied(true);
      toast.success("Referral code copied");
      setTimeout(() => setCopied(false), 2000);
    } else toast.error("Could not copy");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <div className="px-4 pb-8 pt-6">
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card-elev">
          <div className="relative flex items-center space-x-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full brand-gradient text-xl font-bold text-white shadow-md">
              {initials || "V"}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">{name}</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Member profile</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account Information
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card-elev">
            <InfoRow icon={User} label="Full Name" value={name} />
            <InfoRow icon={Mail} label="Email" value={email} />
            <InfoRow icon={Phone} label="Phone" value={phone} />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl icon-well">
                  <Copy size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Referral Code
                  </p>
                  <p className="text-sm font-semibold text-foreground">{referralCode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyReferral()}
                className="tap-fast flex items-center space-x-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Security
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card-elev">
            <MenuRow
              icon={Lock}
              iconClass="bg-amber-500/10 text-amber-500"
              label={pinSet ? "Change PIN" : "Set PIN"}
              onClick={() => setPinOpen(true)}
            />
            <MenuRow
              icon={Shield}
              iconClass="bg-primary/10 text-primary"
              label="Change Password"
              onClick={() => setPasswordOpen(true)}
            />
            <Link
              to="/privacy-policy"
              className="tap-fast flex w-full items-center justify-between p-4 text-left transition hover:bg-muted/50"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText size={18} />
                </div>
                <span className="text-sm font-medium text-foreground">Privacy Policy</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Support
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card-elev">
            <Link
              to="/alerts"
              className="flex w-full items-center justify-between border-b border-border p-4 text-left transition hover:bg-muted/50"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bell size={18} />
                </div>
                <span className="text-sm font-medium text-foreground">Notifications</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </Link>
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="flex w-full items-center justify-between border-b border-border p-4 text-left transition hover:bg-muted/50"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HelpCircle size={18} />
                </div>
                <span className="text-sm font-medium text-foreground">Help & Support</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
            <Link
              to="/feedback"
              className="flex w-full items-center justify-between p-4 text-left transition hover:bg-muted/50"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare size={18} />
                </div>
                <span className="text-sm font-medium text-foreground">Feedback</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="tap-fast flex w-full items-center justify-center space-x-2 rounded-2xl border border-border bg-surface py-3.5 font-semibold text-destructive shadow-sm"
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>

        {supportOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 shadow-2xl sm:rounded-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Support Center</h3>
                  <p className="text-xs text-muted-foreground">How can we help you today?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSupportOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <a
                  href="https://t.me/vernex_support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-4"
                >
                  <Send size={20} className="text-[#2563EB]" />
                  <span className="text-sm font-semibold">Telegram Support</span>
                </a>
                <a
                  href="https://wa.me/2348141620644"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-4"
                >
                  <MessageCircle size={20} className="text-[#16A34A]" />
                  <span className="text-sm font-semibold">WhatsApp Support</span>
                </a>
              </div>
              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="mt-6 w-full rounded-xl bg-muted py-3 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {pinOpen && (
          <ChangePinSheet
            email={user.email ?? ""}
            userId={user.id}
            pinSet={pinSet}
            onClose={() => setPinOpen(false)}
            onSuccess={() => {
              void queryClient.invalidateQueries({ queryKey: ["account", user.id] });
              setPinOpen(false);
            }}
          />
        )}

        {passwordOpen && (
          <ChangePasswordSheet email={user.email ?? ""} onClose={() => setPasswordOpen(false)} />
        )}
      </div>
    </AppShell>
  );
}

function ChangePinSheet({
  email,
  userId,
  pinSet,
  onClose,
  onSuccess,
}: {
  email: string;
  userId: string;
  pinSet: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"password" | "pin" | "confirm">("password");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);

  const activeValue = step === "pin" ? pin : confirmPin;
  const setActiveValue = step === "pin" ? setPin : setConfirmPin;

  async function verifyPassword() {
    if (!password.trim()) {
      toast.error("Enter your account password");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Incorrect password");
        return;
      }
      setStep("pin");
    } catch {
      toast.error("Could not verify password");
    } finally {
      setBusy(false);
    }
  }

  const pressDigit = useCallback(
    (d: string) => {
      if (activeValue.length >= 4) return;
      const next = activeValue + d;
      setActiveValue(next);
      if (next.length === 4 && step === "pin") setTimeout(() => setStep("confirm"), 180);
    },
    [activeValue, setActiveValue, step],
  );

  async function savePin() {
    if (pin.length !== 4 || confirmPin.length !== 4) return;
    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      setConfirmPin("");
      return;
    }
    setBusy(true);
    try {
      await saveUserPin({ data: { userId, pin } });
      toast.success(pinSet ? "PIN updated successfully" : "PIN set successfully");
      onSuccess();
    } catch {
      toast.error("Could not save PIN. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {step === "password" ? (pinSet ? "Change PIN" : "Set PIN") : step === "pin" ? "Enter new 4-digit PIN" : "Confirm your PIN"}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {step === "password" ? "Enter your account password to continue" : step === "pin" ? "Choose a 4-digit PIN" : "Re-enter the same 4 digits"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {step === "password" ? (
          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                className="w-full rounded-xl border border-border bg-background px-3 py-3.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void verifyPassword();
                }}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void verifyPassword()}
              className="tap-fast flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Verifying…" : "Continue"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border-2 ${
                    i < activeValue.length ? "border-primary bg-primary" : "border-border"
                  }`}
                />
              ))}
            </div>
            <div className="mx-auto grid max-w-[280px] grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => {
                if (key === "") return <div key="empty" />;
                if (key === "del") {
                  return (
                    <button
                      key="del"
                      type="button"
                      onClick={() => setActiveValue((v) => v.slice(0, -1))}
                      className="flex h-14 items-center justify-center rounded-2xl border border-border bg-background"
                      aria-label="Delete"
                    >
                      <Delete size={20} />
                    </button>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pressDigit(key)}
                    className="flex h-14 items-center justify-center rounded-2xl border border-border bg-background text-xl font-semibold"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
            {step === "confirm" && (
              <button
                type="button"
                disabled={busy || confirmPin.length !== 4}
                onClick={() => void savePin()}
                className="tap-fast flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Saving…" : "Save PIN"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChangePasswordSheet({ email, onClose }: { email: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendReset() {
    if (!email) {
      toast.error("No email on this account");
      return;
    }
    setBusy(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "https://vernex.com.ng";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent to your email");
    } catch {
      toast.error("Could not send reset email. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Change Password</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">We'll send a secure reset link to your email</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Check <span className="font-semibold text-foreground">{email}</span> for a password reset link.
            </p>
            <button type="button" onClick={onClose} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{email || "—"}</p>
            </div>
            <button
              type="button"
              disabled={busy || !email}
              onClick={() => void sendReset()}
              className="tap-fast flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail size={16} />}
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border p-4">
      <div className="flex items-center space-x-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl icon-well">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  iconClass,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  iconClass: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-fast flex w-full items-center justify-between border-b border-border p-4 text-left transition hover:bg-muted/50"
    >
      <div className="flex items-center space-x-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <ChevronRight size={18} className="text-muted-foreground" />
    </button>
  );
}

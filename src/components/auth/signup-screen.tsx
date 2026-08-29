import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { signUpWithPin } from "@/lib/functions/auth.functions";

type Props = {
  busy: boolean;
  onSuccess: (email: string) => void;
  onBack: () => void;
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  const d = digitsOnly(value).slice(0, 15);
  if (d.startsWith("234")) {
    const rest = d.slice(3);
    return `+234 ${rest.replace(/(\d{3})(\d{3})(\d{0,4}).*/, "$1 $2 $3").trim()}`.trim();
  }
  return d.replace(/(\d{4})(\d{3})(\d{0,4}).*/, "$1 $2 $3").trim() || d;
}

function buildRegistrationIdentity(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "Verxor";
  const lastName = parts.slice(1).join(" ") || "User";
  const base = fullName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14) || "verxoruser";
  const username = `${base}${Date.now().toString().slice(-5)}`.slice(0, 20);
  return { firstName, lastName, username };
}

export function SignupScreen({ busy, onSuccess, onBack }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 6,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
    }),
    [password],
  );

  const passwordValid =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number;
  const pinValid = /^\d{4}$/.test(pin);

  const formValid =
    fullName.trim().length >= 2 &&
    digitsOnly(phone).length >= 10 &&
    email.trim().includes("@") &&
    passwordValid &&
    pinValid;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || busy || !formValid) return;

    setError(null);
    setSubmitting(true);

    try {
      const identity = buildRegistrationIdentity(fullName);
      const result = await signUpWithPin({
        data: {
          ...identity,
          phone,
          email: email.trim().toLowerCase(),
          password,
          pin,
          referralCode: referralCode.trim() || undefined,
        },
      });
      setSubmitted(true);
      onSuccess(result.email);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-5 py-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <h2 className="mt-4 text-xl font-black tracking-tight text-slate-900">
          Account created
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600">
          Your Verxor account is ready. Sign in with your email or phone and your
          4-digit PIN.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="signup-full-name" className={labelClass}>
          Full Name
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-600" />
          <input
            id="signup-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            placeholder="Enter your full name"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="signup-phone" className={labelClass}>
          Phone Number
        </label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-600" />
          <input
            id="signup-phone"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08012345678"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="signup-email" className={labelClass}>
          Email Address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-600" />
          <input
            id="signup-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="signup-password" className={labelClass}>
          Password
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-600" />
          <input
            id="signup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a strong password"
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium">
          {(
            [
              [passwordChecks.length, "6+ characters"],
              [passwordChecks.upper, "uppercase"],
              [passwordChecks.lower, "lowercase"],
              [passwordChecks.number, "number"],
            ] as const
          ).map(([valid, label]) => (
            <span key={label} className={valid ? "text-emerald-600" : "text-slate-400"}>
              {valid ? "✓" : "·"} {label}
            </span>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="signup-pin" className={labelClass}>
          4-Digit Transaction PIN
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-600" />
          <input
            id="signup-pin"
            value={pin}
            onChange={(e) => setPin(digitsOnly(e.target.value).slice(0, 4))}
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            placeholder="••••"
            className={`${inputClass} pr-12 tracking-[0.4em]`}
          />
          <button
            type="button"
            onClick={() => setShowPin((v) => !v)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={showPin ? "Hide PIN" : "Show PIN"}
          >
            {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <div
          className="mt-2.5 flex items-center gap-2"
          aria-label={`${pin.length} of 4 PIN digits entered`}
        >
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full transition ${
                index < pin.length ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Used to authorise transactions — keep it private.
        </p>
      </div>

      <div>
        <label htmlFor="signup-referral" className={labelClass}>
          Referral code{" "}
          <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="signup-referral"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase().slice(0, 24))}
          autoComplete="off"
          placeholder="VERXOR-XXXX"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold tracking-wide text-slate-900 outline-none transition placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!formValid || submitting || busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {(submitting || busy) && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-slate-400">
        By continuing you agree to Verxor&apos;s{" "}
        <a href="/terms" className="font-semibold text-indigo-600 hover:underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="font-semibold text-indigo-600 hover:underline">
          Privacy Policy
        </a>
        .
      </p>

      <div className="pt-0.5 text-center text-xs text-slate-500">
        <span>Already have an account? </span>
        <button
          type="button"
          onClick={onBack}
          className="font-bold text-indigo-600 hover:underline"
        >
          Sign In
        </button>
      </div>
    </form>
  );
}

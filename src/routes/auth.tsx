import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Delete,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Ticket,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  checkIdentifierRegistered,
  signInWithPin,
  signUpWithPin,
} from "@/lib/functions/auth.functions";

function AuthError({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[auth]", error);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F5FC] px-6 text-center">
      <h1 className="text-xl font-black text-slate-900">Sign in unavailable</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Something went wrong loading this page. Please try again.
      </p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  errorComponent: AuthError,
  head: () => ({
    meta: [
      { title: "Sign In or Create Account — Vernex" },
      {
        name: "description",
        content:
          "Access your Vernex wallet, virtual numbers and SMM orders. Sign in with your phone number and PIN, or create a free account in seconds.",
      },
      { property: "og:title", content: "Sign In or Create Account — Vernex" },
      {
        property: "og:description",
        content: "Secure access to your Vernex wallet, virtual numbers and boost orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

/* ------------------------------------------------------------------ */
/* validation                                                          */
/* ------------------------------------------------------------------ */

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);
const nameSchema = z.string().trim().min(2, "This field is required").max(40);

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function isValidPhone(value: string) {
  const d = digitsOnly(value);
  return d.length >= 10 && d.length <= 15;
}

function isValidEmail(value: string) {
  return emailSchema.safeParse(value).success;
}

function formatPhone(value: string) {
  const d = digitsOnly(value).slice(0, 15);
  if (d.startsWith("234")) {
    const rest = d.slice(3);
    return `+234 ${rest.replace(/(\d{3})(\d{3})(\d{0,4}).*/, "$1 $2 $3").trim()}`.trim();
  }
  return d.replace(/(\d{4})(\d{3})(\d{0,4}).*/, "$1 $2 $3").trim() || d;
}

type Screen = "signin" | "pin" | "signup";
type SignInTab = "phone" | "email";

/* ------------------------------------------------------------------ */
/* logo mark (inline — no asset load risk)                             */
/* ------------------------------------------------------------------ */

function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/25 ${className}`}
      aria-hidden
    >
      V
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

function AuthPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("signin");
  const [busy, setBusy] = useState(false);

  // Only redirect AFTER a successful login in this page session.
  // Do NOT restore / skip login from any stored session (shared-phone safety).
  useEffect(() => {
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          navigate({ to: "/dashboard", replace: true });
        }
      });
      return () => {
        try {
          sub.subscription.unsubscribe();
        } catch {
          /* ignore */
        }
      };
    } catch (err) {
      console.error("[auth] onAuthStateChange failed", err);
      return undefined;
    }
  }, [navigate]);

  /* sign-in state */
  const [tab, setTab] = useState<SignInTab>("email");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const identifier = tab === "phone" ? phone : email.trim();
  const continueEnabled = tab === "phone" ? isValidPhone(phone) : isValidEmail(email);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !continueEnabled) return;
    setFieldError(null);
    setBusy(true);
    try {
      const { exists } = await checkIdentifierRegistered({ data: { identifier } });
      if (!exists) {
        setFieldError(
          tab === "phone"
            ? "We couldn't find an account with that number."
            : "We couldn't find an account with that email.",
        );
        return;
      }
      setPin("");
      setPinError(null);
      setScreen("pin");
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function submitPin(value: string) {
    if (busy) return;
    setBusy(true);
    setPinError(null);
    try {
      const ticket = await signInWithPin({ data: { identifier, pin: value } });
      const { error } = await supabase.auth.verifyOtp({
        email: ticket.email,
        token: ticket.token,
        type: "email",
      });
      if (error) throw error;
      toast.success("Welcome back to Vernex");
    } catch (err) {
      setPin("");
      setPinError(err instanceof Error ? err.message : "Incorrect PIN");
    } finally {
      setBusy(false);
    }
  }


  function pressKey(key: string) {
    if (busy) return;
    setPinError(null);
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => {
      if (p.length >= 4) return p;
      const next = p + key;
      if (next.length === 4) void submitPin(next);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#F4F5FC] p-6 text-slate-900 antialiased">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="pt-2">
          {screen === "pin" ? (
            <button
              type="button"
              onClick={() => setScreen("signin")}
              className="inline-flex items-center text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              <ArrowLeft className="mr-2 h-5 w-5" /> Back
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              <ArrowLeft className="mr-2 h-5 w-5" /> Back
            </Link>
          )}
        </header>

        <main className="my-auto w-full py-8">
        <BrandHeading screen={screen} />

        <div key={screen} className="">
          {screen === "signin" && (
            <SignInScreen
              tab={tab}
              setTab={(next) => {
                setTab(next);
                setFieldError(null);
              }}
              phone={phone}
              setPhone={(v) => {
                setPhone(v);
                setFieldError(null);
              }}
              email={email}
              setEmail={(v) => {
                setEmail(v);
                setFieldError(null);
              }}
              busy={busy}
              enabled={continueEnabled}
              error={fieldError}
              onSubmit={handleContinue}
              onCreateAccount={() => {
                setFieldError(null);
                setScreen("signup");
              }}
            />
          )}

          {screen === "pin" && (
            <PinScreen
              identifier={tab === "phone" ? formatPhone(phone) || phone : email.trim()}
              pin={pin}
              busy={busy}
              error={pinError}
              onKey={pressKey}
              onChangeNumber={() => setScreen("signin")}
            />
          )}

          {screen === "signup" && (
            <SignUpScreen
              busy={busy}
              setBusy={setBusy}
              onSignIn={() => setScreen("signin")}
              onRegistered={(registeredEmail) => {
                setTab("email");
                setEmail(registeredEmail);
                setScreen("signin");
              }}
            />
          )}
        </div>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* header                                                              */
/* ------------------------------------------------------------------ */

function BrandHeading({ screen }: { screen: Screen }) {
  if (screen === "signup") {
    return (
      <div className="mt-6">
        <div className="mb-4 inline-flex items-center space-x-2 rounded-full border border-slate-200/80 bg-white px-3.5 py-1 shadow-sm">
          <span className="text-xs">🚀</span>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Get started for free
          </span>
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">
          Create your account
        </h1>
        <p className="mb-2 text-sm font-normal text-slate-500">
          Fill in your details below to get started
        </p>
      </div>
    );
  }

  if (screen === "signin") {
    return (
      <div className="mt-6">
        <div className="mb-6 flex items-center space-x-3">
          <LogoMark className="h-10 w-10" />
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">
          Welcome back 👋
        </h1>
        <p className="mb-2 text-sm font-normal text-slate-500">Sign in to your Vernex account</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center space-x-3">
        <LogoMark className="h-10 w-10" />
      </div>
      <h1 className="mb-1 flex items-center space-x-2 text-2xl font-black tracking-tight text-slate-900">
        <span>Enter your PIN</span>
        <span className="text-lg" aria-hidden>
          🔒
        </span>
      </h1>
      <p className="mb-2 text-xs font-normal text-slate-500">
        Authorise your login with your 4-digit Vernex PIN
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* sign in                                                             */
/* ------------------------------------------------------------------ */

function SignInScreen(props: {
  tab: SignInTab;
  setTab: (t: SignInTab) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  busy: boolean;
  enabled: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCreateAccount: () => void;
}) {
  const inputClass =
    "w-full rounded-2xl border border-slate-200/80 bg-white py-4 pl-12 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  return (
    <>
      {/* Phone / Email toggle */}
      <div className="mb-6 flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => props.setTab("phone")}
          aria-pressed={props.tab === "phone"}
          className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all duration-200 ${
            props.tab === "phone"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Phone Number
        </button>
        <button
          type="button"
          onClick={() => props.setTab("email")}
          aria-pressed={props.tab === "email"}
          className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all duration-200 ${
            props.tab === "email"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Email Address
        </button>
      </div>

      <form onSubmit={props.onSubmit} className="space-y-6">
        {props.tab === "email" ? (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-indigo-500">
                <Mail className="h-5 w-5" />
              </span>
              <input
                value={props.email}
                onChange={(e) => props.setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Phone Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-indigo-500">
                <Phone className="h-5 w-5" />
              </span>
              <input
                value={props.phone}
                onChange={(e) => props.setPhone(formatPhone(e.target.value))}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0803 123 4567"
                className={inputClass}
              />
            </div>
          </div>
        )}

        {props.error && (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {props.error}
          </p>
        )}

        <button
          type="submit"
          disabled={!props.enabled || props.busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-center text-sm font-bold text-white shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {props.busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm font-normal text-slate-500">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={props.onCreateAccount}
            className="font-bold text-indigo-600 hover:underline"
          >
            Create one free
          </button>
        </p>
      </div>

      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200/60 bg-white/60 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm backdrop-blur-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Bank-grade encryption · NDPR compliant</span>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* PIN                                                                 */
/* ------------------------------------------------------------------ */

function PinScreen(props: {
  identifier: string;
  pin: string;
  busy: boolean;
  error: string | null;
  onKey: (key: string) => void;
  onChangeNumber: () => void;
}) {
  const keys = useMemo(() => ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"], []);

  return (
    <div className="mt-2 w-full">
      {/* Signing in as */}
      <p className="mb-6 text-xs font-medium text-slate-600">
        Signing in as{" "}
        <span className="font-bold text-slate-900">{props.identifier}</span>
      </p>

      {/* 4 PIN boxes */}
      <div className="mb-8 flex justify-center space-x-4" aria-label="PIN entry">
        {[0, 1, 2, 3].map((i) => {
          const filled = props.pin.length > i;
          const active = props.pin.length === i;
          return (
            <div
              key={i}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm transition-all ${
                filled
                  ? "border-2 border-indigo-600 shadow-md shadow-indigo-600/10"
                  : active
                    ? "border-2 border-indigo-300"
                    : "border border-slate-200/80"
              }`}
            >
              {filled ? <span className="h-3 w-3 rounded-full bg-indigo-600" /> : null}
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div className="mb-4 min-h-[1.25rem] text-center">
        {props.busy ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" /> Verifying PIN…
          </span>
        ) : props.error ? (
          <span className="text-xs font-semibold text-red-600">{props.error}</span>
        ) : null}
      </div>

      {/* Keypad */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {keys.map((key, index) =>
          key === "" ? (
            <div key={`spacer-${index}`} />
          ) : key === "del" ? (
            <button
              key={key}
              type="button"
              onClick={() => props.onKey(key)}
              disabled={props.busy}
              aria-label="Delete"
              className="flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-4 text-red-600 shadow-sm transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50"
            >
              <Delete className="h-6 w-6" />
            </button>
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => props.onKey(key)}
              disabled={props.busy}
              className="rounded-2xl border border-slate-200/80 bg-white py-4 text-lg font-bold text-slate-800 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            >
              {key}
            </button>
          ),
        )}
      </div>

      {/* Footer links */}
      <div className="flex items-center justify-between pt-2 text-xs font-bold">
        <button
          type="button"
          onClick={props.onChangeNumber}
          className="text-slate-600 transition-colors hover:text-indigo-600"
        >
          ← Change number / email
        </button>
        <button
          type="button"
          disabled={props.busy}
          onClick={async () => {
            const email = props.identifier.includes("@") ? props.identifier : null;
            if (!email) {
              toast.info("Go back and continue with your email address to reset your PIN.");
              return;
            }
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/auth`,
            });
            if (error) toast.error(error.message);
            else toast.success(`We sent recovery instructions to ${email}`);
          }}
          className="text-indigo-600 hover:underline disabled:opacity-50"
        >
          Forgot PIN?
        </button>
      </div>

      {/* Trust badge */}
      <div className="mt-10 text-center">
        <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200/60 bg-white/60 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm backdrop-blur-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Bank-grade encryption · NDPR compliant</span>
        </div>
      </div>
    </div>
  );
}

function SignUpScreen(props: {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onSignIn: () => void;
  onRegistered: (email: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [referral, setReferral] = useState("");
  const [error, setError] = useState<string | null>(null);

  const usernameOk = /^[a-zA-Z0-9_]{3,20}$/.test(username.trim());
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName;

  const valid =
    nameSchema.safeParse(firstName).success &&
    nameSchema.safeParse(lastName).success &&
    usernameOk &&
    isValidPhone(phone) &&
    isValidEmail(email) &&
    passwordSchema.safeParse(password).success &&
    /^\d{4}$/.test(pin);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (props.busy || !valid) return;
    setError(null);
    props.setBusy(true);
    try {
      const payload = {
        firstName,
        lastName,
        username: username.trim(),
        phone,
        email,
        password,
        pin,
        ...(referral.trim() ? { referralCode: referral.trim() } : {}),
      };
      const result = await signUpWithPin({ data: payload });
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      });
      if (signInError) {
        toast.success("Account created — please sign in.");
        props.onRegistered(result.email);
        return;
      }
      toast.success("Welcome to Vernex 🎉");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not create your account");
    } finally {
      props.setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-slate-200/80 bg-white py-4 pl-12 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      {/* Full Name */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Full Name
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-indigo-500">
            <UserIcon className="h-5 w-5" />
          </span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            maxLength={80}
            placeholder="Destiny Ikedi"
            className={inputClass}
          />
        </div>
      </div>

      {/* Username */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Username
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-indigo-500">
            <UserIcon className="h-5 w-5" />
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            autoComplete="username"
            maxLength={20}
            placeholder="destinyokoro"
            className={inputClass}
          />
        </div>
        <p className="pl-1 text-[11px] text-slate-400">
          3-20 characters — letters, numbers and underscores
        </p>
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Phone Number
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-indigo-500">
            <Phone className="h-5 w-5" />
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 123 4567"
            className={inputClass}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Email Address
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-indigo-500">
            <Mail className="h-5 w-5" />
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            maxLength={255}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Password
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-indigo-500">
            <Lock className="h-5 w-5" />
          </span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            maxLength={72}
            placeholder="••••••••"
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 text-slate-400 transition hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <p className="pl-1 text-[11px] text-slate-400">Minimum of 8 characters</p>
      </div>

      {/* PIN */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          4-Digit Transaction PIN
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-indigo-500">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <input
            value={pin}
            onChange={(e) => setPin(digitsOnly(e.target.value).slice(0, 4))}
            inputMode="numeric"
            type="password"
            maxLength={4}
            placeholder="••••"
            className={`${inputClass} tracking-widest`}
          />
        </div>
        <p className="pl-1 text-[11px] text-slate-400">
          Used to authorise transactions — keep it secret
        </p>
      </div>

      {/* Referral */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Referral Code (Optional)
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-indigo-500">
            <Ticket className="h-5 w-5" />
          </span>
          <input
            value={referral}
            onChange={(e) => setReferral(e.target.value.toUpperCase())}
            maxLength={24}
            placeholder="VNX-XXXX"
            className={`${inputClass} uppercase`}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={!valid || props.busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-center text-sm font-bold text-white shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {props.busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Account
        </button>
      </div>

      <p className="pt-1 text-center text-[11px] font-medium text-slate-400">
        By clicking continue, you agree to Vernex&apos;s{" "}
        <span className="text-indigo-600">Terms of Service</span> and{" "}
        <span className="text-indigo-600">Privacy Policy</span>.
      </p>

      <div className="mt-4 text-center">
        <p className="text-sm font-normal text-slate-500">
          Already have an account?{" "}
          <button
            type="button"
            onClick={props.onSignIn}
            className="font-bold text-indigo-600 hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>

      <div className="pt-4 text-center">
        <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200/60 bg-white/60 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm backdrop-blur-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Bank-grade encryption · NDPR compliant</span>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* shared bits                                                         */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}

function Field({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-2xl border border-border bg-surface px-4 py-3 shadow-card-elev transition-colors focus-within:border-primary/60">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="mt-1.5 flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        {children}
      </span>
      {hint && <span className="mt-1.5 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

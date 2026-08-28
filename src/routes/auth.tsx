import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { VernexMark } from "@/components/brand";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  checkIdentifierRegistered,
  signInWithPin,
} from "@/lib/functions/auth.functions";
import { PinScreen } from "@/components/auth/pin-screen";
import { SignupScreen } from "@/components/auth/signup-screen";

const LAST_ID_KEY = "vernex_last_identifier";
const LAST_TAB_KEY = "vernex_last_tab";

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
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);

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

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type Screen = "signin" | "pin" | "signup";
type SignInTab = "phone" | "email";

function AuthPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("signin");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<SignInTab>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const lastId = localStorage.getItem(LAST_ID_KEY);
      const lastTab = (localStorage.getItem(LAST_TAB_KEY) as SignInTab | null) ?? "phone";
      if (lastId && isStandalonePwa()) {
        setTab(lastTab === "email" ? "email" : "phone");
        if (lastTab === "email") setEmail(lastId);
        else setPhone(lastId);
        setScreen("pin");
      } else if (lastId) {
        setTab(lastTab === "email" ? "email" : "phone");
        if (lastTab === "email") setEmail(lastId);
        else setPhone(lastId);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

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
      try {
        localStorage.setItem(LAST_ID_KEY, identifier);
        localStorage.setItem(LAST_TAB_KEY, tab);
      } catch {
        /* ignore */
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
      try {
        localStorage.setItem(LAST_ID_KEY, identifier);
        localStorage.setItem(LAST_TAB_KEY, tab);
      } catch {
        /* ignore */
      }
      toast.success("Welcome back to Vernex");
    } catch {
      setPin("");
      setPinError("Invalid phone number or PIN.");
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

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-white px-4 py-6 text-slate-900 antialiased">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex w-full items-center justify-between">
          {screen !== "signin" ? (
            <button
              type="button"
              onClick={() => {
                if (screen === "pin") {
                  setScreen("signin");
                  setPin("");
                  setPinError(null);
                } else {
                  setScreen("signin");
                  setFieldError(null);
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
          ) : (
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            </Link>
          )}
          <VernexMark className="h-8 w-8 rounded-full" />
        </header>

        <main className={`my-auto w-full ${screen === "signup" ? "py-6" : "space-y-5 py-4"}`}>
          {screen === "pin" ? (
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Enter your PIN{" "}
                <span aria-hidden>🔒</span>
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Logging in as{" "}
                <span className="font-semibold text-indigo-600">
                  {tab === "phone" ? formatPhone(phone) || phone : email.trim()}
                </span>
              </p>
            </div>
          ) : (
            <div className={screen === "signup" ? "mb-5" : ""}>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {screen === "signup" ? "Create your account 🚀" : "Welcome back 👋"}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {screen === "signup"
                  ? "Fill in your details below to get started for free"
                  : "Sign in to your Vernex account"}
              </p>
            </div>
          )}

          <div key={screen}>
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
                pin={pin}
                busy={busy}
                error={pinError}
                identifier={identifier}
                loginTab={tab}
                onKey={pressKey}
                onChangeNumber={() => {
                  setScreen("signin");
                  setPin("");
                  setPinError(null);
                }}
                onCreateAccount={() => {
                  setPin("");
                  setPinError(null);
                  setFieldError(null);
                  setScreen("signup");
                }}
              />
            )}

            {screen === "signup" && (
              <SignupScreen
                busy={busy}
                onSuccess={(createdEmail) => {
                  setEmail(createdEmail);
                  setTab("email");
                  setFieldError(null);
                  setScreen("signin");
                  toast.success("Account created successfully");
                }}
                onBack={() => {
                  setFieldError(null);
                  setScreen("signin");
                }}
              />
            )}
          </div>
        </main>

        <footer className="pt-2 text-center">
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-semibold">Bank-grade encryption - NDPR compliant</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

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
    "w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white";

  return (
    <div className="space-y-4">
      <div className="flex rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => props.setTab("phone")}
          aria-pressed={props.tab === "phone"}
          className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
            props.tab === "phone"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Phone Number
        </button>
        <button
          type="button"
          onClick={() => props.setTab("email")}
          aria-pressed={props.tab === "email"}
          className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
            props.tab === "email"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Email Address
        </button>
      </div>

      <form onSubmit={props.onSubmit} className="space-y-4">
        {props.tab === "phone" ? (
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Phone Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-indigo-600">
                <Phone className="h-5 w-5" />
              </span>
              <input
                value={props.phone}
                onChange={(e) => props.setPhone(formatPhone(e.target.value))}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="08012345678"
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-indigo-600">
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
        )}

        {props.error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {props.error}
          </p>
        )}

        <button
          type="submit"
          disabled={!props.enabled || props.busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {props.busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </button>
      </form>

      <div className="pt-1 text-center text-xs text-slate-500">
        <span>Don&apos;t have an account? </span>
        <button
          type="button"
          onClick={props.onCreateAccount}
          className="font-bold text-indigo-600 hover:underline"
        >
          Create one free
        </button>
      </div>
    </div>
  );
}

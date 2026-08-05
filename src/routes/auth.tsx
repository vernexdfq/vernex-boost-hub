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

export const Route = createFileRoute("/auth")({
  ssr: false,
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
/* page                                                                */
/* ------------------------------------------------------------------ */

function AuthPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("signin");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  /* sign-in state */
  const [tab, setTab] = useState<SignInTab>("phone");
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
        <button
          type="button"
          onClick={() => (screen === "pin" ? setScreen("signin") : undefined)}
          className={screen === "pin" ? "w-fit" : "hidden"}
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </span>
        </button>
        {screen !== "pin" && (
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        )}

        <BrandHeading screen={screen} />

        <div key={screen} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* header                                                              */
/* ------------------------------------------------------------------ */

function BrandHeading({ screen }: { screen: Screen }) {
  const copy =
    screen === "signup"
      ? { title: "Create your account 🚀", sub: "Fill in your details below to get started for free" }
      : screen === "pin"
        ? { title: "Enter your PIN 🔒", sub: "Authorise your login with your 4-digit Vernex PIN" }
        : { title: "Welcome back 👋", sub: "Sign in to your Vernex account" };

  return (
    <div className="mt-8 flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl brand-gradient text-base font-black text-primary-foreground">
        V
      </span>
      <div>
        <h1 className="font-display text-xl font-black tracking-tight">{copy.title}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{copy.sub}</p>
      </div>
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
  const tabs: Array<{ id: SignInTab; label: string }> = [
    { id: "phone", label: "Phone Number" },
    { id: "email", label: "Email Address" },
  ];

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => props.setTab(t.id)}
            aria-pressed={props.tab === t.id}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
              props.tab === t.id
                ? "brand-gradient text-primary-foreground shadow-[0_8px_20px_-12px_rgba(22,199,132,0.9)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={props.onSubmit} className="mt-6 space-y-3">
        {props.tab === "phone" ? (
          <Field icon={Phone} label="Phone number">
            <input
              value={props.phone}
              onChange={(e) => props.setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="0803 123 4567"
              className="w-full bg-transparent text-sm font-medium tracking-wide outline-none placeholder:text-muted-foreground/70"
            />
          </Field>
        ) : (
          <Field icon={Mail} label="Email address">
            <input
              value={props.email}
              onChange={(e) => props.setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={255}
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
            />
          </Field>
        )}

        {props.error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {props.error}
          </p>
        )}

        <button
          type="submit"
          disabled={!props.enabled || props.busy}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 text-sm font-bold text-primary-foreground shadow-[0_12px_30px_-12px_rgba(22,199,132,0.7)] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {props.busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={props.onCreateAccount}
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          Create one free
        </button>
      </p>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Bank-grade encryption · NDPR compliant
      </p>
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
    <div className="mt-8 flex flex-col items-center">
      <p className="text-sm text-muted-foreground">
        Signing in as <span className="font-semibold text-foreground">{props.identifier}</span>
      </p>


      <div className="mt-7 flex items-center gap-4" aria-label="PIN entry">
        {[0, 1, 2, 3].map((i) => {
          const filled = props.pin.length > i;
          return (
            <span
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                filled ? "scale-110 border-primary bg-primary" : "border-border bg-surface"
              }`}
            />
          );
        })}
      </div>

      <div className="mt-4 h-5">
        {props.busy ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying PIN…
          </span>
        ) : props.error ? (
          <span className="text-xs font-semibold text-destructive">{props.error}</span>
        ) : null}
      </div>

      <div className="mt-4 grid w-full grid-cols-3 gap-3">
        {keys.map((key, index) =>
          key === "" ? (
            <span key={`spacer-${index}`} />
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => props.onKey(key)}
              disabled={props.busy}
              className="grid h-16 place-items-center rounded-2xl border border-border bg-surface text-xl font-bold shadow-card-elev transition-all duration-150 active:scale-95 active:bg-accent disabled:opacity-50"
            >
              {key === "del" ? <Delete className="h-5 w-5 text-muted-foreground" /> : key}
            </button>
          ),
        )}
      </div>

      <div className="mt-7 flex w-full items-center justify-between text-sm">
        <button
          type="button"
          onClick={props.onChangeNumber}
          className="font-semibold text-muted-foreground hover:text-foreground"
        >
          Change number / email
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
            else toast.success(`We sent PIN recovery instructions to ${email}`);
          }}
          className="font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
        >
          Forgot PIN?
        </button>
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* sign up                                                             */
/* ------------------------------------------------------------------ */

function SignUpScreen(props: {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onSignIn: () => void;
  onRegistered: (email: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [referral, setReferral] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameOk = /^[a-zA-Z0-9_]{3,20}$/.test(username.trim());

  const valid =
    nameSchema.safeParse(firstName).success &&
    nameSchema.safeParse(lastName).success &&
    usernameOk &&
    isValidPhone(phone) &&
    isValidEmail(email) &&
    passwordSchema.safeParse(password).success &&
    /^\d{4}$/.test(pin) &&
    agreed;

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

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <SectionLabel>Personal information</SectionLabel>

      <div className="grid grid-cols-2 gap-3">
        <Field icon={UserIcon} label="First name">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            maxLength={40}
            placeholder="Denny"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
          />
        </Field>
        <Field icon={UserIcon} label="Last name">
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            maxLength={40}
            placeholder="Okoro"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
          />
        </Field>
      </div>

      <Field
        icon={UserIcon}
        label="Username"
        hint="3-20 characters — letters, numbers and underscores"
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
          autoComplete="username"
          maxLength={20}
          placeholder="dennyokoro"
          className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
        />
      </Field>

      <Field icon={Phone} label="Phone number">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          placeholder="0803 123 4567"
          className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
        />
      </Field>

      <Field icon={Mail} label="Email address">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={255}
          placeholder="you@example.com"
          className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
        />
      </Field>

      <SectionLabel>Security</SectionLabel>

      <Field icon={Lock} label="Password" hint="Minimum of 8 characters">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          maxLength={72}
          placeholder="••••••••"
          className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </Field>

      <Field
        icon={ShieldCheck}
        label="4-digit transaction PIN"
        hint="Used to authorise transactions — keep it secret"
      >
        <input
          value={pin}
          onChange={(e) => setPin(digitsOnly(e.target.value).slice(0, 4))}
          inputMode="numeric"
          type="password"
          maxLength={4}
          placeholder="••••"
          className="w-full bg-transparent text-sm font-semibold tracking-[0.4em] outline-none placeholder:tracking-[0.4em] placeholder:text-muted-foreground/70"
        />
      </Field>

      <Field icon={Ticket} label="Referral code (optional)">
        <input
          value={referral}
          onChange={(e) => setReferral(e.target.value.toUpperCase())}
          maxLength={24}
          placeholder="VNX-XXXX"
          className="w-full bg-transparent text-sm font-medium uppercase outline-none placeholder:text-muted-foreground/70"
        />
      </Field>

      <button
        type="button"
        onClick={() => setAgreed((a) => !a)}
        className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left"
      >
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
            agreed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
          }`}
        >
          {agreed && <Check className="h-3.5 w-3.5" />}
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground">
          I agree to Vernex's <span className="font-semibold text-foreground">Terms of Service</span> and{" "}
          <span className="font-semibold text-foreground">Privacy Policy</span>.
        </span>
      </button>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={!valid || props.busy}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 text-sm font-bold text-primary-foreground shadow-[0_12px_30px_-12px_rgba(22,199,132,0.7)] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {props.busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Create Account
      </button>

      <p className="pt-2 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={props.onSignIn}
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          Sign In
        </button>
      </p>
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

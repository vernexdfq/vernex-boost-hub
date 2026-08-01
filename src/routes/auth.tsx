import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Mail, User as UserIcon, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign In or Create Account — Vernex" },
      {
        name: "description",
        content:
          "Access your Vernex wallet, virtual numbers and SMM orders. Sign in or create a free account in seconds.",
      },
      { property: "og:title", content: "Sign In or Create Account — Vernex" },
      {
        property: "og:description",
        content: "Secure access to your Vernex wallet, virtual numbers and boost orders.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(72);
const nameSchema = z.string().trim().min(2, "Enter your full name").max(80);

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) return toast.error(emailResult.error.issues[0]!.message);
    const passResult = passwordSchema.safeParse(password);
    if (!passResult.success) return toast.error(passResult.error.issues[0]!.message);

    setBusy(true);
    try {
      if (mode === "signup") {
        const nameResult = nameSchema.safeParse(fullName);
        if (!nameResult.success) {
          toast.error(nameResult.error.issues[0]!.message);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: emailResult.data,
          password: passResult.data,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: nameResult.data },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          toast.success("Account created — check your email to confirm.");
          return;
        }
        toast.success("Welcome to Vernex!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailResult.data,
          password: passResult.data,
        });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-6">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl brand-gradient text-base font-black text-white">
            V
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {mode === "signin"
                ? "Sign in to your Vernex wallet"
                : "Wallet, virtual numbers and boosts in one place"}
            </p>
          </div>
        </div>

        {checkEmail ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-card-elev">
            <h2 className="text-base font-bold">Confirm your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>.
              Click it to activate your Vernex account, then come back and sign in.
            </p>
            <button
              onClick={() => {
                setCheckEmail(false);
                setMode("signin");
              }}
              className="mt-5 w-full rounded-2xl brand-gradient py-3 text-sm font-semibold text-white"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                    mode === m ? "brand-gradient text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "signin" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              {mode === "signup" && (
                <Field icon={UserIcon} label="Full name">
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    maxLength={80}
                    placeholder="Denny Okoro"
                    className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
                  />
                </Field>
              )}

              <Field icon={Mail} label="Email address">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  maxLength={255}
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
                />
              </Field>

              <Field icon={Lock} label="Password">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  maxLength={72}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
                />
              </Field>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_-12px_rgba(22,199,132,0.7)] disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              By continuing you agree to Vernex's Terms of Service and Privacy Policy.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-2xl border border-border bg-surface px-4 py-3 shadow-card-elev focus-within:border-primary/60">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="mt-1.5 flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        {children}
      </span>
    </label>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { VernexMark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset Password — Vernex" },
      {
        name: "description",
        content: "Choose a new password for your Vernex account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Supabase puts recovery tokens in the URL hash or as a session after redirect
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          if (!cancelled) setReady(true);
          return;
        }

        // Parse hash params (access_token, type=recovery, etc.)
        const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (accessToken && refreshToken && (type === "recovery" || type === "magiclink")) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          if (!cancelled) setReady(true);
          // Clean sensitive tokens from the address bar
          try {
            window.history.replaceState({}, "", "/reset-password");
          } catch {
            /* ignore */
          }
          return;
        }

        // Query-string code exchange (PKCE)
        const search =
          typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const code = search?.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) setReady(true);
          try {
            window.history.replaceState({}, "", "/reset-password");
          } catch {
            /* ignore */
          }
          return;
        }

        if (!cancelled) setInvalid(true);
      } catch {
        if (!cancelled) setInvalid(true);
      }
    }

    void bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setInvalid(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setDone(true);
      toast.success("Password updated successfully");

      // Best-effort: notify user their password changed (if email API is configured later)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          // Placeholder for branded confirmation email via server fn / Resend
          // When mail is wired: await sendPasswordChangedEmail({ email: user.email })
        }
      } catch {
        /* non-blocking */
      }

      setTimeout(() => {
        void navigate({ to: "/auth", replace: true });
      }, 2200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm font-bold text-slate-900 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white";

  if (invalid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <VernexMark className="mb-6 h-12 w-12 rounded-full" />
        <h1 className="text-xl font-black text-slate-900">Link expired or invalid</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          This password reset link is no longer valid. Request a new one from the app.
        </p>
        <Link
          to="/auth"
          className="mt-6 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-black text-slate-900">Password changed</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Your Vernex password was updated. Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white px-4 py-8 text-slate-900 antialiased">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/auth"
            className="text-sm font-bold text-slate-500 hover:text-indigo-600"
          >
            ← Sign in
          </Link>
          <VernexMark className="h-9 w-9 rounded-full" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-900">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose a strong password for your Vernex account. Minimum 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              New password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                placeholder="••••••••"
                className={inputClass}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Confirm password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                placeholder="••••••••"
                className={inputClass}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || password.length < 8}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          After updating, sign in with your phone/email and PIN as usual.
        </p>
      </div>
    </div>
  );
}

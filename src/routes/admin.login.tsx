import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { checkAdminAccess } from "@/lib/functions/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Admin Sign-In — Verxor" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(checkAdminAccess);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(err.message);
        return;
      }
      const res = await checkAdmin();
      if (!res.isAdmin) {
        await supabase.auth.signOut();
        setError("This account is not a Verxor administrator.");
        return;
      }
      toast.success("Welcome back");
      navigate({ to: "/admin", replace: true });
    } catch {
      setError("Sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-900 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white">
            V
          </div>
          <h1 className="text-xl font-black text-white">Verxor Admin</h1>
          <p className="text-xs text-slate-400">Administrator sign-in — staff only</p>
        </div>
        <form
          onSubmit={(e) => void submit(e)}
          className="space-y-3 rounded-2xl border border-slate-800 bg-slate-800/60 p-5"
        >
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Admin Email
            </label>
            <input
              autoFocus
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none focus:border-blue-500"
              placeholder="admin@verxor.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>
          {error ? (
            <p className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-[11px] font-medium text-red-400">
              <Lock className="h-3 w-3" /> {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign In as Administrator"}
          </button>
          <p className="pt-1 text-center text-[10px] leading-relaxed text-slate-500">
            This area is completely separate from the Verxor customer app. Authorized
            administrators only.
          </p>
        </form>
      </div>
    </div>
  );
}

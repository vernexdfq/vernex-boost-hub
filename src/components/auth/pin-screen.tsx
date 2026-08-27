import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Delete, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { forgotPinWithPassword } from "@/lib/functions/auth.functions";

type SignInTab = "phone" | "email";

export function PinScreen(props: {
  pin: string;
  busy: boolean;
  error: string | null;
  identifier: string;
  loginTab: SignInTab;
  onKey: (key: string) => void;
  onChangeNumber: () => void;
}) {
  const keys = useMemo(() => ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"], []);
  const hasError = Boolean(props.error);
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <div className="space-y-5">
      {hasError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
            !
          </span>
          <span>{props.error}</span>
        </div>
      )}

      <p className="text-center text-sm font-medium text-slate-600">Enter your 4-digit PIN</p>

      <div className="flex items-center justify-center gap-3" aria-label="PIN entry">
        {[0, 1, 2, 3].map((i) => {
          const filled = props.pin.length > i;
          return (
            <span
              key={i}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-xl font-black transition-all ${
                hasError
                  ? "border-red-400 bg-red-50 text-red-600"
                  : filled
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-slate-50 text-slate-300"
              }`}
            >
              {filled ? "•" : ""}
            </span>
          );
        })}
      </div>

      <div className="min-h-[1.25rem] text-center">
        {props.busy ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" /> Verifying…
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
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
              className="flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-3.5 text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50"
            >
              <Delete className="h-5 w-5" />
            </button>
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => props.onKey(key)}
              disabled={props.busy}
              className="rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-lg font-bold text-slate-800 transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-50"
            >
              {key}
            </button>
          ),
        )}
      </div>

      <div className="flex items-center justify-between pt-1 text-xs font-bold">
        <button
          type="button"
          onClick={props.onChangeNumber}
          className="text-slate-600 transition-colors hover:text-indigo-600"
        >
          ← Change number
        </button>
        <button
          type="button"
          disabled={props.busy}
          onClick={() => setForgotOpen(true)}
          className="text-indigo-600 hover:underline disabled:opacity-50"
        >
          Forgot PIN?
        </button>
      </div>

      <div className="pt-2 text-center text-xs text-slate-500">
        <span>Don't have an account? </span>
        <Link to="/auth" className="font-bold text-indigo-600 hover:underline">
          Create one free
        </Link>
      </div>

      {forgotOpen && (
        <ForgotPinSheet
          identifier={props.identifier}
          onClose={() => setForgotOpen(false)}
          onSuccess={() => {
            setForgotOpen(false);
            toast.success("PIN updated. Sign in with your new PIN.");
          }}
        />
      )}
    </div>
  );
}

function ForgotPinSheet(props: {
  identifier: string;
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

  async function verifyAndContinue() {
    if (!password.trim()) {
      toast.error("Enter your account password");
      return;
    }
    setStep("pin");
  }

  function pressDigit(d: string) {
    if (activeValue.length >= 4) return;
    const next = activeValue + d;
    setActiveValue(next);
    if (next.length === 4 && step === "pin") {
      setTimeout(() => setStep("confirm"), 160);
    }
  }

  function pressDelete() {
    setActiveValue((v) => v.slice(0, -1));
  }

  async function savePin() {
    if (pin.length !== 4 || confirmPin.length !== 4) return;
    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      setConfirmPin("");
      return;
    }
    setBusy(true);
    try {
      await forgotPinWithPassword({
        data: {
          identifier: props.identifier,
          password,
          pin,
        },
      });
      props.onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset PIN");
      setStep("password");
      setPin("");
      setConfirmPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {step === "password"
                ? "Forgot PIN"
                : step === "pin"
                  ? "Enter new 4-digit PIN"
                  : "Confirm your PIN"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {step === "password"
                ? "Enter your account password to continue"
                : step === "pin"
                  ? "Choose a new 4-digit PIN"
                  : "Re-enter the same 4 digits"}
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {step === "password" ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Account password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3.5 pr-11 text-sm outline-none focus:border-indigo-600 focus:bg-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void verifyAndContinue();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void verifyAndContinue()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border-2 transition ${
                    i < activeValue.length
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-200 bg-transparent"
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
                      onClick={pressDelete}
                      className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-800"
                      aria-label="Delete"
                    >
                      <Delete className="h-5 w-5" />
                    </button>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pressDigit(key)}
                    className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-semibold text-slate-800"
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Saving…" : "Save new PIN"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

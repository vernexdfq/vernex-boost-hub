import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Permanent dismiss keys — prompt shows only once per context. */
const KEY_SITE = "verxor-install-dismissed-site";
const KEY_RENTAL = "verxor-install-dismissed-rental";

type Variant = "sheet" | "dropdown";

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissed(key: string): boolean {
  try {
    return Boolean(localStorage.getItem(key));
  } catch {
    return false;
  }
}

function markDismissed(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Verxor install prompt.
 * - variant="sheet"  → bottom card on the marketing site (once only)
 * - variant="dropdown" → top bar on the rental page (once only)
 * Always captures beforeinstallprompt so the browser native bar does not reappear.
 */
export function InstallPrompt({ variant = "sheet" }: { variant?: Variant }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  const storageKey = variant === "rental" || variant === "dropdown" ? KEY_RENTAL : KEY_SITE;

  // Capture BIP globally so Chrome's native mini-infobar does not loop
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  // Show at most once for this context
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (wasDismissed(storageKey)) return;

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // Small delay so the page settles; show for Android (when BIP fires) and iOS
    const delay = variant === "dropdown" ? 1200 : 1800;
    const t = setTimeout(() => {
      // On Android we prefer waiting for BIP, but still show a soft tip if it never comes
      if (deferred || isIOS || variant === "dropdown") {
        setVisible(true);
      }
    }, delay);

    // If BIP arrives later, reveal immediately (unless already dismissed)
    if (deferred && !wasDismissed(storageKey)) {
      setVisible(true);
    }

    return () => clearTimeout(t);
  }, [deferred, storageKey, variant]);

  const dismiss = () => {
    setVisible(false);
    markDismissed(storageKey);
  };

  const install = async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
        markDismissed(storageKey);
      }
      setDeferred(null);
    } catch {
      // ignore
    } finally {
      setInstalling(false);
    }
  };

  if (isStandalone() || !visible) return null;

  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  /* ── Top dropdown (rental page) — Chrome-style bar, Verxor only ── */
  if (variant === "dropdown") {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-[0_8px_30px_rgba(15,23,42,0.14)] backdrop-blur-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-600">
            <img src="/mylogo.png" alt="Verxor" className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold leading-tight text-slate-900">Install Verxor</p>
            <p className="truncate text-[12px] text-slate-500">Faster access · full-screen app</p>
          </div>
          {deferred ? (
            <button
              type="button"
              onClick={install}
              disabled={installing}
              className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-1.5 text-[13px] font-bold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-70"
            >
              {installing ? "…" : "Install"}
            </button>
          ) : isIOS ? (
            <span className="shrink-0 text-[11px] font-medium text-slate-500">Share → Add</span>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Bottom sheet (landing / website) — once only ── */
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-600 ring-1 ring-blue-700/20">
            <img src="/mylogo.png" alt="Verxor" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">Install Verxor</p>
            <p className="mt-0.5 text-[13px] leading-snug text-slate-500">
              {isIOS && !deferred
                ? "Add to Home Screen for a faster, app-like experience."
                : "Install the app for faster access, offline support, and a full-screen experience."}
            </p>
            {isIOS && !deferred && (
              <p className="mt-2 text-[12px] text-slate-500">
                Tap <span className="font-semibold text-slate-700">Share</span> →{" "}
                <span className="font-semibold text-slate-700">Add to Home Screen</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
        {deferred && (
          <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition active:bg-slate-50"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={install}
              disabled={installing}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-70"
            >
              {installing ? (
                "Installing…"
              ) : (
                <>
                  <Download size={16} strokeWidth={2.5} />
                  Install
                </>
              )}
            </button>
          </div>
        )}
        {isIOS && !deferred && (
          <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500">
            <Smartphone size={14} className="shrink-0 text-blue-600" />
            Opens like a native app — no browser bar
          </div>
        )}
      </div>
    </div>
  );
}

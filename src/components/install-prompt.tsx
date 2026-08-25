import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "vernex-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const ts = Number(dismissed);
      // Show again after 7 days
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Small delay so page settles
      setTimeout(() => setVisible(true), 1800);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    // iOS Safari: no beforeinstallprompt — show soft tip after delay
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS && !standalone) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferred) {
      // iOS instructions already visible
      return;
    }
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setVisible(false);
      setDeferred(null);
    } catch {
      // ignore
    } finally {
      setInstalling(false);
    }
  };

  if (isStandalone || !visible) return null;

  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50 ring-1 ring-blue-100">
            <img src="/logo.png" alt="Vernex" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">Install Vernex</p>
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

import { useEffect, useState } from "react";
import { Send, X } from "lucide-react";

const STORAGE_KEY = "vernex-telegram-modal-dismissed";

export function TelegramModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-background/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="mx-3 mb-3 w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-wallet animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[oklch(0.55_0.15_240)]/20 text-[oklch(0.72_0.16_240)]">
            <Send className="h-6 w-6" />
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-4 text-lg font-bold">Join our Telegram community</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get early access to promos, service drops, and live status updates from the Vernex team.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 rounded-xl border border-border bg-transparent py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            Maybe later
          </button>
          <a
            href="https://t.me/"
            target="_blank"
            rel="noreferrer"
            onClick={dismiss}
            className="flex-1 rounded-xl brand-gradient py-2.5 text-center text-sm font-semibold text-white shadow-[0_8px_20px_-6px_oklch(0.6_0.22_262/0.6)]"
          >
            Join now
          </a>
        </div>
      </div>
    </div>
  );
}

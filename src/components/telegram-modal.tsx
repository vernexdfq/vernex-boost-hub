import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";

const STORAGE_KEY = "vernex-telegram-modal-dismissed";

export function TelegramModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 500);
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 px-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-wallet animate-in zoom-in-95 duration-200">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl brand-gradient text-white shadow-[0_10px_25px_-8px_rgba(79,70,229,0.3)]">
          <Megaphone className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold">Join Our Telegram Community</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Stay updated with the latest promotions, important announcements, and exclusive offers from Vernex.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href="https://t.me/"
            target="_blank"
            rel="noreferrer"
            onClick={dismiss}
            className="rounded-xl brand-gradient py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.3)]"
          >
            Join Now
          </a>
          <button
            onClick={dismiss}
            className="rounded-xl bg-transparent py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const TELEGRAM_URL = "https://t.me/VernexOfficial";

/**
 * Telegram community modal — shows each time the dashboard (Home) mounts.
 * "Maybe later" / X only dismisses for the current view; returns on next Home visit.
 */
export function TelegramModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, []);

  const close = () => setOpen(false);

  if (!open) return null;

  return (
    <div
      id="telegramModal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="telegram-modal-title"
    >
      <div className="relative w-full max-w-sm scale-100 transform rounded-3xl bg-white p-6 text-center shadow-2xl shadow-slate-900/20 transition-all">
        {/* Close */}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 shadow-inner">
          <span className="text-3xl" aria-hidden>
            📢
          </span>
        </div>

        <h3
          id="telegram-modal-title"
          className="mb-2 text-xl font-black tracking-tight text-slate-900"
        >
          Join Our Telegram Community
        </h3>
        <p className="mb-6 px-2 text-xs leading-relaxed text-slate-500">
          Stay updated with the latest promotions, important announcements, and exclusive
          offers from Vernex.
        </p>

        <div className="space-y-3">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 active:scale-95"
          >
            Join Now
          </a>
          <button
            type="button"
            onClick={close}
            className="w-full rounded-2xl bg-transparent px-4 py-2.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 active:scale-95"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { X, Send, MessageCircle } from "lucide-react";

const TELEGRAM_URL = "https://t.me/VerxorOfficial";
const WHATSAPP_URL = "https://whatsapp.com/channel/0029VbE6zLAEQIag3m2Lvf1H";

/**
 * Community modal — shows each time the dashboard (Home) mounts.
 * Split actions: Telegram (blue) + WhatsApp (green).
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
      id="communityModal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-modal-title"
    >
      <div className="relative w-full max-w-sm scale-100 transform rounded-3xl bg-white p-6 text-center shadow-2xl shadow-slate-900/20 transition-all dark:bg-surface dark:text-foreground">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-muted dark:text-muted-foreground"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 shadow-inner dark:bg-primary/15">
          <span className="text-3xl" aria-hidden>
            📢
          </span>
        </div>

        <h3
          id="community-modal-title"
          className="mb-2 text-xl font-black tracking-tight text-slate-900 dark:text-foreground"
        >
          Stay in the Loop
        </h3>
        <p className="mb-6 px-1 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
          Join Verxor on Telegram or WhatsApp for promotions, announcements, and exclusive offers.
        </p>

        <div className="space-y-2.5">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-fast flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            <Send className="h-4 w-4" />
            Join Telegram
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-fast flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-700 active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            Join WhatsApp
          </a>
          <button
            type="button"
            onClick={close}
            className="w-full rounded-2xl bg-transparent px-4 py-2.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 active:scale-95 dark:text-muted-foreground dark:hover:bg-muted"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

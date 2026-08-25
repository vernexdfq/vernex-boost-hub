import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Vernex" },
      {
        name: "description",
        content: "Share feedback, report bugs, or suggest features for Vernex.",
      },
    ],
  }),
  component: Feedback,
});

const TYPES = [
  "Feature request",
  "Bug report",
  "Payment issue",
  "Service quality",
  "General feedback",
  "Other",
] as const;

function Feedback() {
  const { user } = Route.useRouteContext();
  const [type, setType] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const firstName =
    (user.email ? user.email.split("@")[0] : "there").charAt(0).toUpperCase() +
    (user.email ? user.email.split("@")[0].slice(1) : "here");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    try {
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Feedback received",
        body: `Thanks for your ${type.toLowerCase()}. Our team will review it shortly.`,
        type: "general",
        data: {
          kind: "feedback",
          feedback_type: type,
          subject: subject.trim(),
          message: message.trim(),
        },
      });
      toast.success("Feedback sent — thank you!");
      setType("");
      setSubject("");
      setMessage("");
    } catch {
      // Fallback: open Telegram support if insert fails (RLS / schema)
      const text = encodeURIComponent(
        `[Vernex Feedback]\nType: ${type}\nSubject: ${subject}\n\n${message}\n\nFrom: ${user.email ?? user.id}`,
      );
      window.open(`https://t.me/vernex_support?text=${text}`, "_blank", "noopener,noreferrer");
      toast.message("Opening Telegram support…");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md">
        <Link
          to="/profile"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-bold">Feedback</h1>
          <p className="text-[11px] text-muted-foreground">We're listening</p>
        </div>
      </header>

      <div className="space-y-4 px-4 pb-10 pt-4">
        <div className="relative overflow-hidden rounded-3xl wallet-gradient p-5 text-white shadow-wallet">
          <div className="absolute inset-0 dotted-bg opacity-30" />
          <div className="relative">
            <h2 className="text-lg font-black tracking-tight">
              We're listening, {firstName} 👋
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/85">
              Your feedback genuinely shapes where we take Vernex next. Suggest a feature, flag a
              bug, tell us where we fell short, or just say what you like — every message reaches
              our team.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Share something
          </p>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Feedback type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none ring-primary focus:ring-2"
            >
              <option value="">Choose one…</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sum it up in a few words"
              maxLength={120}
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none ring-primary placeholder:text-muted-foreground focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us as much detail as you'd like…"
              rows={5}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none ring-primary placeholder:text-muted-foreground focus:ring-2"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="tap-fast flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sending ? "Sending…" : "Send Feedback"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

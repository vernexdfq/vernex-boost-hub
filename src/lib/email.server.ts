/**
 * Transactional email for Vernex.
 * Prefer RESEND_API_KEY (works on Cloudflare + Railway).
 * Fallback: SMTP_* env (Zoho) when running on Node (Railway).
 *
 * From: Vernex <official@vernex.com.ng>
 */

const FROM = process.env.EMAIL_FROM || "Vernex <official@vernex.com.ng>";
const APP_URL = (process.env.APP_URL || process.env.VITE_APP_URL || "https://vernex.com.ng").replace(
  /\/$/,
  "",
);

export function appUrl(path = "") {
  return `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Resend failed", res.status, body);
    return false;
  }
  return true;
}

/** Best-effort send. Returns true if handed to a provider. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const to = opts.to.trim().toLowerCase();
  if (!to.includes("@")) return false;

  try {
    if (await sendViaResend(to, opts.subject, opts.html, opts.text)) return true;
  } catch (e) {
    console.error("[email] Resend error", e);
  }

  // Optional: SMTP (Zoho) only when Node net is available (e.g. Railway).
  // Configure later with nodemailer if needed; Resend is the primary path on Cloudflare.
  console.warn(
    "[email] No email provider succeeded. Set RESEND_API_KEY (recommended) or configure Supabase Auth SMTP to Zoho for auth emails.",
  );
  return false;
}

export async function sendPinResetEmail(to: string, token: string) {
  const link = appUrl(`/auth/reset-pin?token=${encodeURIComponent(token)}`);
  const subject = "Reset your Vernex PIN";
  const text = `Reset your Vernex 4-digit PIN:\n\n${link}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`;
  const html = `
  <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h1 style="font-size:20px;margin:0 0 12px">Reset your PIN</h1>
    <p style="margin:0 0 16px;line-height:1.5;color:#475569">
      We received a request to reset your Vernex 4-digit transaction PIN.
      Tap the button below to choose a new PIN.
    </p>
    <p style="margin:0 0 24px">
      <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700">
        Choose new PIN
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8">This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
  </div>`;
  return sendEmail({ to, subject, html, text });
}

export async function sendPinChangedEmail(to: string) {
  const subject = "Your Vernex PIN was changed";
  const text =
    "Your Vernex 4-digit PIN was changed successfully. If this was not you, contact support immediately and secure your account.";
  const html = `
  <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h1 style="font-size:20px;margin:0 0 12px">PIN changed</h1>
    <p style="margin:0 0 16px;line-height:1.5;color:#475569">
      Your Vernex 4-digit transaction PIN was changed successfully.
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8">
      If you did not make this change, contact support immediately.
    </p>
  </div>`;
  return sendEmail({ to, subject, html, text });
}

export async function sendWelcomeEmail(to: string, firstName?: string) {
  const name = firstName?.trim() || "there";
  const subject = "Welcome to Vernex";
  const text = `Hi ${name}, welcome to Vernex. Your wallet, virtual numbers and boosts are ready.`;
  const html = `
  <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h1 style="font-size:20px;margin:0 0 12px">Welcome to Vernex 👋</h1>
    <p style="margin:0 0 16px;line-height:1.5;color:#475569">
      Hi ${name}, your account is ready. Fund your wallet, buy virtual numbers, and grow your socials — all in one place.
    </p>
    <p style="margin:0 0 24px">
      <a href="${appUrl("/auth")}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700">
        Open Vernex
      </a>
    </p>
  </div>`;
  return sendEmail({ to, subject, html, text });
}

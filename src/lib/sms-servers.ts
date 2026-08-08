/**
 * Virtual Numbers — fixed server slots (UI + Cloudflare mapping).
 *
 * Add secrets in Cloudflare Pages → Settings → Environment variables:
 *
 *   SMS_US_S1_API_KEY / SMS_US_S1_BASE_URL
 *   SMS_US_S2_API_KEY / SMS_US_S2_BASE_URL
 *   SMS_US_S3_API_KEY / SMS_US_S3_BASE_URL
 *   SMS_US_S4_API_KEY / SMS_US_S4_BASE_URL
 *   SMS_ALL_S1_API_KEY / SMS_ALL_S1_BASE_URL
 *   … through SMS_ALL_S5_*
 *
 * Optional provider name per slot:
 *   SMS_US_S1_PROVIDER=hero-sms | 5sim | sms-activate | custom
 *
 * Products in Supabase `number_products.server_id` should use values like
 * S1, S2, US-S1, ALL-S3 so they appear under the matching button.
 */

export type SmsSlotId =
  | "US-S1"
  | "US-S2"
  | "US-S3"
  | "US-S4"
  | "ALL-S1"
  | "ALL-S2"
  | "ALL-S3"
  | "ALL-S4"
  | "ALL-S5";

export type SmsSlotMeta = {
  id: SmsSlotId;
  label: string;
  flag: string;
  group: "usa" | "all";
  /** Cloudflare env prefix, e.g. SMS_US_S1 */
  envPrefix: string;
};

export const SMS_SERVER_SLOTS: readonly SmsSlotMeta[] = [
  { id: "US-S1", label: "USA (S1)", flag: "🇺🇸", group: "usa", envPrefix: "SMS_US_S1" },
  { id: "US-S2", label: "USA (S2)", flag: "🇺🇸", group: "usa", envPrefix: "SMS_US_S2" },
  { id: "US-S3", label: "USA (S3)", flag: "🇺🇸", group: "usa", envPrefix: "SMS_US_S3" },
  { id: "US-S4", label: "USA (S4)", flag: "🇺🇸", group: "usa", envPrefix: "SMS_US_S4" },
  { id: "ALL-S1", label: "All Countries (S1)", flag: "🌐", group: "all", envPrefix: "SMS_ALL_S1" },
  { id: "ALL-S2", label: "All Countries (S2)", flag: "🌐", group: "all", envPrefix: "SMS_ALL_S2" },
  { id: "ALL-S3", label: "All Countries (S3)", flag: "🌐", group: "all", envPrefix: "SMS_ALL_S3" },
  { id: "ALL-S4", label: "All Countries (S4)", flag: "🌐", group: "all", envPrefix: "SMS_ALL_S4" },
  { id: "ALL-S5", label: "All Countries (S5)", flag: "🌐", group: "all", envPrefix: "SMS_ALL_S5" },
] as const;

export function parseServerSlotNumber(serverId: string): number | null {
  const upper = String(serverId ?? "").toUpperCase().trim();
  if (!upper) return null;
  const m = upper.match(/(?:^|[^A-Z0-9])S(?:ERVER)?[-_ ]?(\d+)\b/);
  if (m) return Number(m[1]);
  // bare "1" / "2"
  if (/^\d+$/.test(upper)) return Number(upper);
  return null;
}

export function isUsaProduct(countryCode: string, countryName: string, serverId: string): boolean {
  return (
    countryCode === "US" ||
    /united states|usa/i.test(countryName ?? "") ||
    /^usa/i.test(serverId ?? "") ||
    /us[-_]?s?\d/i.test(serverId ?? "")
  );
}

export function resolveSmsSlotId(
  countryCode: string,
  countryName: string,
  serverId: string,
): SmsSlotId {
  const n = parseServerSlotNumber(serverId) ?? 1;
  const usa = isUsaProduct(countryCode, countryName, serverId);
  if (usa) {
    const slot = Math.min(Math.max(n, 1), 4);
    return `US-S${slot}` as SmsSlotId;
  }
  const slot = Math.min(Math.max(n, 1), 5);
  return `ALL-S${slot}` as SmsSlotId;
}

/** Server-side: read API key for a slot from process.env */
export function getSmsSlotCredentials(slotId: SmsSlotId): {
  apiKey: string | undefined;
  baseUrl: string | undefined;
  provider: string | undefined;
} {
  const meta = SMS_SERVER_SLOTS.find((s) => s.id === slotId);
  const prefix = meta?.envPrefix ?? `SMS_${slotId.replace("-", "_")}`;
  return {
    apiKey: process.env[`${prefix}_API_KEY`] ?? process.env[`${prefix}_KEY`],
    baseUrl: process.env[`${prefix}_BASE_URL`] ?? process.env[`${prefix}_URL`],
    provider: process.env[`${prefix}_PROVIDER`],
  };
}

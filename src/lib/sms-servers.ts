/**
 * Virtual Numbers — fixed server slots → Cloudflare API keys
 *
 * 🇺🇸 USA:
 *   US-S1 → FIVESIM_API_KEY
 *   US-S2 → DOGESMS_API_KEY
 *   US-S3 → GRIZZLY_API_KEY  (also GRIZZLY_SMS_API_KEY)
 *   US-S4 → TEXTVERIFIED_API_KEY  (also TEXT_VERIFIED_API_KEY)
 *
 * 🌐 All Countries:
 *   ALL-S1 → GRIZZLY_API_KEY
 *   ALL-S2 → DOGESMS_API_KEY
 *   ALL-S3 → TEXTVERIFIED_API_KEY
 *   ALL-S4 → FIVESIM_API_KEY
 *   ALL-S5 → SMSBUYZ_API_KEY
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

export type SmsProviderId =
  | "fivesim"
  | "dogesms"
  | "grizzly"
  | "textverified"
  | "smsbuyz";

export type SmsSlotMeta = {
  id: SmsSlotId;
  label: string;
  flag: string;
  group: "usa" | "all";
  provider: SmsProviderId;
  /** Env var names tried in order */
  envKeys: string[];
};

export const SMS_SERVER_SLOTS: readonly SmsSlotMeta[] = [
  {
    id: "US-S1",
    label: "USA (S1)",
    flag: "🇺🇸",
    group: "usa",
    provider: "fivesim",
    envKeys: ["FIVESIM_API_KEY", "FIVE_SIM_API_KEY", "SMS_US_S1_API_KEY"],
  },
  {
    id: "US-S2",
    label: "USA (S2)",
    flag: "🇺🇸",
    group: "usa",
    provider: "dogesms",
    envKeys: ["DOGESMS_API_KEY", "DOGE_SMS_API_KEY", "SMS_US_S2_API_KEY"],
  },
  {
    id: "US-S3",
    label: "USA (S3)",
    flag: "🇺🇸",
    group: "usa",
    provider: "grizzly",
    envKeys: ["GRIZZLY_API_KEY", "GRIZZLY_SMS_API_KEY", "SMS_US_S3_API_KEY"],
  },
  {
    id: "US-S4",
    label: "USA (S4)",
    flag: "🇺🇸",
    group: "usa",
    provider: "textverified",
    envKeys: ["TEXTVERIFIED_API_KEY", "TEXT_VERIFIED_API_KEY", "SMS_US_S4_API_KEY"],
  },
  {
    id: "ALL-S1",
    label: "All Countries (S1)",
    flag: "🌐",
    group: "all",
    provider: "grizzly",
    envKeys: ["GRIZZLY_API_KEY", "GRIZZLY_SMS_API_KEY", "SMS_ALL_S1_API_KEY"],
  },
  {
    id: "ALL-S2",
    label: "All Countries (S2)",
    flag: "🌐",
    group: "all",
    provider: "dogesms",
    envKeys: ["DOGESMS_API_KEY", "DOGE_SMS_API_KEY", "SMS_ALL_S2_API_KEY"],
  },
  {
    id: "ALL-S3",
    label: "All Countries (S3)",
    flag: "🌐",
    group: "all",
    provider: "textverified",
    envKeys: ["TEXTVERIFIED_API_KEY", "TEXT_VERIFIED_API_KEY", "SMS_ALL_S3_API_KEY"],
  },
  {
    id: "ALL-S4",
    label: "All Countries (S4)",
    flag: "🌐",
    group: "all",
    provider: "fivesim",
    envKeys: ["FIVESIM_API_KEY", "FIVE_SIM_API_KEY", "SMS_ALL_S4_API_KEY"],
  },
  {
    id: "ALL-S5",
    label: "All Countries (S5)",
    flag: "🌐",
    group: "all",
    provider: "smsbuyz",
    envKeys: ["SMSBUYZ_API_KEY", "SMS_BUYZ_API_KEY", "SMS_ALL_S5_API_KEY"],
  },
] as const;

export function getSlotMeta(id: string): SmsSlotMeta | undefined {
  return SMS_SERVER_SLOTS.find((s) => s.id === id);
}

export function readSlotApiKey(slot: SmsSlotMeta): string | null {
  for (const k of slot.envKeys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return null;
}

export function parseServerSlotNumber(serverId: string): number | null {
  const upper = String(serverId ?? "").toUpperCase().trim();
  if (!upper) return null;
  const m = upper.match(/(?:^|[^A-Z0-9])S(?:ERVER)?[-_ ]?(\d+)\b/);
  if (m) return Number(m[1]);
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

export function getSmsSlotCredentials(slotId: SmsSlotId): {
  apiKey: string | undefined;
  provider: SmsProviderId;
} {
  const meta = getSlotMeta(slotId);
  if (!meta) return { apiKey: undefined, provider: "fivesim" };
  return { apiKey: readSlotApiKey(meta) ?? undefined, provider: meta.provider };
}

/** NGN selling price from provider USD cost */
export function smsSellPriceNgn(costUsd: number): number {
  const rate = Number(process.env.USD_TO_NGN_RATE || 1600);
  const markup = Number(process.env.MARKUP_PERCENTAGE || 1.5);
  const fixed = Number(process.env.FIXED_NGN_MARKUP || 200);
  return Math.ceil(costUsd * rate * markup + fixed);
}

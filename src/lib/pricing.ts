/**
 * Verxor pricing engine.
 *
 * Admin-configurable keys (mirrored to the backend config table when Cloud is enabled):
 *   USD_TO_NGN_RATE   — default 1600
 *   MARKUP_PERCENTAGE — multiplier, e.g. 1.50
 *   FIXED_NGN_MARKUP  — flat naira addition, e.g. 200
 *
 * Formula: CEIL((providerCostUsd * USD_TO_NGN_RATE * MARKUP_PERCENTAGE) + FIXED_NGN_MARKUP)
 */

export type ServerConfig = {
  id: string;
  label: string;
  provider: string;
  envKeys: string[];
  scope: "usa" | "global" | "rental";
  MARKUP_PERCENTAGE: number;
  FIXED_NGN_MARKUP: number;
};

export type PricingConfig = {
  USD_TO_NGN_RATE: number;
  servers: ServerConfig[];
};

export const PRICING_KEY = "verxor-pricing-config";

export const DEFAULT_PRICING: PricingConfig = {
  USD_TO_NGN_RATE: 1600,
  servers: [
    { id: "usa-s1", label: "USA S1", provider: "Text Verified", envKeys: ["TEXT_VERIFIED_API_KEY"], scope: "usa", MARKUP_PERCENTAGE: 1.5, FIXED_NGN_MARKUP: 200 },
    { id: "usa-s2", label: "USA S2", provider: "5Sim", envKeys: ["FIVESIM_API_KEY"], scope: "usa", MARKUP_PERCENTAGE: 1.5, FIXED_NGN_MARKUP: 200 },
    { id: "usa-s3", label: "USA S3", provider: "Grizzly SMS", envKeys: ["GRIZZLY_SMS_API_KEY"], scope: "usa", MARKUP_PERCENTAGE: 1.4, FIXED_NGN_MARKUP: 180 },
    { id: "usa-s4", label: "USA S4", provider: "Hero SMS", envKeys: ["HERO_SMS_API_KEY"], scope: "usa", MARKUP_PERCENTAGE: 1.55, FIXED_NGN_MARKUP: 220 },
    { id: "usa-s5", label: "USA S5", provider: "Telnyx", envKeys: ["TELNYX_API_KEY"], scope: "usa", MARKUP_PERCENTAGE: 1.65, FIXED_NGN_MARKUP: 250 },
    { id: "all-s1", label: "🌍 All S1", provider: "Grizzly SMS", envKeys: ["GRIZZLY_SMS_API_KEY"], scope: "global", MARKUP_PERCENTAGE: 1.4, FIXED_NGN_MARKUP: 180 },
    { id: "all-s2", label: "🌍 All S2", provider: "5Sim", envKeys: ["FIVESIM_API_KEY"], scope: "global", MARKUP_PERCENTAGE: 1.5, FIXED_NGN_MARKUP: 200 },
    { id: "all-s3", label: "🌍 All S3", provider: "Telnyx", envKeys: ["TELNYX_API_KEY"], scope: "global", MARKUP_PERCENTAGE: 1.65, FIXED_NGN_MARKUP: 250 },
    { id: "all-s4", label: "🌍 All S4", provider: "Twilio", envKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"], scope: "global", MARKUP_PERCENTAGE: 1.7, FIXED_NGN_MARKUP: 260 },
    { id: "all-s5", label: "🌍 All S5", provider: "Plivo", envKeys: ["PLIVO_AUTH_ID", "PLIVO_AUTH_TOKEN"], scope: "global", MARKUP_PERCENTAGE: 1.6, FIXED_NGN_MARKUP: 240 },
    { id: "all-s6", label: "🌍 All S6", provider: "Telnyx (Alt Pool)", envKeys: ["TELNYX_API_KEY"], scope: "global", MARKUP_PERCENTAGE: 1.65, FIXED_NGN_MARKUP: 250 },
    { id: "rental", label: "Rentals", provider: "Telnyx", envKeys: ["TELNYX_API_KEY"], scope: "rental", MARKUP_PERCENTAGE: 1.6, FIXED_NGN_MARKUP: 500 },
  ],
};

export function loadPricing(): PricingConfig {
  if (typeof window === "undefined") return DEFAULT_PRICING;
  try {
    const raw = window.localStorage.getItem(PRICING_KEY);
    if (!raw) return DEFAULT_PRICING;
    const parsed = JSON.parse(raw) as Partial<PricingConfig>;
    return {
      USD_TO_NGN_RATE: parsed.USD_TO_NGN_RATE ?? DEFAULT_PRICING.USD_TO_NGN_RATE,
      servers: DEFAULT_PRICING.servers.map(
        (s) => parsed.servers?.find((p) => p.id === s.id) ?? s,
      ),
    };
  } catch {
    return DEFAULT_PRICING;
  }
}

export function savePricing(cfg: PricingConfig) {
  window.localStorage.setItem(PRICING_KEY, JSON.stringify(cfg));
}

export function priceInNaira(
  providerCostUsd: number,
  cfg: PricingConfig = DEFAULT_PRICING,
  serverId = "usa-s1",
) {
  const s = cfg.servers.find((x) => x.id === serverId) ?? cfg.servers[0];
  return Math.ceil(
    providerCostUsd * cfg.USD_TO_NGN_RATE * s.MARKUP_PERCENTAGE + s.FIXED_NGN_MARKUP,
  );
}

export function naira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

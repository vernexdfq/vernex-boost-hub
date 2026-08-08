/**
 * Live SMS OTP providers for Virtual Numbers slots.
 * Protocols:
 *  - 5sim REST
 *  - SMS-Activate compatible (Grizzly, DogeSMS, SMSBuyz)
 *  - TextVerified simple API
 */

import {
  SMS_SERVER_SLOTS,
  getSlotMeta,
  readSlotApiKey,
  smsSellPriceNgn,
  type SmsProviderId,
  type SmsSlotId,
} from "@/lib/sms-servers";

export type LiveSmsProduct = {
  id: string;
  service_key: string;
  service_name: string;
  country_code: string;
  country_name: string;
  server_id: string;
  provider: string;
  provider_cost_usd: number;
  selling_price_ngn: number;
  stock_count: number;
};

const SERVICE_NAMES: Record<string, string> = {
  wa: "WhatsApp",
  tg: "Telegram",
  go: "Google",
  fb: "Facebook",
  ig: "Instagram",
  tw: "Twitter",
  nf: "Netflix",
  ds: "Discord",
  oi: "OpenAI",
  mm: "Microsoft",
  am: "Amazon",
  tk: "TikTok",
  lf: "TikTok",
  wx: "Apple",
  ya: "Yahoo",
  ma: "Microsoft Outlook",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  google: "Google",
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter",
  openai: "OpenAI",
  discord: "Discord",
  amazon: "Amazon",
  microsoft: "Microsoft",
  apple: "Apple",
  tiktok: "TikTok",
  netflix: "Netflix",
};

function prettyService(key: string): string {
  const k = key.toLowerCase();
  return SERVICE_NAMES[k] || key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** SMS-Activate style base URLs */
function activateBase(provider: SmsProviderId): string {
  switch (provider) {
    case "grizzly":
      return (
        process.env.GRIZZLY_API_URL?.trim() ||
        process.env.GRIZZLY_SMS_API_URL?.trim() ||
        "https://api.grizzlysms.com/stubs/handler_api.php"
      );
    case "dogesms":
      return (
        process.env.DOGESMS_API_URL?.trim() ||
        "https://api.dogesms.com/stubs/handler_api.php"
      );
    case "smsbuyz":
      return (
        process.env.SMSBUYZ_API_URL?.trim() ||
        "https://smsbuyz.com/stubs/handler_api.php"
      );
    default:
      return "https://api.grizzlysms.com/stubs/handler_api.php";
  }
}

async function fetchActivatePrices(
  provider: SmsProviderId,
  apiKey: string,
  countryFilter: "usa" | "all",
): Promise<LiveSmsProduct[]> {
  const base = activateBase(provider);
  const url = `${base}?api_key=${encodeURIComponent(apiKey)}&action=getPrices`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  // Shape: { "0": { "wa": { "cost": 0.2, "count": 100 }, ... }, "1": {...} }
  // country 0 often Russia; USA is commonly 12 or "usa"
  if (!json || typeof json !== "object") return [];
  const out: LiveSmsProduct[] = [];
  const root = json as Record<string, Record<string, { cost?: number; count?: number; price?: number }>>;

  for (const [countryId, services] of Object.entries(root)) {
    if (!services || typeof services !== "object") continue;
    const isUs =
      countryId === "12" ||
      countryId === "1" ||
      /usa|united/i.test(countryId);
    if (countryFilter === "usa" && !isUs) continue;
    if (countryFilter === "all" && isUs) continue;

    for (const [svc, info] of Object.entries(services)) {
      const cost = Number(info?.cost ?? info?.price ?? 0);
      const count = Number(info?.count ?? 0);
      if (!Number.isFinite(cost) || cost <= 0) continue;
      if (count <= 0) continue;
      const countryCode = isUs ? "US" : countryId.length <= 3 ? countryId.toUpperCase() : "INTL";
      const countryName = isUs ? "United States" : `Country ${countryId}`;
      out.push({
        id: `live-${provider}-${countryId}-${svc}`,
        service_key: svc,
        service_name: prettyService(svc),
        country_code: countryCode,
        country_name: countryName,
        server_id: "", // filled by caller
        provider,
        provider_cost_usd: cost,
        selling_price_ngn: smsSellPriceNgn(cost),
        stock_count: count > 9999 ? 9999 : count,
      });
    }
  }
  return out;
}

async function fetchFiveSimPrices(
  apiKey: string,
  countryFilter: "usa" | "all",
): Promise<LiveSmsProduct[]> {
  // Guest prices are public; with key we can also hit authenticated endpoints
  const url =
    countryFilter === "usa"
      ? "https://5sim.net/v1/guest/prices?country=usa"
      : "https://5sim.net/v1/guest/prices";
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  });
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as Record<
    string,
    Record<string, Record<string, { cost?: number; count?: number }>>
  > | null;
  if (!json) return [];

  const out: LiveSmsProduct[] = [];
  // Shape: { "usa": { "whatsapp": { "virtual51": { cost, count } } } }
  for (const [country, products] of Object.entries(json)) {
    const isUs = /usa|united/i.test(country);
    if (countryFilter === "usa" && !isUs) continue;
    if (countryFilter === "all" && isUs) continue;
    if (!products || typeof products !== "object") continue;

    for (const [product, operators] of Object.entries(products)) {
      if (!operators || typeof operators !== "object") continue;
      let bestCost = Infinity;
      let totalCount = 0;
      for (const op of Object.values(operators)) {
        const cost = Number(op?.cost ?? 0);
        const count = Number(op?.count ?? 0);
        if (count > 0 && cost > 0 && cost < bestCost) bestCost = cost;
        totalCount += count > 0 ? count : 0;
      }
      if (!Number.isFinite(bestCost) || bestCost === Infinity || totalCount <= 0) continue;
      out.push({
        id: `live-fivesim-${country}-${product}`,
        service_key: product,
        service_name: prettyService(product),
        country_code: isUs ? "US" : country.slice(0, 3).toUpperCase(),
        country_name: isUs ? "United States" : country,
        server_id: "",
        provider: "fivesim",
        provider_cost_usd: bestCost,
        selling_price_ngn: smsSellPriceNgn(bestCost),
        stock_count: Math.min(totalCount, 9999),
      });
    }
  }
  return out;
}

async function fetchTextVerifiedServices(
  apiKey: string,
  countryFilter: "usa" | "all",
): Promise<LiveSmsProduct[]> {
  // TextVerified is primarily USA-focused
  if (countryFilter === "all") {
    // Still show USA-centric services under all-countries slots when mapped
  }
  const base =
    process.env.TEXTVERIFIED_API_URL?.trim() ||
    process.env.TEXT_VERIFIED_API_URL?.trim() ||
    "https://www.textverified.com/api";

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/pub/v2/services`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: apiKey,
        "X-API-KEY": apiKey,
      },
    });
    if (!res.ok) {
      // Fallback static popular list with unknown price marker from balance endpoint not available
      return [];
    }
    const json = (await res.json().catch(() => null)) as unknown;
    const list = Array.isArray(json)
      ? json
      : Array.isArray((json as { data?: unknown }).data)
        ? ((json as { data: unknown[] }).data)
        : Array.isArray((json as { services?: unknown }).services)
          ? ((json as { services: unknown[] }).services)
          : [];

    const out: LiveSmsProduct[] = [];
    for (const row of list) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const name = String(r.name ?? r.service_name ?? r.service ?? "").trim();
      if (!name) continue;
      const cost = Number(r.price ?? r.cost ?? r.rate ?? 0.35);
      const stock = Number(r.stock ?? r.quantity ?? 50);
      const key = String(r.id ?? r.service_id ?? name).toLowerCase().replace(/\s+/g, "_");
      out.push({
        id: `live-textverified-${key}`,
        service_key: key,
        service_name: name,
        country_code: "US",
        country_name: "United States",
        server_id: "",
        provider: "textverified",
        provider_cost_usd: cost > 10 ? cost / 100 : cost, // cents vs dollars heuristic
        selling_price_ngn: smsSellPriceNgn(cost > 10 ? cost / 100 : cost),
        stock_count: stock > 0 ? stock : 50,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function listLiveProductsForSlot(slotId: SmsSlotId): Promise<LiveSmsProduct[]> {
  const meta = getSlotMeta(slotId);
  if (!meta) return [];
  const apiKey = readSlotApiKey(meta);
  if (!apiKey) {
    console.warn(`[sms] No API key configured for slot ${slotId}`);
    return [];
  }

  const filter = meta.group === "usa" ? "usa" : "all";
  let products: LiveSmsProduct[] = [];

  try {
    switch (meta.provider) {
      case "fivesim":
        products = await fetchFiveSimPrices(apiKey, filter);
        break;
      case "grizzly":
      case "dogesms":
      case "smsbuyz":
        products = await fetchActivatePrices(meta.provider, apiKey, filter);
        break;
      case "textverified":
        products = await fetchTextVerifiedServices(apiKey, filter);
        break;
    }
  } catch (err) {
    console.error(`[sms] listLiveProductsForSlot ${slotId}`, err);
    return [];
  }

  // Prefer popular services first
  const priority = ["whatsapp", "wa", "telegram", "tg", "google", "go", "facebook", "fb", "instagram", "ig"];
  products.sort((a, b) => {
    const ai = priority.indexOf(a.service_key.toLowerCase());
    const bi = priority.indexOf(b.service_key.toLowerCase());
    const ap = ai === -1 ? 999 : ai;
    const bp = bi === -1 ? 999 : bi;
    if (ap !== bp) return ap - bp;
    return a.service_name.localeCompare(b.service_name);
  });

  return products.map((p) => ({
    ...p,
    server_id: slotId,
    country_code: meta.group === "usa" ? "US" : p.country_code,
    country_name: meta.group === "usa" ? "United States" : p.country_name,
  }));
}

export async function listLiveProductsAllSlots(): Promise<LiveSmsProduct[]> {
  const all: LiveSmsProduct[] = [];
  for (const slot of SMS_SERVER_SLOTS) {
    const part = await listLiveProductsForSlot(slot.id);
    all.push(...part);
  }
  return all;
}

export type BuyNumberResult =
  | { ok: true; phoneNumber: string; providerOrderId: string; provider: string }
  | { ok: false; message: string };

export async function buyLiveNumber(input: {
  productId: string;
  slotId: SmsSlotId;
}): Promise<BuyNumberResult> {
  const meta = getSlotMeta(input.slotId);
  if (!meta) return { ok: false, message: "Unknown server slot" };
  const apiKey = readSlotApiKey(meta);
  if (!apiKey) return { ok: false, message: `API key not configured for ${meta.label}` };

  // Parse live product id
  // live-fivesim-{country}-{product}
  // live-grizzly|{dogesms|smsbuyz}-{countryId}-{svc}
  // live-textverified-{key}
  const id = input.productId;

  try {
    if (meta.provider === "fivesim" && id.startsWith("live-fivesim-")) {
      const rest = id.slice("live-fivesim-".length);
      const [country, ...prodParts] = rest.split("-");
      const product = prodParts.join("-");
      const buyUrl = `https://5sim.net/v1/user/buy/activation/${encodeURIComponent(country)}/any/${encodeURIComponent(product)}`;
      const res = await fetch(buyUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      });
      const body = (await res.json().catch(() => ({}))) as {
        phone?: string;
        id?: number | string;
        status?: string;
        message?: string;
      };
      if (!res.ok || !body.phone) {
        return {
          ok: false,
          message: body.message || body.status || `5sim purchase failed (HTTP ${res.status})`,
        };
      }
      return {
        ok: true,
        phoneNumber: String(body.phone),
        providerOrderId: String(body.id ?? ""),
        provider: "fivesim",
      };
    }

    if (
      (meta.provider === "grizzly" ||
        meta.provider === "dogesms" ||
        meta.provider === "smsbuyz") &&
      id.startsWith(`live-${meta.provider}-`)
    ) {
      const rest = id.slice(`live-${meta.provider}-`.length);
      const [countryId, service] = rest.split("-");
      const base = activateBase(meta.provider);
      const url = `${base}?api_key=${encodeURIComponent(apiKey)}&action=getNumber&service=${encodeURIComponent(service)}&country=${encodeURIComponent(countryId)}`;
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();
      // ACCESS_NUMBER:id:phone
      if (text.startsWith("ACCESS_NUMBER:")) {
        const parts = text.trim().split(":");
        return {
          ok: true,
          phoneNumber: parts[2] || "",
          providerOrderId: parts[1] || "",
          provider: meta.provider,
        };
      }
      return { ok: false, message: text.slice(0, 200) || "Provider rejected getNumber" };
    }

    if (meta.provider === "textverified") {
      const base =
        process.env.TEXTVERIFIED_API_URL?.trim() ||
        "https://www.textverified.com/api";
      const service = id.replace("live-textverified-", "");
      const res = await fetch(`${base.replace(/\/+$/, "")}/pub/v2/verifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: apiKey,
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({ service }),
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const phone = String(body.number ?? body.phone ?? body.phoneNumber ?? "");
      const orderId = String(body.id ?? body.verification_id ?? "");
      if (!res.ok || !phone) {
        return {
          ok: false,
          message: String(body.message ?? body.error ?? `TextVerified failed (HTTP ${res.status})`),
        };
      }
      return {
        ok: true,
        phoneNumber: phone,
        providerOrderId: orderId,
        provider: "textverified",
      };
    }

    return { ok: false, message: "Unsupported product or provider for purchase" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "SMS provider network error",
    };
  }
}

export function isLiveProductId(id: string): boolean {
  return id.startsWith("live-");
}

export function parseLiveSlotFromProducts(
  products: LiveSmsProduct[],
  productId: string,
): SmsSlotId | null {
  const p = products.find((x) => x.id === productId);
  if (p?.server_id && getSlotMeta(p.server_id)) return p.server_id as SmsSlotId;
  return null;
}

/**
 * Live SMS OTP providers — cached, timed-out, capped for Cloudflare Workers.
 */

import {
  SMS_SERVER_SLOTS,
  getSlotMeta,
  readSlotApiKey,
  smsSellPriceNgn,
  type SmsProviderId,
  type SmsSlotId,
} from "@/lib/sms-servers";
import { cached, fetchWithTimeout } from "@/lib/cache.server";

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

const MAX_PRODUCTS = 80;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const FETCH_MS = 4000;

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

function activateBase(provider: SmsProviderId): string {
  switch (provider) {
    case "grizzly":
      return (
        process.env.GRIZZLY_API_URL?.trim() ||
        "https://api.grizzlysms.com/stubs/handler_api.php"
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

function prioritize(products: LiveSmsProduct[]): LiveSmsProduct[] {
  const priority = [
    "whatsapp",
    "wa",
    "telegram",
    "tg",
    "google",
    "go",
    "facebook",
    "fb",
    "instagram",
    "ig",
  ];
  const list = (products ?? []).filter((p) => p && p.id);
  list.sort((a, b) => {
    const ak = String(a.service_key ?? "").toLowerCase();
    const bk = String(b.service_key ?? "").toLowerCase();
    const ai = priority.indexOf(ak);
    const bi = priority.indexOf(bk);
    const ap = ai === -1 ? 999 : ai;
    const bp = bi === -1 ? 999 : bi;
    if (ap !== bp) return ap - bp;
    return String(a.service_name ?? "").localeCompare(String(b.service_name ?? ""));
  });
  return list.slice(0, MAX_PRODUCTS);
}


/** DogeSMS uses a modern REST API (not SMS-Activate handler_api). */
async function fetchDogeSmsCatalog(
  apiKey: string,
  countryFilter: "usa" | "all",
): Promise<LiveSmsProduct[]> {
  const base = (process.env.DOGESMS_API_URL?.trim() || "https://api.dogesms.com").replace(/\/+$/, "");
  const countries =
    countryFilter === "usa"
      ? ["US"]
      : ["GB", "CA", "AU", "NG", "IN", "PH", "ID", "BR", "DE", "FR", "NL", "PL"];

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const out: LiveSmsProduct[] = [];
  for (const cc of countries) {
    if (out.length >= MAX_PRODUCTS) break;
    try {
      const res = await fetchWithTimeout(
        `${base}/v1/catalog/prices?country_code=${encodeURIComponent(cc)}`,
        { headers },
        FETCH_MS,
      );
      if (res.status === 401 || res.status === 403) {
        console.error("[sms] DogeSMS auth failed — check DOGESMS_API_KEY");
        return [];
      }
      if (!res.ok) continue;
      const json = (await res.json().catch(() => null)) as unknown;
      const rows = Array.isArray(json)
        ? json
        : Array.isArray((json as { data?: unknown })?.data)
          ? ((json as { data: unknown[] }).data)
          : Array.isArray((json as { prices?: unknown })?.prices)
            ? ((json as { prices: unknown[] }).prices)
            : [];
      for (const row of rows) {
        if (out.length >= MAX_PRODUCTS) break;
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const code = String(r.service_code ?? r.code ?? r.service ?? "").trim();
        const name = String(r.service_name ?? r.name ?? code).trim();
        if (!code && !name) continue;
        // price_cents is USD cents
        const cents = Number(r.price_cents ?? r.price ?? r.cost ?? 0);
        const cost = cents > 20 ? cents / 100 : cents; // if already dollars keep small
        const count = Number(r.available_count ?? r.count ?? r.stock ?? 0);
        if (!(cost > 0) || !(count > 0)) continue;
        out.push({
          id: `live-dogesms-${cc}-${code || name}`,
          service_key: code || name.toLowerCase().replace(/\s+/g, "_"),
          service_name: prettyService(name || code),
          country_code: cc,
          country_name: cc === "US" ? "United States" : cc,
          server_id: "",
          provider: "dogesms",
          provider_cost_usd: cost,
          selling_price_ngn: smsSellPriceNgn(cost),
          stock_count: Math.min(count, 9999),
        });
      }
    } catch (err) {
      console.error("[sms] DogeSMS catalog", cc, err);
    }
  }
  return out;
}

async function fetchActivatePrices(
  provider: SmsProviderId,
  apiKey: string,
  countryFilter: "usa" | "all",
): Promise<LiveSmsProduct[]> {
  const base = activateBase(provider);
  // Prefer country-scoped prices when USA-only (country 12 is common USA id)
  const url =
    countryFilter === "usa"
      ? `${base}?api_key=${encodeURIComponent(apiKey)}&action=getPrices&country=12`
      : `${base}?api_key=${encodeURIComponent(apiKey)}&action=getPrices`;

  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } }, FETCH_MS);
  const text = await res.text();
  if (/BAD_KEY|BAD_ACTION|error/i.test(text) && text.length < 80) {
    console.error(`[sms] ${provider} prices error:`, text.slice(0, 120));
    return [];
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.error(`[sms] ${provider} prices non-JSON:`, text.slice(0, 120));
    return [];
  }
  if (!json || typeof json !== "object") return [];

  const out: LiveSmsProduct[] = [];
  const root = json as Record<
    string,
    Record<string, { cost?: number; count?: number; price?: number }> | { cost?: number; count?: number }
  >;

  // Some APIs return flat { wa: { cost, count } } when country is set
  const entries: Array<[string, Record<string, { cost?: number; count?: number; price?: number }>]> = [];
  const sample = Object.values(root)[0];
  if (sample && typeof sample === "object" && ("cost" in sample || "count" in sample || "price" in sample)) {
    entries.push([countryFilter === "usa" ? "12" : "0", root as Record<string, { cost?: number; count?: number; price?: number }>]);
  } else {
    for (const [countryId, services] of Object.entries(root)) {
      if (services && typeof services === "object") {
        entries.push([countryId, services as Record<string, { cost?: number; count?: number; price?: number }>]);
      }
    }
  }

  let parsed = 0;
  for (const [countryId, services] of entries) {
    if (parsed >= MAX_PRODUCTS) break;
    const isUs = countryId === "12" || countryId === "1" || /usa|united/i.test(countryId);
    if (countryFilter === "usa" && !isUs && countryId !== "12") {
      // when country=12 was requested, treat all as US
      if (countryFilter === "usa" && !String(countryId).match(/^\d+$/)) continue;
    }
    if (countryFilter === "all" && isUs) continue;

    for (const [svc, info] of Object.entries(services)) {
      if (parsed >= MAX_PRODUCTS) break;
      if (!info || typeof info !== "object") continue;
      const treatUs = countryFilter === "usa" || isUs;
      const asRec = info as Record<string, unknown>;
      // Flat { cost, count }
      if ("cost" in asRec || "price" in asRec || "count" in asRec) {
        const cost = Number(asRec.cost ?? asRec.price ?? 0);
        const count = Number(asRec.count ?? 0);
        if (!Number.isFinite(cost) || cost <= 0 || count <= 0) continue;
        out.push({
          id: `live-${provider}-${countryId}-${svc}`,
          service_key: svc,
          service_name: prettyService(svc),
          country_code: treatUs ? "US" : String(countryId).slice(0, 3).toUpperCase(),
          country_name: treatUs ? "United States" : `Country ${countryId}`,
          server_id: "",
          provider,
          provider_cost_usd: cost,
          selling_price_ngn: smsSellPriceNgn(cost),
          stock_count: Math.min(count, 9999),
        });
        parsed++;
        continue;
      }
      // Nested tiers e.g. { "100": { cost, count }, "500": { cost, count } }
      for (const [tierKey, tierVal] of Object.entries(asRec)) {
        if (parsed >= MAX_PRODUCTS) break;
        if (!tierVal || typeof tierVal !== "object") continue;
        const tv = tierVal as { cost?: number; price?: number; count?: number };
        const cost = Number(tv.cost ?? tv.price ?? 0);
        const count = Number(tv.count ?? tierKey ?? 0);
        if (!Number.isFinite(cost) || cost <= 0 || count <= 0) continue;
        out.push({
          id: `live-${provider}-${countryId}-${svc}-${tierKey}`,
          service_key: svc,
          service_name: `${prettyService(svc)} · ${count.toLocaleString()} qty`,
          country_code: treatUs ? "US" : String(countryId).slice(0, 3).toUpperCase(),
          country_name: treatUs ? "United States" : `Country ${countryId}`,
          server_id: "",
          provider,
          provider_cost_usd: cost,
          selling_price_ngn: smsSellPriceNgn(cost),
          stock_count: Math.min(count, 9999),
        });
        parsed++;
      }
    }
  }
  return out;
}

async function fetchFiveSimPrices(
  apiKey: string,
  countryFilter: "usa" | "all",
): Promise<LiveSmsProduct[]> {
  // Scope by country — full global dump is too large for Workers
  const countries =
    countryFilter === "usa"
      ? ["usa"]
      : ["england", "canada", "nigeria", "india", "philippines", "indonesia", "brazil", "germany", "france", "netherlands"];

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };

  const out: LiveSmsProduct[] = [];
  let parsed = 0;

  for (const country of countries) {
    if (parsed >= MAX_PRODUCTS) break;
    try {
      const res = await fetchWithTimeout(
        `https://5sim.net/v1/guest/prices?country=${encodeURIComponent(country)}`,
        { headers },
        FETCH_MS,
      );
      if (!res.ok) continue;
      const json = (await res.json().catch(() => null)) as Record<
        string,
        Record<string, Record<string, { cost?: number; count?: number }>>
      > | null;
      if (!json) continue;

      for (const [cName, products] of Object.entries(json)) {
        if (parsed >= MAX_PRODUCTS) break;
        const isUs = /usa|united/i.test(cName);
        if (countryFilter === "usa" && !isUs) continue;
        if (countryFilter === "all" && isUs) continue;
        if (!products || typeof products !== "object") continue;

        for (const [product, operators] of Object.entries(products)) {
          if (parsed >= MAX_PRODUCTS) break;
          if (!operators || typeof operators !== "object") continue;
          // Prefer cheapest operator with stock (one row per service; more services fit)
          let bestCost = Infinity;
          let bestCount = 0;
          let bestOp = "any";
          for (const [operator, op] of Object.entries(operators)) {
            const cost = Number(op?.cost ?? 0);
            const count = Number(op?.count ?? 0);
            if (count > 0 && cost > 0 && cost < bestCost) {
              bestCost = cost;
              bestCount = count;
              bestOp = operator;
            }
          }
          if (!Number.isFinite(bestCost) || bestCost === Infinity || bestCount <= 0) continue;
          out.push({
            id: `live-fivesim-${cName}-${product}-${bestOp}`,
            service_key: product,
            service_name: prettyService(product),
            country_code: isUs ? "US" : cName.slice(0, 3).toUpperCase(),
            country_name: isUs ? "United States" : cName,
            server_id: "",
            provider: "fivesim",
            provider_cost_usd: bestCost,
            selling_price_ngn: smsSellPriceNgn(bestCost),
            stock_count: Math.min(bestCount, 9999),
          });
          parsed++;
        }
      }
    } catch (err) {
      console.error("[sms] 5sim prices", country, err);
    }
  }
  return out;
}

async function fetchTextVerifiedServices(apiKey: string): Promise<LiveSmsProduct[]> {
  const base =
    process.env.TEXTVERIFIED_API_URL?.trim() ||
    "https://www.textverified.com/api";
  try {
    const res = await fetchWithTimeout(
      `${base.replace(/\/+$/, "")}/pub/v2/services`,
      {
        headers: {
          Accept: "application/json",
          Authorization: apiKey,
          "X-API-KEY": apiKey,
        },
      },
      FETCH_MS,
    );
    if (!res.ok) return [];
    const json = (await res.json().catch(() => null)) as unknown;
    const list = Array.isArray(json)
      ? json
      : Array.isArray((json as { data?: unknown }).data)
        ? ((json as { data: unknown[] }).data)
        : Array.isArray((json as { services?: unknown }).services)
          ? ((json as { services: unknown[] }).services)
          : [];

    const out: LiveSmsProduct[] = [];
    for (const row of list.slice(0, MAX_PRODUCTS)) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const name = String(r.name ?? r.service_name ?? r.service ?? "").trim();
      if (!name) continue;
      const costRaw = Number(r.price ?? r.cost ?? r.rate ?? 0.35);
      const cost = costRaw > 10 ? costRaw / 100 : costRaw;
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
        provider_cost_usd: cost,
        selling_price_ngn: smsSellPriceNgn(cost),
        stock_count: stock > 0 ? stock : 50,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function listLiveProductsForSlot(slotId: SmsSlotId): Promise<LiveSmsProduct[]> {
  try {
    return await cached(`sms-slot:${slotId}`, CACHE_TTL, async () => {
      const meta = getSlotMeta(slotId);
      if (!meta) return [];
      const apiKey = readSlotApiKey(meta);
      if (!apiKey) {
        console.warn(`[sms] missing API key for ${slotId}`);
        return [];
      }

      const filter = meta.group === "usa" ? "usa" : "all";
      let products: LiveSmsProduct[] = [];

      try {
        switch (meta.provider) {
          case "fivesim":
            products = await fetchFiveSimPrices(apiKey, filter);
            break;
          case "dogesms":
            products = await fetchDogeSmsCatalog(apiKey, filter);
            break;
          case "grizzly":
          case "smsbuyz":
            products = await fetchActivatePrices(meta.provider, apiKey, filter);
            break;
          case "textverified":
            products = await fetchTextVerifiedServices(apiKey);
            break;
          default:
            products = [];
        }
      } catch (err) {
        console.error(`[sms] listLiveProductsForSlot ${slotId}`, err);
        return [];
      }

      return prioritize(
        (products ?? []).map((p) => ({
          ...p,
          id: String(p.id),
          service_key: String(p.service_key ?? ""),
          service_name: String(p.service_name ?? p.service_key ?? "Service"),
          country_code: meta.group === "usa" ? "US" : String(p.country_code ?? ""),
          country_name:
            meta.group === "usa" ? "United States" : String(p.country_name ?? ""),
          server_id: slotId,
          provider: String(p.provider ?? meta.provider),
          provider_cost_usd: Number(p.provider_cost_usd) || 0,
          selling_price_ngn: Number(p.selling_price_ngn) || 0,
          stock_count: Number(p.stock_count) || 0,
        })),
      );
    });
  } catch (err) {
    console.error(`[sms] listLiveProductsForSlot outer ${slotId}`, err);
    return [];
  }
}

/** Never fan-out to all providers in one request — Worker CPU limit. */
export async function listLiveProductsAllSlots(): Promise<LiveSmsProduct[]> {
  return listLiveProductsForSlot("US-S1");
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

  const id = input.productId;

  try {
    if (meta.provider === "fivesim" && id.startsWith("live-fivesim-")) {
      const rest = id.slice("live-fivesim-".length);
      const parts = rest.split("-");
      const country = parts[0] || "usa";
      // id: live-fivesim-{country}-{product}-{operator?}
      const operator = parts.length >= 3 ? parts[parts.length - 1] : "any";
      const product =
        parts.length >= 3 ? parts.slice(1, -1).join("-") : parts.slice(1).join("-");
      const buyUrl = `https://5sim.net/v1/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator || "any")}/${encodeURIComponent(product)}`;
      const res = await fetchWithTimeout(
        buyUrl,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
        8000,
      );
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

    if (meta.provider === "dogesms" && id.startsWith("live-dogesms-")) {
      const rest = id.slice("live-dogesms-".length);
      const [cc, ...svcParts] = rest.split("-");
      const serviceCode = svcParts.join("-");
      const base = (process.env.DOGESMS_API_URL?.trim() || "https://api.dogesms.com").replace(
        /\/+$/,
        "",
      );
      const res = await fetchWithTimeout(
        `${base}/v1/orders`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            country_code: cc,
            service_code: serviceCode,
          }),
        },
        8000,
      );
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const phone = String(body.phone_number ?? body.phone ?? body.number ?? "");
      const orderId = String(body.id ?? body.order_id ?? "");
      if (!res.ok || !phone) {
        return {
          ok: false,
          message: String(
            body.message ?? body.error ?? `DogeSMS order failed (HTTP ${res.status})`,
          ),
        };
      }
      return {
        ok: true,
        phoneNumber: phone,
        providerOrderId: orderId,
        provider: "dogesms",
      };
    }

    if (
      (meta.provider === "grizzly" || meta.provider === "smsbuyz") &&
      id.startsWith(`live-${meta.provider}-`)
    ) {
      const rest = id.slice(`live-${meta.provider}-`.length);
      const parts = rest.split("-");
      const countryId = parts[0];
      const service = parts.slice(1).join("-").replace(/·.*$/, "").trim();
      // service may include tier suffix — take first segment before extra
      const serviceCode = parts[1] || service;
      const base = activateBase(meta.provider);
      const url = `${base}?api_key=${encodeURIComponent(apiKey)}&action=getNumber&service=${encodeURIComponent(serviceCode)}&country=${encodeURIComponent(countryId)}`;
      const res = await fetchWithTimeout(url, {}, 8000);
      const text = await res.text();
      if (text.startsWith("ACCESS_NUMBER:")) {
        const bits = text.trim().split(":");
        return {
          ok: true,
          phoneNumber: bits[2] || "",
          providerOrderId: bits[1] || "",
          provider: meta.provider,
        };
      }
      if (text.includes("BAD_KEY")) {
        return { ok: false, message: "Invalid API key for this server — update the key in Cloudflare" };
      }
      return { ok: false, message: text.slice(0, 200) || "Provider rejected getNumber" };
    }

    if (meta.provider === "textverified") {
      const base =
        process.env.TEXTVERIFIED_API_URL?.trim() ||
        "https://www.textverified.com/api";
      const service = id.replace("live-textverified-", "");
      const res = await fetchWithTimeout(
        `${base.replace(/\/+$/, "")}/pub/v2/verifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: apiKey,
            "X-API-KEY": apiKey,
          },
          body: JSON.stringify({ service }),
        },
        8000,
      );
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

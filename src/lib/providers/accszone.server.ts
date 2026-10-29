/**
 * AccsZone REST API client — primary logs provider.
 * Docs: https://accszone.com/api-docs
 *
 * Env:
 *   ACCSZONE_API_BASE — default https://accszone.com/api/v1
 *   ACCSZONE_API_KEY  — acz_... (required for live mode)
 *   ACCSZONE_CACHE_MS — catalogue cache TTL in ms (default 30 min)
 *
 * Retail pricing (editable via env, no code change needed):
 *   LOGS_USD_NGN_RATE — dollar rate (default 1380)
 *   LOGS_TIER1_MULT  — multiplier for provider cost $0.01–$1.00 (default 3.0)
 *   LOGS_TIER2_MULT  — multiplier for $1.01–$10.00 (default 2.0)
 *   LOGS_TIER3_MULT  — multiplier for $10.01+ (default 1.4)
 * Retail prices are rounded UP to the nearest ₦50.
 */

export type AccsZoneListing = {
  id: number;
  title: string;
  slug: string;
  price: string;
  available_stock: number;
  sold: number;
  sort_key: number;
  category: { id: number; title: string; slug: string };
  subcategory?: { id: number; title: string; slug: string } | null;
  description?: string;
};

export type AccsZonePurchase = {
  order_id: number;
  listing: string;
  quantity: number;
  amount: string;
  discount: string;
  new_balance: string;
  accounts: string[];
  purchased_at: string;
  replayed?: boolean;
};

type PagedMeta = { current_page: number; per_page: number; last_page: number; total: number };

type CatalogCache = {
  listings: AccsZoneListing[];
  fetchedAt: number;
  pagesFetched: number;
  lastPage: number;
  total: number;
};

/**
 * Catalogue endpoints share a 30 requests/minute per-account bucket,
 * so we walk pages in chunks of 25 per call and keep a module-level cache.
 * Cold start returns the first ~500 listings; warm calls continue walking
 * until the full catalogue is cached, then serve from cache until the TTL.
 */
const PAGES_PER_WARM = 25;
const DEFAULT_CACHE_MS = 30 * 60 * 1000;

const globalForCache = globalThis as unknown as { __accszoneCache?: CatalogCache };

function apiKey(): string | undefined {
  const k = process.env["ACCSZONE_API_KEY"]?.trim();
  return k && k.length > 4 ? k : undefined;
}

export function isAccsZoneConfigured(): boolean {
  return Boolean(apiKey());
}

function baseUrl(): string {
  return (
    process.env["ACCSZONE_API_BASE"]?.trim() || "https://accszone.com/api/v1"
  ).replace(/\/+$/, "");
}

async function azRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("AccsZone API key is not configured");

  const res = await fetch(baseUrl() + path, {
    ...init,
    headers: {
      "X-API-Key": key,
      Accept: "application/json",
      ...((init?.headers as Record<string, string>) ?? {}),
    },
    cache: "no-store",
  });

  // Catalogue rate limit: wait the exact Retry-After and try once more.
  if (res.status === 429) {
    const seconds = Math.min(Number(res.headers.get("Retry-After") || "20"), 20);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    return azRequest<T>(path, init);
  }

  const json = (await res.json().catch(() => null)) as
    | { success: true; data: T; meta?: PagedMeta }
    | { success: false; error_code?: string; message?: string }
    | null;

  if (!json) {
    const id = res.headers.get("X-Request-Id");
    throw new Error("AccsZone returned an unreadable response" + (id ? " (request " + id + ")" : ""));
  }
  if (!json.success) {
    const failed = json as { error_code?: string; message?: string };
    throw new Error(failed.message || failed.error_code || "AccsZone request failed");
  }
  return json.data;
}

async function azRequestPaged<T>(path: string): Promise<{ data: T; meta: PagedMeta }> {
  const key = apiKey();
  if (!key) throw new Error("AccsZone API key is not configured");
  const res = await fetch(baseUrl() + path, {
    headers: { "X-API-Key": key, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 429) {
    const seconds = Math.min(Number(res.headers.get("Retry-After") || "20"), 20);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    return azRequestPaged<T>(path);
  }
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: T; meta: PagedMeta }
    | { success: false; error_code?: string; message?: string }
    | null;
  if (!json || !json.success) {
    const failed = (json ?? {}) as { message?: string; error_code?: string };
    throw new Error(failed.message || failed.error_code || "AccsZone request failed");
  }
  return { data: json.data, meta: json.meta };
}

export async function accsZoneBalance(): Promise<number> {
  const data = await azRequest<{ balance: string }>("/user/balance");
  return Number(data.balance) || 0;
}

/**
 * Purchase accounts. client_reference is an idempotency key: a retry with
 * the same UUID returns the original order instead of buying twice.
 */
export async function accsZonePurchase(
  adId: number,
  quantity: number,
  clientReference: string,
): Promise<AccsZonePurchase> {
  return azRequest<AccsZonePurchase>("/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ad_id: adId,
      quantity,
      client_reference: clientReference,
    }),
  });
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, String.fromCharCode(34))
    .replace(/&#39;/g, String.fromCharCode(39))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Walk the live catalogue in rate-limit-safe chunks with a module cache.
 * Returns whatever is synced so far (starts with ~500 listings, fills in
 * to the full catalogue over subsequent warm calls).
 */
export async function getAccsZoneCatalog(force = false): Promise<AccsZoneListing[]> {
  const ttl = Number(process.env["ACCSZONE_CACHE_MS"] || DEFAULT_CACHE_MS);
  const now = Date.now();
  let cache = globalForCache.__accszoneCache;

  if (force || !cache || now - cache.fetchedAt > ttl) {
    cache = { listings: [], fetchedAt: now, pagesFetched: 0, lastPage: 1, total: 0 };
  }

  if (cache.pagesFetched >= cache.lastPage && cache.listings.length > 0) {
    return cache.listings; // fully synced and still fresh
  }

  const byId = new Map(cache.listings.map((l) => [l.id, l] as const));
  const startPage = cache.pagesFetched + 1;

  for (let page = startPage; page < startPage + PAGES_PER_WARM; page++) {
    const { data, meta } = await azRequestPaged<AccsZoneListing[]>(
      "/listings?include=description&page=" + page,
    );
    cache.pagesFetched = meta.current_page;
    cache.lastPage = meta.last_page;
    cache.total = meta.total;
    for (const row of data ?? []) {
      byId.set(row.id, row); // upsert — prices/stock refresh on every pass
    }
    if (!data || data.length === 0 || meta.current_page >= meta.lastPage) break;
  }

  cache.listings = Array.from(byId.values());
  globalForCache.__accszoneCache = cache;
  return cache.listings;
}

/**
 * Retail Naira price for a provider USD cost.
 *   customer ₦ = provider USD cost × tier multiplier × dollar rate
 * — always rounded UP to the nearest ₦50 for retail users.
 */
export function logsRetailPriceNgn(providerCostUsd: number): number {
  const rate = Number(
    process.env["LOGS_USD_NGN_RATE"] || process.env["USD_TO_NGN_RATE"] || 1380,
  );
  const t1 = Number(process.env["LOGS_TIER1_MULT"] || 3.0);
  const t2 = Number(process.env["LOGS_TIER2_MULT"] || 2.0);
  const t3 = Number(process.env["LOGS_TIER3_MULT"] || 1.4);
  const usd = Number(providerCostUsd) || 0;
  const mult = usd <= 1 ? t1 : usd <= 10 ? t2 : t3;
  const exact = usd * rate * mult;
  if (exact <= 0) return 0;
  return Math.ceil(exact / 50) * 50;
}
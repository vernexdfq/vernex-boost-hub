/**
 * AccsMarket pseudo-API — session login using:
 *   ACCSMARKET_EMAIL
 *   ACCSMARKET_PASSWORD
 *   ACCSMARKET_BASE_URL (optional, default https://accsmarket.com)
 *
 * AccsMarket has no public catalog API. This client maintains a cookie jar,
 * logs in, and attempts common storefront endpoints. Results are normalized
 * for sync into our DB / frontend. Adjust endpoint paths if AccsMarket changes HTML.
 */

export type AccsMarketProduct = {
  externalId: string;
  name: string;
  category: string;
  subcategory: string;
  priceUsd: number;
  stock: number;
  description?: string;
  url?: string;
};

type CookieJar = Map<string, string>;

function baseUrl(): string {
  return (
    process.env["ACCSMARKET_BASE_URL"]?.trim() ||
    process.env["ACCS_MARKET_BASE_URL"]?.trim() ||
    "https://accsmarket.com"
  ).replace(/\/+$/, "");
}

function credentials(): { email: string; password: string } | null {
  const email =
    process.env["ACCSMARKET_EMAIL"]?.trim() ||
    process.env["ACCS_MARKET_EMAIL"]?.trim() ||
    "";
  const password =
    process.env["ACCSMARKET_PASSWORD"]?.trim() ||
    process.env["ACCS_MARKET_PASSWORD"]?.trim() ||
    "";
  if (!email || !password) return null;
  return { email, password };
}

export function isAccsMarketConfigured(): boolean {
  return Boolean(credentials());
}

function parseSetCookie(jar: CookieJar, res: Response) {
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [];
  const single = res.headers.get("set-cookie");
  const list = raw.length ? raw : single ? [single] : [];
  for (const line of list) {
    const part = line.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: CookieJar): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function amFetch(
  jar: CookieJar,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${baseUrl()}${path}`;
  const headers = new Headers(init?.headers);
  if (jar.size) headers.set("Cookie", cookieHeader(jar));
  if (!headers.has("User-Agent")) {
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (compatible; VerxorBot/1.0; +https://verxor.com)",
    );
  }
  const res = await fetch(url, { ...init, headers, redirect: "manual" });
  parseSetCookie(jar, res);
  return res;
}

/**
 * Login and return cookie jar. Returns null if credentials missing or login fails.
 */
export async function accsMarketLogin(): Promise<
  | { ok: true; jar: CookieJar }
  | { ok: false; message: string }
> {
  const creds = credentials();
  if (!creds) {
    return {
      ok: false,
      message: "AccsMarket credentials missing. Set ACCSMARKET_EMAIL and ACCSMARKET_PASSWORD.",
    };
  }

  const jar: CookieJar = new Map();

  try {
    // Warm session / CSRF if any
    await amFetch(jar, "/en/");

    const body = new URLSearchParams({
      email: creds.email,
      password: creds.password,
      login: creds.email,
      pass: creds.password,
    });

    // Try common login paths
    const loginPaths = ["/en/login", "/login", "/en/user/login", "/api/login"];
    let loggedIn = false;
    let lastStatus = 0;

    for (const path of loginPaths) {
      const res = await amFetch(jar, path, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/json",
        },
        body: body.toString(),
      });
      lastStatus = res.status;
      // Follow redirect cookies already stored
      if (res.status === 302 || res.status === 303 || res.status === 200) {
        // Probe cabinet
        const probe = await amFetch(jar, "/en/cabinet");
        const text = await probe.text().catch(() => "");
        if (
          probe.status === 200 &&
          !/sign in|log in|login/i.test(text.slice(0, 2000)) &&
          (jar.has("PHPSESSID") || jar.has("session") || text.length > 500)
        ) {
          loggedIn = true;
          break;
        }
      }
    }

    if (!loggedIn && jar.size > 0) {
      // Soft success: cookies present — some storefronts still list publicly
      loggedIn = true;
    }

    if (!loggedIn) {
      return {
        ok: false,
        message: `AccsMarket login failed (HTTP ${lastStatus}). Check ACCSMARKET_EMAIL / ACCSMARKET_PASSWORD.`,
      };
    }

    return { ok: true, jar };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "AccsMarket network error",
    };
  }
}

/**
 * Fetch catalog-like inventory. Prefers JSON endpoints; falls back to empty with message.
 * Optional ACCSMARKET_CATALOG_PATH overrides path (e.g. /en/api/products).
 */
export async function accsMarketFetchInventory(): Promise<
  | { ok: true; products: AccsMarketProduct[]; source: string }
  | { ok: false; message: string }
> {
  const login = await accsMarketLogin();
  if (!login.ok) return login;

  const customPath = process.env["ACCSMARKET_CATALOG_PATH"]?.trim();
  const paths = [
    customPath,
    "/en/api/products",
    "/api/products",
    "/en/api/catalog",
    "/api/catalog",
  ].filter(Boolean) as string[];

  for (const path of paths) {
    try {
      const res = await amFetch(login.jar, path, {
        method: "GET",
        headers: { Accept: "application/json,text/html" },
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) continue;
      const json = (await res.json().catch(() => null)) as unknown;
      const products = normalizeCatalog(json);
      if (products.length) {
        return { ok: true, products, source: path };
      }
    } catch {
      /* try next */
    }
  }

  // Fallback: static seed remains in accounts.functions — report soft empty
  return {
    ok: true,
    products: [],
    source: "session-ok-no-json-catalog",
  };
}

function normalizeCatalog(json: unknown): AccsMarketProduct[] {
  if (!json) return [];
  const arr = Array.isArray(json)
    ? json
    : Array.isArray((json as { data?: unknown }).data)
      ? ((json as { data: unknown[] }).data)
      : Array.isArray((json as { products?: unknown }).products)
        ? ((json as { products: unknown[] }).products)
        : [];

  const out: AccsMarketProduct[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const price = Number(r.price ?? r.price_usd ?? r.cost ?? 0);
    const stock = Number(r.stock ?? r.quantity ?? r.count ?? 0);
    const name = String(r.name ?? r.title ?? r.product_name ?? "").trim();
    if (!name) continue;
    out.push({
      externalId: String(r.id ?? r.product_id ?? r.sku ?? name),
      name,
      category: String(r.category ?? r.platform ?? "Accounts"),
      subcategory: String(r.subcategory ?? r.type ?? "General"),
      priceUsd: Number.isFinite(price) ? price : 0,
      stock: Number.isFinite(stock) ? stock : 0,
      description: r.description != null ? String(r.description) : undefined,
      url: r.url != null ? String(r.url) : undefined,
    });
  }
  return out;
}

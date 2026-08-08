/**
 * JustAnotherPanel (JAP) — SMM provider for Boost orders.
 *
 * Cloudflare env:
 *   BOOST_API_KEY   (required)
 *   BOOST_API_URL   (optional, default https://justanotherpanel.com/api/v2)
 */

export type JapAddResult =
  | { ok: true; order: number; raw: unknown }
  | { ok: false; message: string; status?: number; raw?: unknown };

export type JapStatusResult =
  | {
      ok: true;
      charge: string;
      startCount: string;
      status: string;
      remains: string;
      currency: string;
      raw: unknown;
    }
  | { ok: false; message: string; status?: number; raw?: unknown };

function apiKey(): string | null {
  return (
    process.env["BOOST_API_KEY"]?.trim() ||
    process.env["JAP_API_KEY"]?.trim() ||
    process.env["SMM_API_KEY"]?.trim() ||
    null
  );
}

function apiUrl(): string {
  const raw =
    process.env["BOOST_API_URL"]?.trim() ||
    process.env["JAP_API_URL"]?.trim() ||
    "https://justanotherpanel.com/api/v2";
  return raw.replace(/\/+$/, "");
}

export function isJapConfigured(): boolean {
  return Boolean(apiKey());
}

async function japRequest(params: Record<string, string>): Promise<{
  status: number;
  body: unknown;
}> {
  const key = apiKey();
  if (!key) {
    return { status: 0, body: { error: "BOOST_API_KEY is not configured" } };
  }

  const body = new URLSearchParams({ key, ...params });
  const res = await fetch(apiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
}

/**
 * Place an order on JAP.
 * @see https://justanotherpanel.com — action=add
 */
export async function japAddOrder(input: {
  serviceId: number | string;
  link: string;
  quantity: number;
}): Promise<JapAddResult> {
  if (!apiKey()) {
    return {
      ok: false,
      message: "Boost provider is not configured. Set BOOST_API_KEY in Cloudflare.",
    };
  }

  const service = String(input.serviceId).trim();
  if (!/^\d+$/.test(service)) {
    return {
      ok: false,
      message: `Invalid JAP service ID "${service}". Store the numeric JAP service id on the product.`,
    };
  }

  try {
    const { status, body } = await japRequest({
      action: "add",
      service,
      link: input.link.trim(),
      quantity: String(Math.floor(input.quantity)),
    });

    const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const errMsg =
      (obj?.error != null && String(obj.error)) ||
      (typeof body === "string" && /error|invalid/i.test(body) ? body : null);

    if (errMsg) {
      return { ok: false, message: String(errMsg), status, raw: body };
    }

    const orderId = obj?.order;
    if (orderId == null || orderId === "") {
      return {
        ok: false,
        message: "JAP did not return an order id",
        status,
        raw: body,
      };
    }

    return { ok: true, order: Number(orderId), raw: body };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JAP network error";
    return { ok: false, message };
  }
}

/**
 * Check order status on JAP.
 * @see action=status
 */
export async function japOrderStatus(orderId: number | string): Promise<JapStatusResult> {
  if (!apiKey()) {
    return {
      ok: false,
      message: "Boost provider is not configured. Set BOOST_API_KEY in Cloudflare.",
    };
  }

  try {
    const { status, body } = await japRequest({
      action: "status",
      order: String(orderId),
    });

    const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    if (obj?.error != null) {
      return { ok: false, message: String(obj.error), status, raw: body };
    }
    if (!obj) {
      return { ok: false, message: "Invalid status response from JAP", status, raw: body };
    }

    return {
      ok: true,
      charge: String(obj.charge ?? ""),
      startCount: String(obj.start_count ?? ""),
      status: String(obj.status ?? ""),
      remains: String(obj.remains ?? ""),
      currency: String(obj.currency ?? ""),
      raw: body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JAP network error";
    return { ok: false, message };
  }
}

/** Extract numeric JAP service id from product fields */
export function resolveJapServiceId(product: {
  service_type?: string | null;
  platform?: string | null;
  metadata?: unknown;
}): number | null {
  const meta =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {};

  const candidates = [
    meta.jap_service_id,
    meta.service_id,
    meta.provider_service_id,
    meta.external_service_id,
    product.service_type,
  ];

  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (/^\d+$/.test(s)) return Number(s);
    const m = s.match(/(?:^|[^\d])(\d{3,})\s*$/);
    if (m) return Number(m[1]);
  }
  return null;
}

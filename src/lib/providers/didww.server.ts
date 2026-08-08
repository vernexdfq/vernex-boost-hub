/**
 * DIDWW — international (non-USA) number rentals.
 * Env (Cloudflare / server):
 *   DIDWW_API_KEY
 */

export type DidwwProvisionResult =
  | {
      ok: true;
      provider: "didww";
      phoneNumber: string;
      providerOrderId: string;
      raw?: unknown;
    }
  | {
      ok: false;
      provider: "didww";
      message: string;
      status?: number;
    };

const DIDWW_BASE = "https://api.didww.com/v3";

function apiKey(): string | null {
  return (
    process.env["DIDWW_API_KEY"]?.trim() ||
    process.env["DIDWW_APIKEY"]?.trim() ||
    null
  );
}

export function isDidwwConfigured(): boolean {
  return Boolean(apiKey());
}

function headers(): HeadersInit {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    "Api-Key": apiKey()!,
  };
}

/**
 * Provision a DIDWW number for a non-US country.
 * When inventory already has an E.164, we record an order metadata call;
 * otherwise we attempt available DIDs for the ISO country and create an order.
 */
export async function provisionDidwwNumber(input: {
  countryCode: string;
  phoneNumber?: string | null;
}): Promise<DidwwProvisionResult> {
  if (!isDidwwConfigured()) {
    return {
      ok: false,
      provider: "didww",
      message: "DIDWW is not configured. Set DIDWW_API_KEY on the server.",
    };
  }

  const country = (input.countryCode || "").toUpperCase();
  if (!country || country === "US" || country === "USA") {
    return {
      ok: false,
      provider: "didww",
      message: "DIDWW handler is for non-USA countries only.",
    };
  }

  try {
    // 1) Resolve available DID group / SKU for country
    const availUrl = `${DIDWW_BASE}/available_dids?filter[country.id]=${encodeURIComponent(country)}&page[size]=1`;
    const availRes = await fetch(availUrl, { method: "GET", headers: headers() });
    const availBody = (await availRes.json().catch(() => ({}))) as {
      data?: Array<{ id?: string; attributes?: { number?: string } }>;
      errors?: Array<{ detail?: string; title?: string }>;
    };

    if (!availRes.ok) {
      const detail =
        availBody.errors?.[0]?.detail ||
        availBody.errors?.[0]?.title ||
        `DIDWW available DIDs failed (HTTP ${availRes.status})`;
      return { ok: false, provider: "didww", status: availRes.status, message: detail };
    }

    const availableId = availBody.data?.[0]?.id;
    const availableNumber =
      input.phoneNumber?.trim() ||
      availBody.data?.[0]?.attributes?.number ||
      "";

    if (!availableId && !input.phoneNumber) {
      return {
        ok: false,
        provider: "didww",
        message: `No DIDWW inventory available for country ${country}.`,
      };
    }

    // 2) Create order for the available DID when API inventory is present
    if (availableId) {
      const orderPayload = {
        data: {
          type: "orders",
          attributes: {
            allow_back_ordering: false,
            items: [
              {
                type: "did_order_items",
                attributes: {
                  available_did_id: availableId,
                  qty: 1,
                },
              },
            ],
          },
        },
      };

      const orderRes = await fetch(`${DIDWW_BASE}/orders`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(orderPayload),
      });
      const orderBody = (await orderRes.json().catch(() => ({}))) as {
        data?: { id?: string; attributes?: Record<string, unknown> };
        errors?: Array<{ detail?: string; title?: string }>;
      };

      if (!orderRes.ok) {
        const detail =
          orderBody.errors?.[0]?.detail ||
          orderBody.errors?.[0]?.title ||
          `DIDWW order failed (HTTP ${orderRes.status})`;
        return { ok: false, provider: "didww", status: orderRes.status, message: detail };
      }

      return {
        ok: true,
        provider: "didww",
        phoneNumber: availableNumber || String(input.phoneNumber || ""),
        providerOrderId: orderBody.data?.id || availableId,
        raw: orderBody,
      };
    }

    // Inventory-backed path: phone already assigned in our DB; confirm key works with a lightweight call
    const ping = await fetch(`${DIDWW_BASE}/countries?page[size]=1`, {
      method: "GET",
      headers: headers(),
    });
    if (!ping.ok) {
      return {
        ok: false,
        provider: "didww",
        status: ping.status,
        message: `DIDWW authentication failed (HTTP ${ping.status})`,
      };
    }

    return {
      ok: true,
      provider: "didww",
      phoneNumber: String(input.phoneNumber),
      providerOrderId: `inventory-${country}-${Date.now().toString(36)}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DIDWW network error";
    return { ok: false, provider: "didww", message };
  }
}

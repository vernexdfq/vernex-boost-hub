/**
 * DIDWW — international (non-USA) number rentals.
 * Env: DIDWW_API_KEY
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

export type DidwwCountry = {
  id: string;
  iso: string;
  name: string;
  prefix?: string;
};

export type DidwwAvailableDid = {
  id: string;
  number: string;
  countryIso: string;
  countryName: string;
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

export async function listDidwwCountries(): Promise<
  | { ok: true; countries: DidwwCountry[] }
  | { ok: false; message: string; status?: number }
> {
  if (!isDidwwConfigured()) {
    return { ok: false, message: "DIDWW is not configured. Set DIDWW_API_KEY on the server." };
  }
  try {
    const res = await fetch(`${DIDWW_BASE}/countries?page[size]=200`, {
      method: "GET",
      headers: headers(),
    });
    const body = (await res.json().catch(() => ({}))) as {
      data?: Array<{
        id?: string;
        attributes?: { iso?: string; name?: string; prefix?: string };
      }>;
      errors?: Array<{ detail?: string; title?: string }>;
    };
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message:
          body.errors?.[0]?.detail ||
          body.errors?.[0]?.title ||
          `DIDWW countries failed (HTTP ${res.status})`,
      };
    }
    const countries: DidwwCountry[] = (body.data ?? [])
      .map((c) => ({
        id: String(c.id || ""),
        iso: String(c.attributes?.iso || "").toUpperCase(),
        name: String(c.attributes?.name || c.attributes?.iso || ""),
        prefix: c.attributes?.prefix,
      }))
      .filter((c) => c.id && c.iso && c.iso !== "US");
    return { ok: true, countries };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "DIDWW network error",
    };
  }
}

export async function searchDidwwAvailable(input: {
  countryIso: string;
  limit?: number;
}): Promise<
  | { ok: true; numbers: DidwwAvailableDid[]; countryId?: string }
  | { ok: false; message: string; status?: number }
> {
  if (!isDidwwConfigured()) {
    return { ok: false, message: "DIDWW is not configured. Set DIDWW_API_KEY on the server." };
  }
  const iso = input.countryIso.toUpperCase();
  if (iso === "US" || iso === "USA") {
    return { ok: false, message: "DIDWW is for non-USA countries only." };
  }

  try {
    const countries = await listDidwwCountries();
    if (!countries.ok) return countries;
    const match = countries.countries.find((c) => c.iso === iso);
    if (!match) {
      return { ok: false, message: `Country ${iso} is not available on DIDWW.` };
    }

    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    const availUrl = `${DIDWW_BASE}/available_dids?filter[country.id]=${encodeURIComponent(match.id)}&page[size]=${limit}`;
    const availRes = await fetch(availUrl, { method: "GET", headers: headers() });
    const availBody = (await availRes.json().catch(() => ({}))) as {
      data?: Array<{ id?: string; attributes?: { number?: string } }>;
      errors?: Array<{ detail?: string; title?: string }>;
    };
    if (!availRes.ok) {
      return {
        ok: false,
        status: availRes.status,
        message:
          availBody.errors?.[0]?.detail ||
          availBody.errors?.[0]?.title ||
          `DIDWW available DIDs failed (HTTP ${availRes.status})`,
      };
    }

    const numbers: DidwwAvailableDid[] = (availBody.data ?? [])
      .map((d) => ({
        id: String(d.id || ""),
        number: String(d.attributes?.number || ""),
        countryIso: match.iso,
        countryName: match.name,
      }))
      .filter((d) => d.id && d.number);

    return { ok: true, numbers, countryId: match.id };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "DIDWW network error",
    };
  }
}

export async function provisionDidwwNumber(input: {
  countryCode: string;
  phoneNumber?: string | null;
  availableDidId?: string | null;
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
    let availableId = input.availableDidId?.trim() || "";
    let availableNumber = input.phoneNumber?.trim() || "";

    if (!availableId) {
      const search = await searchDidwwAvailable({ countryIso: country, limit: 1 });
      if (!search.ok) {
        return { ok: false, provider: "didww", message: search.message, status: search.status };
      }
      availableId = search.numbers[0]?.id || "";
      availableNumber = availableNumber || search.numbers[0]?.number || "";
    }

    if (!availableId) {
      return {
        ok: false,
        provider: "didww",
        message: `No DIDWW inventory available for country ${country}.`,
      };
    }

    const orderRes = await fetch(`${DIDWW_BASE}/orders`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
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
      }),
    });
    const orderBody = (await orderRes.json().catch(() => ({}))) as {
      data?: { id?: string };
      errors?: Array<{ detail?: string; title?: string }>;
    };

    if (!orderRes.ok) {
      return {
        ok: false,
        provider: "didww",
        status: orderRes.status,
        message:
          orderBody.errors?.[0]?.detail ||
          orderBody.errors?.[0]?.title ||
          `DIDWW order failed (HTTP ${orderRes.status})`,
      };
    }

    return {
      ok: true,
      provider: "didww",
      phoneNumber: availableNumber || "",
      providerOrderId: orderBody.data?.id || availableId,
      raw: orderBody,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DIDWW network error";
    return { ok: false, provider: "didww", message };
  }
}

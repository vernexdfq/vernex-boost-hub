/**
 * SignalWire — USA number rentals only.
 */

import { cached, fetchWithTimeout } from "@/lib/cache.server";

export type ProviderProvisionResult =
  | {
      ok: true;
      provider: "signalwire";
      phoneNumber: string;
      providerSid: string;
      raw?: unknown;
    }
  | {
      ok: false;
      provider: "signalwire";
      message: string;
      status?: number;
    };

export type SignalWireAvailableNumber = {
  phoneNumber: string;
  friendlyName?: string;
  region?: string;
  rateCenter?: string;
  lata?: string;
  isoCountry: "US";
};

function spaceHost(): string | null {
  const raw =
    process.env["SIGNALWIRE_SPACE_URL"]?.trim() ||
    process.env["SIGNALWIRE_SPACE"]?.trim() ||
    "";
  if (!raw) return null;
  return raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function projectId(): string | null {
  return process.env["SIGNALWIRE_PROJECT_ID"]?.trim() || null;
}

function apiToken(): string | null {
  return process.env["SIGNALWIRE_API_TOKEN"]?.trim() || null;
}

export function isSignalWireConfigured(): boolean {
  return Boolean(spaceHost() && projectId() && apiToken());
}

function basicAuthHeader(): string {
  const id = projectId()!;
  const token = apiToken()!;
  return `Basic ${Buffer.from(`${id}:${token}`).toString("base64")}`;
}

function apiBase(): string | null {
  const host = spaceHost();
  const id = projectId();
  if (!host || !id) return null;
  return `https://${host}/api/laml/2010-04-01/Accounts/${id}`;
}

export async function searchSignalWireAvailable(input?: {
  areaCode?: string | null;
  limit?: number;
}): Promise<
  | { ok: true; numbers: SignalWireAvailableNumber[] }
  | { ok: false; message: string; status?: number }
> {
  const cacheKey = `sw:avail:${input?.areaCode || ""}:${input?.limit || 25}`;
  return cached(cacheKey, 3 * 60 * 1000, async () => {
    if (!isSignalWireConfigured()) {
      return {
        ok: false,
        message:
          "SignalWire is not configured. Set SIGNALWIRE_PROJECT_ID, SIGNALWIRE_SPACE_URL, and SIGNALWIRE_API_TOKEN.",
      };
    }
    const base = apiBase()!;
    const limit = Math.min(Math.max(input?.limit ?? 25, 1), 30);
    const params = new URLSearchParams({
      Country: "US",
      Type: "local",
      PageSize: String(limit),
    });
    if (input?.areaCode) params.set("AreaCode", String(input.areaCode));

    try {
      const res = await fetchWithTimeout(
        `${base}/AvailablePhoneNumbers/US/Local.json?${params}`,
        {
          method: "GET",
          headers: {
            Authorization: basicAuthHeader(),
            Accept: "application/json",
          },
        },
        4000,
      );
      const body = (await res.json().catch(() => ({}))) as {
        available_phone_numbers?: Array<{
          phone_number?: string;
          friendly_name?: string;
          region?: string;
          rate_center?: string;
          lata?: string;
        }>;
        message?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          message: body.message || `SignalWire search failed (HTTP ${res.status})`,
        };
      }
      const numbers: SignalWireAvailableNumber[] = (body.available_phone_numbers ?? [])
        .map((n) => ({
          phoneNumber: String(n.phone_number || ""),
          friendlyName: n.friendly_name,
          region: n.region,
          rateCenter: n.rate_center,
          lata: n.lata,
          isoCountry: "US" as const,
        }))
        .filter((n) => n.phoneNumber);
      return { ok: true, numbers };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "SignalWire network error",
      };
    }
  });
}

export async function provisionSignalWireNumber(input: {
  phoneNumber?: string | null;
  areaCode?: string | null;
}): Promise<ProviderProvisionResult> {
  if (!isSignalWireConfigured()) {
    return {
      ok: false,
      provider: "signalwire",
      message:
        "SignalWire is not configured. Set SIGNALWIRE_PROJECT_ID, SIGNALWIRE_SPACE_URL, and SIGNALWIRE_API_TOKEN.",
    };
  }

  const base = apiBase()!;

  try {
    let phone = (input.phoneNumber || "").trim();

    if (!phone) {
      const search = await searchSignalWireAvailable({
        areaCode: input.areaCode,
        limit: 1,
      });
      if (!search.ok) {
        return { ok: false, provider: "signalwire", message: search.message, status: search.status };
      }
      phone = search.numbers[0]?.phoneNumber || "";
      if (!phone) {
        return {
          ok: false,
          provider: "signalwire",
          message: "No available US numbers found on SignalWire for this request.",
        };
      }
    }

    const form = new URLSearchParams();
    form.set("PhoneNumber", phone);

    const buyRes = await fetchWithTimeout(
      `${base}/IncomingPhoneNumbers.json`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(),
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
      10000,
    );
    const buyBody = (await buyRes.json().catch(() => ({}))) as {
      sid?: string;
      phone_number?: string;
      message?: string;
      error_message?: string;
    };

    if (!buyRes.ok || !buyBody.sid) {
      return {
        ok: false,
        provider: "signalwire",
        status: buyRes.status,
        message:
          buyBody.message ||
          buyBody.error_message ||
          `SignalWire purchase failed (HTTP ${buyRes.status})`,
      };
    }

    return {
      ok: true,
      provider: "signalwire",
      phoneNumber: buyBody.phone_number || phone,
      providerSid: buyBody.sid,
      raw: buyBody,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SignalWire network error";
    return { ok: false, provider: "signalwire", message };
  }
}

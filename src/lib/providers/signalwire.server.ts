/**
 * SignalWire — USA number rentals only.
 * Env (Cloudflare / server):
 *   SIGNALWIRE_PROJECT_ID
 *   SIGNALWIRE_SPACE_URL   e.g. example.signalwire.com (no protocol)
 *   SIGNALWIRE_API_TOKEN
 */

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
  const encoded = Buffer.from(`${id}:${token}`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Purchase / attach a US local number on SignalWire.
 * Prefers an explicit E.164 when the inventory row already has a number;
 * otherwise searches available US numbers and buys the first match.
 */
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

  const host = spaceHost()!;
  const pid = projectId()!;
  const base = `https://${host}/api/laml/2010-04-01/Accounts/${encodeURIComponent(pid)}`;

  try {
    let phone = (input.phoneNumber || "").trim();

    // If no fixed inventory number, search available US locals
    if (!phone) {
      const params = new URLSearchParams({
        Country: "US",
        Type: "local",
        PageSize: "1",
      });
      if (input.areaCode) params.set("AreaCode", String(input.areaCode));

      const searchRes = await fetch(`${base}/AvailablePhoneNumbers/US/Local.json?${params}`, {
        method: "GET",
        headers: {
          Authorization: basicAuthHeader(),
          Accept: "application/json",
        },
      });
      const searchBody = (await searchRes.json().catch(() => ({}))) as {
        available_phone_numbers?: Array<{ phone_number?: string }>;
        message?: string;
      };
      if (!searchRes.ok) {
        return {
          ok: false,
          provider: "signalwire",
          status: searchRes.status,
          message:
            searchBody.message ||
            `SignalWire available-number search failed (HTTP ${searchRes.status})`,
        };
      }
      phone = searchBody.available_phone_numbers?.[0]?.phone_number || "";
      if (!phone) {
        return {
          ok: false,
          provider: "signalwire",
          message: "No available US numbers found on SignalWire for this request.",
        };
      }
    }

    // Purchase / incoming phone number
    const form = new URLSearchParams();
    form.set("PhoneNumber", phone);

    const buyRes = await fetch(`${base}/IncomingPhoneNumbers.json`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
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

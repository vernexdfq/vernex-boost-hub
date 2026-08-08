/**
 * Rental provider router
 * USA (US/USA) → SignalWire
 * All other countries → DIDWW
 */

import {
  isSignalWireConfigured,
  provisionSignalWireNumber,
  type ProviderProvisionResult,
} from "./signalwire.server";
import {
  isDidwwConfigured,
  provisionDidwwNumber,
  type DidwwProvisionResult,
} from "./didww.server";

export type RentalProvider = "signalwire" | "didww";

export type RentalProvisionResult =
  | {
      ok: true;
      provider: RentalProvider;
      phoneNumber: string;
      providerRef: string;
    }
  | {
      ok: false;
      provider: RentalProvider;
      message: string;
      status?: number;
    };

export function resolveRentalProvider(countryCode: string): RentalProvider {
  const code = (countryCode || "").toUpperCase().trim();
  if (code === "US" || code === "USA") return "signalwire";
  return "didww";
}

export function rentalProviderStatus() {
  return {
    signalwire: isSignalWireConfigured(),
    didww: isDidwwConfigured(),
  };
}

export async function provisionRentalNumber(input: {
  countryCode: string;
  phoneNumber?: string | null;
  areaCode?: string | null;
  availableDidId?: string | null;
}): Promise<RentalProvisionResult> {
  const provider = resolveRentalProvider(input.countryCode);

  if (provider === "signalwire") {
    const result: ProviderProvisionResult = await provisionSignalWireNumber({
      phoneNumber: input.phoneNumber,
      areaCode: input.areaCode,
    });
    if (!result.ok) {
      return {
        ok: false,
        provider: "signalwire",
        message: result.message,
        status: result.status,
      };
    }
    return {
      ok: true,
      provider: "signalwire",
      phoneNumber: result.phoneNumber,
      providerRef: result.providerSid,
    };
  }

  const result: DidwwProvisionResult = await provisionDidwwNumber({
    countryCode: input.countryCode,
    phoneNumber: input.phoneNumber,
    availableDidId: input.availableDidId,
  });
  if (!result.ok) {
    return {
      ok: false,
      provider: "didww",
      message: result.message,
      status: result.status,
    };
  }
  return {
    ok: true,
    provider: "didww",
    phoneNumber: result.phoneNumber,
    providerRef: result.providerOrderId,
  };
}

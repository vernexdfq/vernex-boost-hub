import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  searchSignalWireAvailable,
  isSignalWireConfigured,
} from "@/lib/providers/signalwire.server";
import {
  listDidwwCountries,
  searchDidwwAvailable,
  isDidwwConfigured,
} from "@/lib/providers/didww.server";
import { defaultRentalUsd, rentalPriceNgnFromUsd } from "@/lib/rental-pricing";

export type RentalNumber = {
  id: string;
  phone_number: string;
  country_code: string;
  country_name: string;
  dial_code: string;
  carrier: string;
  region_name: string | null;
  area_code: string | null;
  number_type: "mobile" | "business";
  provider: string;
  monthly_price_ngn: number;
  expires_at: string;
  is_available: boolean;
};

export type RentalCountry = {
  country_code: string;
  country_name: string;
  dial_code: string;
  carriers: string[];
  regions: string[];
  available: number;
  from_price_ngn: number;
};

const RENTAL_SELECT =
  "id, phone_number, country_code, country_name, dial_code, carrier, region_name, area_code, number_type, provider, monthly_price_ngn, expires_at, is_available";

function resolveProvider(countryCode: string, existing?: string): string {
  const code = (countryCode || "").toUpperCase();
  if (code === "US" || code === "USA") return "signalwire";
  if (existing && String(existing).trim()) return String(existing).toLowerCase();
  return "didww";
}

function normalize(row: Record<string, unknown>): RentalNumber {
  const country = String(row["country_code"] ?? "");
  return {
    ...(row as unknown as RentalNumber),
    monthly_price_ngn: Number(row["monthly_price_ngn"]),
    provider: resolveProvider(country, row["provider"] as string | undefined),
  };
}

export const listRentalCountries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RentalCountry[]> => {
    try {
    const map = new Map<string, RentalCountry>();

    const { data } = await context.supabase
      .from("rental_numbers")
      .select(RENTAL_SELECT)
      .eq("is_available", true);

    for (const raw of data ?? []) {
      const row = normalize(raw as Record<string, unknown>);
      const entry = map.get(row.country_code) ?? {
        country_code: row.country_code,
        country_name: row.country_name,
        dial_code: row.dial_code,
        carriers: [] as string[],
        regions: [] as string[],
        available: 0,
        from_price_ngn: row.monthly_price_ngn,
      };
      entry.available += 1;
      entry.from_price_ngn = Math.min(entry.from_price_ngn, row.monthly_price_ngn);
      if (row.carrier && !entry.carriers.includes(row.carrier)) entry.carriers.push(row.carrier);
      if (row.region_name && !entry.regions.includes(row.region_name)) {
        entry.regions.push(row.region_name);
      }
      map.set(row.country_code, entry);
    }

    // USA card only — live number search happens when user opens the country
    if (isSignalWireConfigured()) {
      const price = rentalPriceNgnFromUsd(defaultRentalUsd("US"));
      const entry = map.get("US") ?? {
        country_code: "US",
        country_name: "United States",
        dial_code: "+1",
        carriers: ["SignalWire"] as string[],
        regions: [] as string[],
        available: 25,
        from_price_ngn: price,
      };
      entry.available = Math.max(entry.available, 1);
      entry.from_price_ngn = Math.min(entry.from_price_ngn || price, price);
      if (!entry.carriers.includes("SignalWire")) entry.carriers.push("SignalWire");
      map.set("US", entry);
    }

    if (isDidwwConfigured()) {
      const live = await listDidwwCountries();
      if (live.ok) {
        for (const c of live.countries.slice(0, 40)) {
          if (c.iso === "US") continue;
          const price = rentalPriceNgnFromUsd(defaultRentalUsd(c.iso));
          const existing = map.get(c.iso);
          if (existing) {
            if (!existing.carriers.includes("DIDWW")) existing.carriers.push("DIDWW");
            existing.from_price_ngn = Math.min(existing.from_price_ngn, price);
            continue;
          }
          map.set(c.iso, {
            country_code: c.iso,
            country_name: c.name,
            dial_code: c.prefix ? `+${c.prefix}` : "",
            carriers: ["DIDWW"],
            regions: [],
            available: 1,
            from_price_ngn: price,
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.country_code === "US") return -1;
      if (b.country_code === "US") return 1;
      return a.country_name.localeCompare(b.country_name);
    });
    } catch (err) {
      console.error("[rental] listRentalCountries", err);
      return [];
    }
  });

const listNumbersSchema = z.object({
  countryCode: z.string().min(1).max(8),
  carrier: z.string().optional(),
  numberType: z.enum(["mobile", "business"]).optional(),
  search: z.string().max(40).optional(),
});

export const listRentalNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => listNumbersSchema.parse(data))
  .handler(async ({ data, context }): Promise<RentalNumber[]> => {
    const code = data.countryCode.toUpperCase();
    const out: RentalNumber[] = [];
    const term = data.search?.trim()?.toLowerCase() || "";

    let query = context.supabase
      .from("rental_numbers")
      .select(RENTAL_SELECT)
      .eq("is_available", true)
      .eq("country_code", code);

    if (data.carrier) query = query.eq("carrier", data.carrier);
    if (data.numberType) query = query.eq("number_type", data.numberType);

    const { data: rows } = await query
      .order("region_name", { ascending: true })
      .order("monthly_price_ngn", { ascending: true })
      .limit(100);

    for (const r of rows ?? []) {
      const row = normalize(r as Record<string, unknown>);
      if (term) {
        const hay = `${row.phone_number} ${row.area_code ?? ""} ${row.region_name ?? ""}`.toLowerCase();
        if (!hay.includes(term)) continue;
      }
      out.push(row);
    }

    if (code === "US" || code === "USA") {
      if (isSignalWireConfigured()) {
        const area = term && /^\d{3}$/.test(term) ? term : null;
        const live = await searchSignalWireAvailable({ areaCode: area, limit: 30 });
        if (live.ok) {
          const price = rentalPriceNgnFromUsd(defaultRentalUsd("US"));
          for (const n of live.numbers) {
            if (
              term &&
              !area &&
              !n.phoneNumber.toLowerCase().includes(term) &&
              !(n.region || "").toLowerCase().includes(term)
            ) {
              continue;
            }
            const digits = n.phoneNumber.replace(/\D/g, "");
            const id = `live-sw-${digits}`;
            if (out.some((x) => x.phone_number === n.phoneNumber)) continue;
            out.push({
              id,
              phone_number: n.phoneNumber,
              country_code: "US",
              country_name: "United States",
              dial_code: "+1",
              carrier: "SignalWire",
              region_name: n.region || n.rateCenter || null,
              area_code: digits.slice(1, 4) || null,
              number_type: "mobile",
              provider: "signalwire",
              monthly_price_ngn: price,
              expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
              is_available: true,
            });
          }
        }
      }
    } else if (isDidwwConfigured()) {
      const live = await searchDidwwAvailable({ countryIso: code, limit: 30 });
      if (live.ok) {
        const price = rentalPriceNgnFromUsd(defaultRentalUsd(code));
        for (const n of live.numbers) {
          if (term && !n.number.toLowerCase().includes(term)) continue;
          const id = `live-didww-${n.countryIso}-${n.id}`;
          if (out.some((x) => x.phone_number === n.number)) continue;
          out.push({
            id,
            phone_number: n.number,
            country_code: n.countryIso,
            country_name: n.countryName,
            dial_code: "",
            carrier: "DIDWW",
            region_name: null,
            area_code: null,
            number_type: "mobile",
            provider: "didww",
            monthly_price_ngn: price,
            expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
            is_available: true,
          });
        }
      }
    }

    return out.slice(0, 100);
  });

export const listMyRentals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rentals")
      .select(
        "id, plan, amount_paid, status, auto_renew, renews_at, expires_at, created_at, rental_numbers(phone_number, country_name, dial_code, carrier, region_name, area_code, number_type, provider)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to load rentals: ${error.message}`);
    return data ?? [];
  });

const createRentalSchema = z.object({
  rentalNumberId: z.string().min(1),
  plan: z.enum(["1 Week", "1 Month", "1 Year"]),
});

const PLAN_MULTIPLIER: Record<string, number> = {
  "1 Week": 0.35,
  "1 Month": 1,
  "1 Year": 10,
};

const PLAN_DAYS: Record<string, number> = {
  "1 Week": 7,
  "1 Month": 30,
  "1 Year": 365,
};

export const createRental = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createRentalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      provisionRentalNumber,
      resolveRentalProvider,
    } = await import("@/lib/providers/rental-router.server");

    type NumRow = {
      id: string;
      phone_number: string;
      country_code: string;
      country_name: string;
      area_code: string | null;
      monthly_price_ngn: number;
      is_available: boolean;
      provider?: string;
      availableDidId?: string | null;
      isLive?: boolean;
    };

    let number: NumRow | null = null;

    if (data.rentalNumberId.startsWith("live-sw-")) {
      const digits = data.rentalNumberId.replace("live-sw-", "");
      const e164 = digits.startsWith("+") ? digits : `+${digits}`;
      number = {
        id: data.rentalNumberId,
        phone_number: e164,
        country_code: "US",
        country_name: "United States",
        area_code: digits.replace(/\D/g, "").slice(1, 4) || null,
        monthly_price_ngn: rentalPriceNgnFromUsd(defaultRentalUsd("US")),
        is_available: true,
        provider: "signalwire",
        isLive: true,
      };
    } else if (data.rentalNumberId.startsWith("live-didww-")) {
      // live-didww-{ISO}-{availableDidId}
      const rest = data.rentalNumberId.slice("live-didww-".length);
      const dash = rest.indexOf("-");
      const iso = dash > 0 ? rest.slice(0, dash) : rest;
      const availableDidId = dash > 0 ? rest.slice(dash + 1) : "";
      number = {
        id: data.rentalNumberId,
        phone_number: "",
        country_code: iso.toUpperCase(),
        country_name: iso.toUpperCase(),
        area_code: null,
        monthly_price_ngn: rentalPriceNgnFromUsd(defaultRentalUsd(iso)),
        is_available: true,
        provider: "didww",
        availableDidId,
        isLive: true,
      };
    } else {
      const { data: row, error: numberError } = await supabaseAdmin
        .from("rental_numbers")
        .select(
          "id, phone_number, country_code, country_name, area_code, monthly_price_ngn, is_available, provider",
        )
        .eq("id", data.rentalNumberId)
        .maybeSingle();

      if (numberError || !row) {
        return { ok: false as const, error: "Number not found" };
      }
      if (!row.is_available) {
        return { ok: false as const, error: "This number has just been taken" };
      }
      number = { ...row, isLive: false };
    }

    if (!number) {
      return { ok: false as const, error: "Number not found" };
    }

    const countryCode = String(number.country_code || "").toUpperCase();
    const provider = resolveRentalProvider(countryCode);

    const multiplier = PLAN_MULTIPLIER[data.plan] ?? 1;
    const days = PLAN_DAYS[data.plan] ?? 30;
    const amount = Math.ceil(Number(number.monthly_price_ngn) * multiplier);

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError || !wallet) {
      return { ok: false as const, error: "Wallet not found" };
    }
    if (Number(wallet.balance) < amount) {
      return { ok: false as const, error: "Insufficient wallet balance" };
    }

    const provisioned = await provisionRentalNumber({
      countryCode,
      phoneNumber: number.phone_number || null,
      areaCode: number.area_code ?? null,
      availableDidId: number.availableDidId ?? null,
    });

    if (!provisioned.ok) {
      console.error("[rental] provider failed", provider, provisioned.message);
      return {
        ok: false as const,
        error: provisioned.message,
        provider,
        status: provisioned.status ?? null,
      };
    }

    const reference = `VXR-RNT-${Date.now().toString(36).toUpperCase()}`;
    const phoneNumber = provisioned.phoneNumber || number.phone_number;

    try {
      await supabaseAdmin.rpc("record_wallet_transaction", {
        _user_id: userId,
        _type: "debit",
        _amount: amount,
        _fee: 0,
        _description: `Number rental — ${phoneNumber} (${data.plan}) via ${provider}`,
        _reference: reference,
        _payment_method: "wallet",
        _metadata: {
          rental_number_id: number.id,
          plan: data.plan,
          provider,
          provider_ref: provisioned.providerRef,
          country_code: countryCode,
          live: Boolean(number.isLive),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet debit failed";
      return { ok: false as const, error: message, provider };
    }

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    // Ensure a rental_numbers row exists for FK (live purchases upsert)
    let rentalNumberId = number.id;
    if (number.isLive) {
      const { data: upserted, error: upErr } = await supabaseAdmin
        .from("rental_numbers")
        .insert({
          phone_number: phoneNumber,
          country_code: countryCode,
          country_name: number.country_name || countryCode,
          dial_code: countryCode === "US" ? "+1" : "",
          carrier: provider === "signalwire" ? "SignalWire" : "DIDWW",
          region_name: null,
          area_code: number.area_code,
          number_type: "mobile",
          provider,
          monthly_price_ngn: number.monthly_price_ngn,
          is_available: false,
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (upErr || !upserted) {
        // Continue without FK if insert shape differs — store on rental metadata path
        console.error("[rental] live upsert failed", upErr?.message);
      } else {
        rentalNumberId = upserted.id;
      }
    } else {
      await supabaseAdmin
        .from("rental_numbers")
        .update({
          is_available: false,
          provider,
          phone_number: phoneNumber,
        })
        .eq("id", number.id);
    }

    const { data: rental, error: rentalError } = await supabaseAdmin
      .from("rentals")
      .insert({
        user_id: userId,
        rental_number_id: rentalNumberId,
        plan: data.plan,
        amount_paid: amount,
        renews_at: expiresAt,
        expires_at: expiresAt,
        status: "active",
      })
      .select("id, plan, amount_paid, status, renews_at, expires_at, created_at")
      .single();

    if (rentalError) {
      return {
        ok: false as const,
        error: `Rental failed: ${rentalError.message}`,
        provider,
      };
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Number rented",
      body: `${phoneNumber} (${number.country_name || countryCode}) is active on your account for ${data.plan}.`,
      type: "rental",
    });

    return {
      ok: true as const,
      provider,
      phoneNumber,
      providerRef: provisioned.providerRef,
      rental,
    };
  });

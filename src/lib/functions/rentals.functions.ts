import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  // USA numbers → SignalWire; all other countries → DIDWW
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
    const { data, error } = await context.supabase
      .from("rental_numbers")
      .select(RENTAL_SELECT)
      .eq("is_available", true);

    if (error) throw new Error(`Failed to load countries: ${error.message}`);

    const map = new Map<string, RentalCountry>();
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
      if (!entry.carriers.includes(row.carrier)) entry.carriers.push(row.carrier);
      if (row.region_name && !entry.regions.includes(row.region_name)) entry.regions.push(row.region_name);
      map.set(row.country_code, entry);
    }

    return [...map.values()]
      .map((c) => ({ ...c, carriers: c.carriers.sort(), regions: c.regions.sort() }))
      .sort((a, b) => a.country_name.localeCompare(b.country_name));
  });

const listNumbersSchema = z.object({
  countryCode: z.string().min(2).max(2),
  carrier: z.string().optional(),
  numberType: z.enum(["mobile", "business"]).optional(),
  search: z.string().max(60).optional(),
});

export const listRentalNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => listNumbersSchema.parse(data))
  .handler(async ({ data, context }): Promise<RentalNumber[]> => {
    let query = context.supabase
      .from("rental_numbers")
      .select(RENTAL_SELECT)
      .eq("is_available", true)
      .eq("country_code", data.countryCode);

    if (data.carrier) query = query.eq("carrier", data.carrier);
    if (data.numberType) query = query.eq("number_type", data.numberType);

    const term = data.search?.trim();
    if (term) {
      query = query.or(
        `area_code.ilike.%${term}%,region_name.ilike.%${term}%,phone_number.ilike.%${term}%`,
      );
    }

    const { data: rows, error } = await query
      .order("region_name", { ascending: true })
      .order("monthly_price_ngn", { ascending: true })
      .limit(100);

    if (error) throw new Error(`Failed to load numbers: ${error.message}`);
    return (rows ?? []).map((r) => normalize(r as Record<string, unknown>));
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
  rentalNumberId: z.string().uuid(),
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

    const { data: number, error: numberError } = await supabaseAdmin
      .from("rental_numbers")
      .select("id, phone_number, country_name, monthly_price_ngn, is_available")
      .eq("id", data.rentalNumberId)
      .maybeSingle();

    if (numberError || !number) throw new Error("Number not found");
    if (!number.is_available) throw new Error("This number has just been taken");

    const multiplier = PLAN_MULTIPLIER[data.plan] ?? 1;
    const days = PLAN_DAYS[data.plan] ?? 30;
    const amount = Math.ceil(Number(number.monthly_price_ngn) * multiplier);

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError || !wallet) throw new Error("Wallet not found");
    if (Number(wallet.balance) < amount) throw new Error("Insufficient wallet balance");

    const reference = `VNX-RNT-${Date.now().toString(36).toUpperCase()}`;

    await supabaseAdmin.rpc("record_wallet_transaction", {
      _user_id: userId,
      _type: "debit",
      _amount: amount,
      _fee: 0,
      _description: `Number rental — ${number.phone_number} (${data.plan})`,
      _reference: reference,
      _payment_method: "wallet",
      _metadata: { rental_number_id: number.id, plan: data.plan },
    });

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { data: rental, error: rentalError } = await supabaseAdmin
      .from("rentals")
      .insert({
        user_id: userId,
        rental_number_id: number.id,
        plan: data.plan,
        amount_paid: amount,
        renews_at: expiresAt,
        expires_at: expiresAt,
        status: "active",
      })
      .select("id, plan, amount_paid, status, renews_at, expires_at, created_at")
      .single();

    if (rentalError) throw new Error(`Rental failed: ${rentalError.message}`);

    await supabaseAdmin
      .from("rental_numbers")
      .update({ is_available: false })
      .eq("id", number.id);

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Number rented",
      body: `${number.phone_number} (${number.country_name}) is active on your account for ${data.plan}.`,
      type: "rental",
    });

    return rental;
  });

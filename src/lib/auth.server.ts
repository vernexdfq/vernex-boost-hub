/**
 * Server-only authentication helpers for Vernex.
 *
 * Responsibilities:
 *  - normalising Nigerian / international phone numbers into E.164
 *  - hashing and verifying the 4-digit transaction PIN (salted SHA-256)
 *  - creating accounts (auth user + profile enrichment) with the admin client
 *  - minting a one-time email OTP so a phone + PIN login can be exchanged
 *    for a real Supabase session on the client
 */

export type RegisterInput = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  pin: string;
  referralCode?: string | undefined;
};

export type PhonePinInput = {
  phone: string;
  pin: string;
};

export type IdentifierPinInput = {
  identifier: string;
  pin: string;
};

export type PhoneLoginTicket = {
  email: string;
  token: string;
};

/** Normalises user input into an E.164 string (defaults to Nigeria, +234). */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) throw new Error("Enter a valid phone number");

  if (hasPlus) return `+${digits}`;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;
  return `+${digits}`;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest);
}

/** Returns a `salt$hash` string; never store the raw PIN. */
export async function hashPin(pin: string): Promise<string> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = await sha256Hex(`${salt}:${pin}`);
  return `${salt}$${hash}`;
}

export async function verifyPin(pin: string, stored: string | null): Promise<boolean> {
  if (!stored || !stored.includes("$")) return false;
  const [salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const candidate = await sha256Hex(`${salt}:${pin}`);
  // constant-time-ish comparison
  if (candidate.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i += 1) {
    diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

/** Creates the auth user and enriches the auto-created profile row. */
export async function registerAccount(input: RegisterInput): Promise<{ email: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const phone = normalizePhone(input.phone);
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.replace(/\s+/g, " ");

  const { data: existingPhone, error: lookupError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (lookupError) throw new Error("We could not verify that phone number. Try again.");
  if (existingPhone) throw new Error("That phone number is already registered. Sign in instead.");

  const { data: existingUsername, error: usernameError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (usernameError) throw new Error("We could not verify that username. Try again.");
  if (existingUsername) throw new Error("That username is taken. Try another one.");

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    phone_confirm: false,
    user_metadata: {
      full_name: fullName,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      username,
      phone,
      referral_code: input.referralCode?.trim() || null,
    },
  });

  if (createError || !created?.user) {
    const message = createError?.message ?? "We could not create your account.";
    if (/already registered|already been registered|exists/i.test(message)) {
      throw new Error("An account with that email already exists. Sign in instead.");
    }
    throw new Error(message);
  }

  const pinHash = await hashPin(input.pin);

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: fullName,
      username,
      phone,
      email,
      pin_hash: pinHash,
      pin_set: true,
    })
    .eq("id", created.user.id);

  if (profileError) {
    // Roll back so the user can retry with the same email/phone.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    throw new Error("We could not finish setting up your account. Please try again.");
  }

  // Provision a permanent Flutterwave virtual account for wallet funding.
  // Best-effort: signup must never fail because the provider is unreachable.
  try {
    const { provisionVirtualAccount } = await import("@/lib/flutterwave.server");
    await provisionVirtualAccount({
      userId: created.user.id,
      email,
      fullName,
      phone,
    });
  } catch (error) {
    console.error("[Vernex] virtual account provisioning failed at signup", error);
  }

  return { email };
}

/**
 * Validates a phone + PIN pair and returns a single-use email OTP the browser
 * exchanges for a session via `supabase.auth.verifyOtp`.
 */
export async function issuePhonePinTicket(input: PhonePinInput): Promise<PhoneLoginTicket> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const phone = normalizePhone(input.phone);

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, pin_hash, pin_set")
    .eq("phone", phone)
    .maybeSingle();

  if (error) throw new Error("We could not sign you in. Please try again.");
  if (!profile || !profile.email) throw new Error("Incorrect phone number or PIN");

  const ok = await verifyPin(input.pin, profile.pin_hash);
  if (!ok) throw new Error("Incorrect phone number or PIN");

  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
  });

  const token = link?.properties?.email_otp;
  if (linkError || !token) throw new Error("We could not start your session. Please try again.");

  return { email: profile.email, token };
}

/** Confirms a phone number exists so the PIN screen is only shown for real users. */
export async function phoneExists(rawPhone: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const phone = normalizePhone(rawPhone);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (error) throw new Error("We could not verify that phone number. Try again.");
  return Boolean(data);
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}

/** Confirms a phone number OR email address belongs to a Vernex account. */
export async function identifierExists(rawIdentifier: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const raw = rawIdentifier.trim();

  const query = supabaseAdmin.from("profiles").select("id");
  const { data, error } = looksLikeEmail(raw)
    ? await query.ilike("email", raw.toLowerCase()).maybeSingle()
    : await query.eq("phone", normalizePhone(raw)).maybeSingle();

  if (error) throw new Error("We could not verify those details. Try again.");
  return Boolean(data);
}

/**
 * Validates a phone/email + PIN pair and returns a single-use email OTP the
 * browser exchanges for a session via `supabase.auth.verifyOtp`.
 */
export async function issueIdentifierPinTicket(
  input: IdentifierPinInput,
): Promise<PhoneLoginTicket> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const raw = input.identifier.trim();
  const generic = "Incorrect details or PIN";

  const query = supabaseAdmin.from("profiles").select("id, email, pin_hash, pin_set");
  const { data: profile, error } = looksLikeEmail(raw)
    ? await query.ilike("email", raw.toLowerCase()).maybeSingle()
    : await query.eq("phone", normalizePhone(raw)).maybeSingle();

  if (error) throw new Error("We could not sign you in. Please try again.");
  if (!profile || !profile.email) throw new Error(generic);

  const ok = await verifyPin(input.pin, profile.pin_hash);
  if (!ok) throw new Error(generic);

  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
  });

  const token = link?.properties?.email_otp;
  if (linkError || !token) throw new Error("We could not start your session. Please try again.");

  return { email: profile.email, token };
}


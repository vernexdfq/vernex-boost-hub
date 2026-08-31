/**
 * Server-only authentication helpers for Verxor.
 *
 * Responsibilities:
 *  - normalising Nigerian / international phone numbers into E.164
 *  - hashing and verifying the 4-digit transaction PIN (salted SHA-256)
 *  - creating accounts (auth user + profile enrichment) with the admin client
 *  - minting a one-time email OTP so a phone + PIN login can be exchanged
 *    for a real Supabase session on the client
 *  - PIN reset tokens + branded emails
 *  - Forgot PIN via account password (no email required)
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
  if (candidate.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i += 1) {
    diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}

function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  let url = raw.trim();
  url = url.replace(/\/(rest|auth|storage|functions)\/v1\/?$/i, "");
  url = url.replace(/\/+$/, "");
  return url;
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
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    throw new Error("We could not finish setting up your account. Please try again.");
  }

  try {
    const { provisionVirtualAccount } = await import("@/lib/flutterwave.server");
    await provisionVirtualAccount({
      userId: created.user.id,
      email,
      fullName,
      phone,
    });
  } catch (error) {
    console.error("[Verxor] virtual account provisioning failed at signup", error);
  }

  try {
    const { sendWelcomeEmail } = await import("@/lib/email.server");
    await sendWelcomeEmail(email, input.firstName.trim());
  } catch (error) {
    console.error("[Verxor] welcome email failed", error);
  }

  return { email };
}

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

/**
 * Start PIN reset for phone or email.
 * Always returns a generic success message (no account enumeration).
 * Email is sent to the profile email on file.
 */
export async function requestPinReset(identifier: string): Promise<{ ok: true; message: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const raw = identifier.trim();
  const generic =
    "If an account exists for those details, we sent a PIN reset link to the email on file.";

  const query = supabaseAdmin.from("profiles").select("id, email");
  const { data: profile } = looksLikeEmail(raw)
    ? await query.ilike("email", raw.toLowerCase()).maybeSingle()
    : await query.eq("phone", normalizePhone(raw)).maybeSingle();

  if (!profile?.email || !profile.id) {
    return { ok: true, message: generic };
  }

  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toHex(tokenBytes.buffer);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    user_metadata: {
      pin_reset_token_hash: tokenHash,
      pin_reset_expires: expires,
    },
  });

  try {
    const { sendPinResetEmail } = await import("@/lib/email.server");
    await sendPinResetEmail(profile.email, token);
  } catch (e) {
    console.error("[Verxor] pin reset email failed", e);
  }

  return { ok: true, message: generic };
}

/** Complete PIN reset with token from email link. */
export async function completePinReset(token: string, pin: string): Promise<{ ok: true }> {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits");
  if (!token || token.length < 16) throw new Error("Invalid or expired reset link");

  throw new Error("Use completePinResetWithUser");
}

/**
 * Issue token as `${userId}.${random}` so completion does not require a DB scan.
 */
export async function requestPinResetV2(
  identifier: string,
): Promise<{ ok: true; message: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const raw = identifier.trim();
  const generic =
    "If an account exists for those details, we sent a PIN reset link to the email on file.";

  const query = supabaseAdmin.from("profiles").select("id, email");
  const { data: profile } = looksLikeEmail(raw)
    ? await query.ilike("email", raw.toLowerCase()).maybeSingle()
    : await query.eq("phone", normalizePhone(raw)).maybeSingle();

  if (!profile?.email || !profile.id) {
    return { ok: true, message: generic };
  }

  const random = toHex(crypto.getRandomValues(new Uint8Array(24)).buffer);
  const token = `${profile.id}.${random}`;
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    user_metadata: {
      pin_reset_token_hash: tokenHash,
      pin_reset_expires: expires,
    },
  });

  try {
    const { sendPinResetEmail } = await import("@/lib/email.server");
    await sendPinResetEmail(profile.email, token);
  } catch (e) {
    console.error("[Verxor] pin reset email failed", e);
  }

  return { ok: true, message: generic };
}

export async function completePinResetV2(token: string, pin: string): Promise<{ ok: true }> {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits");
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid or expired reset link");
  const userId = parts[0];
  if (!userId || userId.length < 10) throw new Error("Invalid or expired reset link");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !userData?.user) throw new Error("Invalid or expired reset link");

  const meta = userData.user.user_metadata || {};
  const storedHash = meta.pin_reset_token_hash as string | undefined;
  const expires = meta.pin_reset_expires as string | undefined;
  if (!storedHash || !expires) throw new Error("Invalid or expired reset link");
  if (new Date(expires).getTime() < Date.now()) throw new Error("This reset link has expired");

  const tokenHash = await sha256Hex(token);
  if (tokenHash !== storedHash) throw new Error("Invalid or expired reset link");

  const pinHash = await hashPin(pin);
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      pin_hash: pinHash,
      pin_set: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) throw new Error("Could not update PIN. Try again.");

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      pin_reset_token_hash: null,
      pin_reset_expires: null,
    },
  });

  const email = userData.user.email;
  if (email) {
    try {
      const { sendPinChangedEmail } = await import("@/lib/email.server");
      await sendPinChangedEmail(email);
    } catch (e) {
      console.error("[Verxor] pin changed email failed", e);
    }
  }

  return { ok: true };
}

/** Server-side PIN update after password verification (logged-in Change PIN). */
export async function updatePinForUser(userId: string, pin: string): Promise<{ ok: true }> {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const pinHash = await hashPin(pin);
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      pin_hash: pinHash,
      pin_set: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error("Could not save PIN. Try again.");

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (email) {
    try {
      const { sendPinChangedEmail } = await import("@/lib/email.server");
      await sendPinChangedEmail(email);
    } catch {
      /* ignore */
    }
  }
  return { ok: true };
}

/**
 * Forgot PIN (login screen): verify account password, then set a new 4-digit PIN.
 * Works with phone or email identifier. Sends "PIN changed" email to the account email.
 */
export async function resetPinWithPassword(
  identifier: string,
  password: string,
  pin: string,
): Promise<{ ok: true }> {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits");
  if (!password || password.length < 8) throw new Error("Enter your account password");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { createClient } = await import("@supabase/supabase-js");
  const raw = identifier.trim();

  const query = supabaseAdmin.from("profiles").select("id, email");
  const { data: profile, error: profileError } = looksLikeEmail(raw)
    ? await query.ilike("email", raw.toLowerCase()).maybeSingle()
    : await query.eq("phone", normalizePhone(raw)).maybeSingle();

  if (profileError || !profile?.email || !profile.id) {
    throw new Error("Incorrect password or account not found");
  }

  const url = normalizeSupabaseUrl(
    process.env["SUPABASE_URL"] ||
      process.env["VITE_SUPABASE_URL"] ||
      process.env["SUPABASE_PROJECT_URL"] ||
      process.env["VITE_SUPABASE_PROJECT_URL"],
  );
  const anonKey = (
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["VITE_SUPABASE_ANON_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    ""
  ).trim();

  if (!url || !anonKey) {
    throw new Error("Server auth is not configured. Try again later.");
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await authClient.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (signInError) {
    throw new Error("Incorrect password");
  }

  try {
    await authClient.auth.signOut();
  } catch {
    /* ignore */
  }

  await updatePinForUser(profile.id, pin);
  return { ok: true };
}

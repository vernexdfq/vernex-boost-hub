/**
 * Server-only Flutterwave helpers for Vernex.
 * Endpoint: POST https://api.flutterwave.com/v3/virtual-account-numbers
 *
 * Static (permanent) NGN accounts use is_permanent: true and amount: 0.
 * Live mode requires BVN (or NIN). Set FLUTTERWAVE_BVN or store bvn on the profile.
 * Dynamic accounts are only a last-resort fallback.
 */

const FLW_BASE = "https://api.flutterwave.com/v3";

type FlwVirtualAccount = {
  account_number: string;
  bank_name: string;
  order_ref?: string;
  flw_ref?: string;
  note?: string;
  amount?: number | null;
  expiry_date?: string | null;
};

export function flutterwaveSecretKey(): string | null {
  const key =
    process.env["FLUTTERWAVE_SECRET_KEY"]?.trim() ||
    process.env["FLW_SECRET_KEY"]?.trim() ||
    process.env["FLUTTERWAVE_SECRET"]?.trim() ||
    "";
  return key || null;
}

export function isFlutterwaveConfigured(): boolean {
  return Boolean(flutterwaveSecretKey());
}

function requireSecretKey(): string {
  const key = flutterwaveSecretKey();
  if (!key) {
    throw new Error("Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY.");
  }
  return key;
}

export type CreateVirtualAccountInput = {
  userId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  bvn?: string | null;
  /** When no BVN, dynamic VA is created for this amount (NGN). Default 100. */
  amount?: number;
  /** Force a new permanent VA (e.g. after adding FLUTTERWAVE_BVN). */
  force?: boolean;
};

function splitName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: "Vernex", lastname: "Customer" };
  if (parts.length === 1) return { firstname: parts[0], lastname: "Customer" };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

function normalizeNgPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+234")) p = "0" + p.slice(4);
  if (p.startsWith("234") && p.length >= 12) p = "0" + p.slice(3);
  if (/^0[789]\d{9}$/.test(p)) return p;
  return p || undefined;
}


/** Prefer Cloudflare FLUTTERWAVE_BVN, then per-user BVN. Returns 11-digit BVN or undefined. */
export function resolveFlutterwaveBvn(inputBvn?: string | null, profileBvn?: string | null): string | undefined {
  const candidates = [
    process.env["FLUTTERWAVE_BVN"],
    process.env["FLW_BVN"],
    process.env["VITE_FLUTTERWAVE_BVN"],
    inputBvn,
    profileBvn,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const digits = String(raw).replace(/\D/g, "");
    if (digits.length === 11) return digits;
  }
  return undefined;
}

export function isFlutterwaveBvnConfigured(): boolean {
  return Boolean(resolveFlutterwaveBvn());
}

async function callFlutterwaveCreate(
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: FlwVirtualAccount } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${FLW_BASE}/virtual-account-numbers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireSecretKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as {
      status?: string;
      message?: string;
      data?: FlwVirtualAccount;
    };
    if (!res.ok || body.status !== "success" || !body.data?.account_number) {
      const msg = body?.message || `HTTP ${res.status}`;
      console.error("[Flutterwave] create VA failed:", msg, JSON.stringify(body));
      return { ok: false, message: msg };
    }
    return { ok: true, data: body.data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    console.error("[Flutterwave] create VA request error", error);
    return { ok: false, message: msg };
  }
}

/**
 * Provision a STATIC (permanent) Flutterwave virtual account for the user.
 * Payload uses is_permanent: true, amount: 0, customer name/email, and BVN/NIN.
 * Dynamic accounts are only used as a last-resort fallback when static is rejected.
 */
export async function provisionVirtualAccount(
  input: CreateVirtualAccountInput,
): Promise<{
  accountNumber: string;
  bankName: string;
  reference: string;
  permanent: boolean;
  message?: string;
} | null> {
  if (!flutterwaveSecretKey()) {
    console.error("[Flutterwave] missing FLUTTERWAVE_SECRET_KEY");
    return null;
  }

  let supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin;
  try {
    ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
  } catch (error) {
    console.error("[Flutterwave] supabase admin unavailable", error);
    return null;
  }

  try {
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("virtual_account_number, virtual_bank_name, virtual_account_reference")
      .eq("user_id", input.userId)
      .maybeSingle();

    // Reuse existing account unless force=true (e.g. upgrade temp → permanent after BVN added)
    if (wallet?.virtual_account_number && !input.force) {
      return {
        accountNumber: wallet.virtual_account_number,
        bankName: wallet.virtual_bank_name ?? "Wema Bank",
        reference: wallet.virtual_account_reference ?? "",
        permanent: true,
      };
    }

    if (!wallet) {
      await supabaseAdmin.from("wallets").upsert(
        {
          user_id: input.userId,
          balance: 0,
          ledger_balance: 0,
          currency: "NGN",
        },
        { onConflict: "user_id" },
      );
    }

    // Load any KYC identifiers stored on the profile (optional columns)
    let profileBvn: string | undefined;
    let profileNin: string | undefined;
    try {
      const { data: profileRow } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", input.userId)
        .maybeSingle();
      const row = (profileRow || {}) as Record<string, unknown>;
      const rawBvn = row["bvn"] ?? row["bvn_number"];
      const rawNin = row["nin"] ?? row["nin_number"];
      if (typeof rawBvn === "string" && rawBvn.trim()) profileBvn = rawBvn.trim();
      if (typeof rawNin === "string" && rawNin.trim()) profileNin = rawNin.trim();
    } catch {
      /* profiles may not expose bvn/nin columns yet */
    }

    const reference =
      wallet?.virtual_account_reference ??
      `VNX-${input.userId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;

    const { firstname, lastname } = splitName(input.fullName || "Vernex Customer");
    const accountLabel = `VERNEX / ${firstname} ${lastname}`.toUpperCase().slice(0, 100);
    const email =
      (input.email || "").trim() ||
      `${input.userId.replace(/-/g, "").slice(0, 12)}@users.vernex.com.ng`;
    const phonenumber = normalizeNgPhone(input.phone);

    // Cloudflare FLUTTERWAVE_BVN is preferred for permanent static accounts
    const bvn = resolveFlutterwaveBvn(input.bvn, profileBvn);
    const nin =
      profileNin ||
      process.env["FLUTTERWAVE_NIN"]?.trim() ||
      process.env["FLW_NIN"]?.trim() ||
      undefined;

    if (!bvn) {
      console.warn(
        "[Flutterwave] FLUTTERWAVE_BVN not set — permanent static VA requires an 11-digit BVN",
      );
    } else {
      console.info("[Flutterwave] using BVN for permanent static VA (ends with", bvn.slice(-4) + ")");
    }

    // Permanent static VA — requires FLUTTERWAVE_BVN (11 digits) on Cloudflare
    const basePayload: Record<string, unknown> = {
      email,
      is_permanent: true,
      amount: 0,
      tx_ref: reference,
      currency: "NGN",
      narration: accountLabel,
      firstname,
      lastname,
    };
    if (phonenumber) basePayload["phonenumber"] = phonenumber;
    if (nin) basePayload["nin"] = nin;
    if (bvn) {
      basePayload["bvn"] = bvn;
    }

    let permanent = false;
    let account: FlwVirtualAccount | null = null;
    let lastError = "";

    if (bvn) {
      // Static permanent only — never fall back to temporary when BVN is present
      const staticResult = await callFlutterwaveCreate(basePayload);
      if (staticResult.ok) {
        account = staticResult.data;
        permanent = true;
      } else {
        lastError = staticResult.message;
        console.error("[Flutterwave] static VA rejected:", lastError);

        // Retry once with a unique tx_ref (Flutterwave may reject duplicate refs)
        const retryRef = `VNX-${input.userId.replace(/-/g, "").slice(0, 10)}-${Date.now().toString(36).toUpperCase()}`;
        const retryPayload: Record<string, unknown> = {
          ...basePayload,
          tx_ref: retryRef,
          bvn,
          is_permanent: true,
          amount: 0,
        };
        const retryResult = await callFlutterwaveCreate(retryPayload);
        if (retryResult.ok) {
          account = retryResult.data;
          permanent = true;
        } else {
          lastError = retryResult.message || lastError;
        }
      }
    } else {
      // No BVN — temporary dynamic account only (last resort)
      console.warn(
        "[Flutterwave] FLUTTERWAVE_BVN missing or not 11 digits — creating temporary VA only",
      );
      const amount = Math.max(100, Math.round(Number(input.amount) || 100));
      const dynamicResult = await callFlutterwaveCreate({
        email,
        tx_ref: `${reference}-TMP`,
        currency: "NGN",
        narration: accountLabel,
        firstname,
        lastname,
        is_permanent: false,
        amount,
        ...(phonenumber ? { phonenumber } : {}),
      });
      if (dynamicResult.ok) {
        account = dynamicResult.data;
        permanent = false;
        lastError =
          "Temporary account only. Set FLUTTERWAVE_BVN (11 digits) in Cloudflare for permanent static accounts.";
      } else {
        lastError = dynamicResult.message || "Could not create virtual account";
      }
    }

    if (!account?.account_number) {
      console.error("[Flutterwave] no account created:", lastError);
      return null;
    }

    const accountNumber = account.account_number;
    const bankName = account.bank_name ?? "Wema Bank";
    const savedRef = permanent ? reference : account.order_ref || reference;

    // Always persist so Fund page shows the latest account
    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({
        virtual_account_number: accountNumber,
        virtual_bank_name: bankName,
        virtual_account_reference: savedRef,
      })
      .eq("user_id", input.userId);

    if (updateError) {
      console.error("[Flutterwave] persist failed", updateError.message);
    }

    return {
      accountNumber,
      bankName,
      reference: savedRef,
      permanent,
      message: permanent
        ? "Permanent static account ready."
        : lastError
          ? `Could not create a permanent account (${lastError}). Temporary account issued — add BVN/NIN or set FLUTTERWAVE_BVN for static accounts.`
          : "Temporary account generated. Set FLUTTERWAVE_BVN (or user BVN) for a permanent static account.",
    };
  } catch (error) {
    console.error("[Flutterwave] provisionVirtualAccount error", error);
    return null;
  }
}

export async function creditWalletFromTransfer(params: {
  reference: string;
  amount: number;
  accountNumber?: string | null;
  customerEmail?: string | null;
  txRef?: string | null;
}): Promise<{ credited: boolean }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("reference", params.reference)
      .maybeSingle();

    if (existing) return { credited: false };

    let userId: string | null = null;

    if (params.accountNumber) {
      const { data } = await supabaseAdmin
        .from("wallets")
        .select("user_id")
        .eq("virtual_account_number", params.accountNumber)
        .maybeSingle();
      userId = data?.user_id ?? null;
    }

    if (!userId && params.txRef) {
      const { data } = await supabaseAdmin
        .from("wallets")
        .select("user_id")
        .eq("virtual_account_reference", params.txRef)
        .maybeSingle();
      userId = data?.user_id ?? null;
    }

    if (!userId && params.customerEmail) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", params.customerEmail.toLowerCase())
        .maybeSingle();
      userId = data?.id ?? null;
    }

    if (!userId) {
      console.error("[Flutterwave] no wallet matched", params.reference);
      return { credited: false };
    }

    const { error } = await supabaseAdmin.rpc("record_wallet_transaction", {
      _user_id: userId,
      _type: "credit",
      _amount: params.amount,
      _fee: 0,
      _description: "Wallet top-up via bank transfer",
      _reference: params.reference,
      _payment_method: "flutterwave",
      _metadata: {
        source: "flutterwave",
        account_number: params.accountNumber,
        tx_ref: params.txRef,
        customer_email: params.customerEmail,
      },
    });

    if (error) {
      console.error("[Flutterwave] credit failed", error.message);
      return { credited: false };
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Wallet funded",
      body: `₦${Number(params.amount).toLocaleString("en-NG")} has been added to your wallet.`,
      type: "wallet",
    });

    return { credited: true };
  } catch (error) {
    console.error("[Flutterwave] creditWalletFromTransfer error", error);
    return { credited: false };
  }
}

/* ------------------------------------------------------------------ */
/* Deposit sync + webhook helpers                                      */
/* ------------------------------------------------------------------ */

type FlwTransaction = {
  id?: number;
  tx_ref?: string;
  flw_ref?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_type?: string;
  created_at?: string;
  customer?: { email?: string; name?: string; phone_number?: string };
  meta?: Record<string, unknown> | null;
  account?: { account_number?: string; bank_name?: string };
};

function extractAccountNumber(tx: FlwTransaction): string | null {
  const meta = (tx.meta || {}) as Record<string, unknown>;
  const candidates = [
    tx.account?.account_number,
    meta["account_number"],
    meta["accountnumber"],
    meta["recipientaccountnumber"],
    meta["virtualaccountnumber"],
    meta["originatoraccountnumber"],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.replace(/\D/g, "").length >= 10) {
      return c.replace(/\D/g, "");
    }
  }
  return null;
}

export async function listRecentFlutterwaveTransactions(
  days = 14,
): Promise<FlwTransaction[]> {
  const key = flutterwaveSecretKey();
  if (!key) return [];

  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = new URL(`${FLW_BASE}/transactions`);
  url.searchParams.set("from", fmt(from));
  url.searchParams.set("to", fmt(to));
  url.searchParams.set("status", "successful");
  url.searchParams.set("currency", "NGN");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });
    const body = (await res.json()) as {
      status?: string;
      data?: FlwTransaction[];
      message?: string;
    };
    if (!res.ok || body.status !== "success" || !Array.isArray(body.data)) {
      console.error("[Flutterwave] list transactions failed", body?.message || res.status);
      return [];
    }
    return body.data;
  } catch (error) {
    console.error("[Flutterwave] list transactions error", error);
    return [];
  }
}

export async function syncUserDeposits(params: {
  userId: string;
  accountNumber?: string | null;
  email?: string | null;
}): Promise<{ credited: number; totalAmount: number; references: string[] }> {
  const txs = await listRecentFlutterwaveTransactions(21);
  const accountDigits = (params.accountNumber || "").replace(/\D/g, "");
  const email = (params.email || "").trim().toLowerCase();

  let credited = 0;
  let totalAmount = 0;
  const references: string[] = [];

  for (const tx of txs) {
    if (String(tx.status || "").toLowerCase() !== "successful") continue;
    if (String(tx.currency || "NGN").toUpperCase() !== "NGN") continue;
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const ref =
      String(tx.flw_ref || "").trim() ||
      String(tx.tx_ref || "").trim() ||
      (tx.id != null ? `FLW-${tx.id}` : "");
    if (!ref) continue;

    const txAccount = extractAccountNumber(tx);
    const txEmail = (tx.customer?.email || "").trim().toLowerCase();

    const matchesAccount =
      Boolean(accountDigits) &&
      Boolean(txAccount) &&
      (txAccount === accountDigits ||
        accountDigits.endsWith(txAccount!) ||
        txAccount!.endsWith(accountDigits));
    const matchesEmail = Boolean(email) && Boolean(txEmail) && txEmail === email;
    if (!matchesAccount && !matchesEmail) continue;

    const result = await creditWalletFromTransfer({
      reference: ref,
      amount,
      accountNumber: params.accountNumber || txAccount,
      customerEmail: email || txEmail || null,
      txRef: tx.tx_ref || null,
    });
    if (result.credited) {
      credited += 1;
      totalAmount += amount;
      references.push(ref);
    }
  }

  return { credited, totalAmount, references };
}

export async function handleFlutterwaveWebhookPayload(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; credited?: boolean; event?: string }> {
  const event = String(payload["event"] || payload["type"] || "").toLowerCase();
  const data = (payload["data"] || {}) as Record<string, unknown>;

  // Primary event for virtual-account bank transfers
  // Also accept bank_transfer / transfer success payloads without a named event
  const isChargeEvent =
    !event ||
    event === "charge.completed" ||
    event.includes("charge") ||
    event.includes("bank_transfer") ||
    event.includes("transfer");

  if (!isChargeEvent) {
    console.info("[Flutterwave webhook] ignored event", event);
    return { ok: true, credited: false, event };
  }

  const status = String(data["status"] || "").toLowerCase();
  if (status && status !== "successful" && status !== "success") {
    console.info("[Flutterwave webhook] non-success status", status);
    return { ok: true, credited: false, event };
  }

  const amount = Number(data["amount"]);
  if (!Number.isFinite(amount) || amount <= 0) {
    console.error("[Flutterwave webhook] invalid amount", data["amount"]);
    return { ok: true, credited: false, event };
  }

  const flwRef = String(data["flw_ref"] || data["flwRef"] || "").trim();
  const txRef = String(data["tx_ref"] || data["txRef"] || "").trim();
  const id = data["id"] != null ? String(data["id"]) : "";
  const reference = flwRef || txRef || (id ? `FLW-${id}` : "");
  if (!reference) {
    console.error("[Flutterwave webhook] missing reference");
    return { ok: true, credited: false, event };
  }

  const customer = (data["customer"] || {}) as Record<string, unknown>;
  const email = typeof customer["email"] === "string" ? customer["email"] : null;
  const meta = (data["meta"] || {}) as Record<string, unknown>;
  const accountObj = data["account"] as { account_number?: string } | undefined;
  const account =
    accountObj?.account_number ||
    (typeof meta["account_number"] === "string" ? meta["account_number"] : null) ||
    (typeof meta["recipientaccountnumber"] === "string"
      ? meta["recipientaccountnumber"]
      : null) ||
    (typeof meta["virtualaccountnumber"] === "string" ? meta["virtualaccountnumber"] : null) ||
    (typeof meta["narration"] === "string" && /\d{10}/.test(meta["narration"])
      ? meta["narration"]
      : null);

  console.info(
    "[Flutterwave webhook] crediting",
    reference,
    amount,
    account || "(no account)",
    email || "(no email)",
  );

  const result = await creditWalletFromTransfer({
    reference,
    amount,
    accountNumber: account,
    customerEmail: email,
    txRef: txRef || null,
  });

  return { ok: true, credited: result.credited, event };
}

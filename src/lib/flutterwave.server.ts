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

    // Reuse existing persisted (static) account
    if (wallet?.virtual_account_number) {
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

    const bvn =
      input.bvn?.trim() ||
      profileBvn ||
      process.env["FLUTTERWAVE_BVN"]?.trim() ||
      process.env["FLW_BVN"]?.trim() ||
      undefined;
    const nin =
      profileNin ||
      process.env["FLUTTERWAVE_NIN"]?.trim() ||
      process.env["FLW_NIN"]?.trim() ||
      undefined;

    const basePayload: Record<string, unknown> = {
      email,
      tx_ref: reference,
      currency: "NGN",
      // Personalized narration shows on the bank transfer receipt
      narration: accountLabel,
      firstname,
      lastname,
      // Static / permanent virtual account
      is_permanent: true,
      amount: 0,
    };
    if (phonenumber) basePayload["phonenumber"] = phonenumber;
    if (bvn) basePayload["bvn"] = bvn;
    if (nin) basePayload["nin"] = nin;

    let permanent = false;
    let account: FlwVirtualAccount | null = null;
    let lastError = "";

    // 1) Preferred: permanent static account
    const staticResult = await callFlutterwaveCreate(basePayload);
    if (staticResult.ok) {
      account = staticResult.data;
      permanent = true;
    } else {
      lastError = staticResult.message;
      console.error("[Flutterwave] static VA rejected:", lastError);

      // Retry static once with a unique tx_ref (in case of duplicate ref)
      const retryRef = `${reference}-${Date.now().toString(36).toUpperCase()}`;
      const retryResult = await callFlutterwaveCreate({
        ...basePayload,
        tx_ref: retryRef,
      });
      if (retryResult.ok) {
        account = retryResult.data;
        permanent = true;
      } else {
        lastError = retryResult.message || lastError;
      }
    }

    // 2) Last-resort dynamic only if static truly cannot be created
    //    (e.g. missing BVN on a live Flutterwave account)
    if (!account) {
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
      } else {
        lastError = dynamicResult.message || lastError;
      }
    }

    if (!account?.account_number) {
      console.error("[Flutterwave] no account created:", lastError);
      return null;
    }

    const accountNumber = account.account_number;
    const bankName = account.bank_name ?? "Wema Bank";
    const savedRef = permanent ? reference : account.order_ref || reference;

    // Persist static accounts so the user keeps the same number forever
    if (permanent) {
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
    }

    return {
      accountNumber,
      bankName,
      reference: savedRef,
      permanent,
      message: permanent
        ? undefined
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

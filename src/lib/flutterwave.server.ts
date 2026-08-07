/**
 * Server-only Flutterwave helpers for Vernex.
 *
 * Creates permanent (static) NGN virtual account numbers so a user can fund
 * their wallet by bank transfer, and credits the wallet when Flutterwave
 * notifies us of a completed transfer.
 *
 * Env:
 *   FLUTTERWAVE_SECRET_KEY (or FLW_SECRET_KEY) — required
 *   FLUTTERWAVE_PUBLIC_KEY — optional
 *   FLUTTERWAVE_ENCRYPTION_KEY — optional
 *   FLUTTERWAVE_BVN — optional shared BVN when provider requires it
 *   FLW_WEBHOOK_HASH / FLUTTERWAVE_WEBHOOK_HASH — webhook verif-hash
 */

const FLW_BASE = "https://api.flutterwave.com/v3";

type FlwVirtualAccount = {
  account_number: string;
  bank_name: string;
  order_ref?: string;
  flw_ref?: string;
  note?: string;
  amount?: number | null;
};

export function flutterwaveSecretKey(): string | null {
  const key =
    process.env["FLUTTERWAVE_SECRET_KEY"]?.trim() ||
    process.env["FLW_SECRET_KEY"]?.trim() ||
    process.env["FLUTTERWAVE_SECRET"]?.trim() ||
    "";
  return key || null;
}

function requireSecretKey(): string {
  const key = flutterwaveSecretKey();
  if (!key) {
    throw new Error(
      "Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY in Cloudflare environment variables.",
    );
  }
  return key;
}

export function isFlutterwaveConfigured(): boolean {
  return Boolean(flutterwaveSecretKey());
}

export type CreateVirtualAccountInput = {
  userId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  bvn?: string | null;
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

/**
 * Calls Flutterwave and persists the resulting static account on the wallet.
 * Returns null when the provider rejects the request (never throws to callers).
 */
export async function provisionVirtualAccount(
  input: CreateVirtualAccountInput,
): Promise<{ accountNumber: string; bankName: string; reference: string } | null> {
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

    if (wallet?.virtual_account_number) {
      return {
        accountNumber: wallet.virtual_account_number,
        bankName: wallet.virtual_bank_name ?? "Wema Bank",
        reference: wallet.virtual_account_reference ?? "",
      };
    }

    if (!wallet) {
      const { error: upsertError } = await supabaseAdmin.from("wallets").upsert(
        {
          user_id: input.userId,
          balance: 0,
          ledger_balance: 0,
          currency: "NGN",
        },
        { onConflict: "user_id" },
      );
      if (upsertError) {
        console.error("[Flutterwave] wallet upsert failed", upsertError.message);
      }
    }

    const reference =
      wallet?.virtual_account_reference ??
      `VNX-${input.userId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;

    const { firstname, lastname } = splitName(input.fullName || "Vernex Customer");
    const email =
      (input.email || "").trim() ||
      `${input.userId.replace(/-/g, "").slice(0, 12)}@users.vernex.com.ng`;
    const phonenumber = normalizeNgPhone(input.phone);
    const bvn =
      input.bvn?.trim() ||
      process.env["FLUTTERWAVE_BVN"]?.trim() ||
      process.env["FLW_BVN"]?.trim() ||
      undefined;

    const payload: Record<string, unknown> = {
      email,
      tx_ref: reference,
      is_permanent: true,
      narration: `Vernex / ${firstname} ${lastname}`.slice(0, 100),
      firstname,
      lastname,
    };
    if (phonenumber) payload["phonenumber"] = phonenumber;
    if (bvn) payload["bvn"] = bvn;

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
      console.error(
        "[Flutterwave] virtual account failed:",
        body?.message ?? res.status,
        JSON.stringify(body),
      );
      return null;
    }

    const accountNumber = body.data.account_number;
    const bankName = body.data.bank_name ?? "Wema Bank";

    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({
        virtual_account_number: accountNumber,
        virtual_bank_name: bankName,
        virtual_account_reference: reference,
      })
      .eq("user_id", input.userId);

    if (updateError) {
      console.error("[Flutterwave] could not persist virtual account", updateError.message);
      // Still return the account so the user can fund once.
      return { accountNumber, bankName, reference };
    }

    return { accountNumber, bankName, reference };
  } catch (error) {
    console.error("[Flutterwave] provisionVirtualAccount error", error);
    return null;
  }
}

/** Credits a wallet for a verified Flutterwave transfer (idempotent by reference). */
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
      console.error("[Flutterwave] no wallet matched for transfer", params.reference);
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

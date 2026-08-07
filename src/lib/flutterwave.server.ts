/**
 * Server-only Flutterwave helpers for Vernex.
 *
 * Creates permanent (static) NGN virtual account numbers so a user can fund
 * their wallet by bank transfer forever, and credits the wallet when
 * Flutterwave notifies us of a completed transfer.
 *
 * Env (Cloudflare / .env) — any of these secret key names work:
 *   FLUTTERWAVE_SECRET_KEY  (preferred)
 *   FLW_SECRET_KEY
 * Optional:
 *   FLUTTERWAVE_PUBLIC_KEY
 *   FLUTTERWAVE_ENCRYPTION_KEY
 *   FLW_WEBHOOK_HASH / FLUTTERWAVE_WEBHOOK_HASH  (verihash for webhooks)
 */

const FLW_BASE = "https://api.flutterwave.com/v3";

type FlwVirtualAccount = {
  account_number: string;
  bank_name: string;
  order_ref?: string;
  flw_ref?: string;
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

/**
 * Calls Flutterwave and persists the resulting static account on the wallet.
 * Returns null when the provider rejects the request (we never block signup).
 */
export async function provisionVirtualAccount(
  input: CreateVirtualAccountInput,
): Promise<{ accountNumber: string; bankName: string; reference: string } | null> {
  if (!flutterwaveSecretKey()) {
    console.error("[Flutterwave] missing FLUTTERWAVE_SECRET_KEY");
    return null;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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

  // Ensure a wallet row exists
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

  const reference =
    wallet?.virtual_account_reference ?? `VNX-${input.userId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  const nameParts = (input.fullName || "Vernex Customer").trim().split(/\s+/);
  const email =
    input.email?.trim() ||
    `${input.userId.replace(/-/g, "").slice(0, 12)}@users.vernex.com.ng`;

  const payload: Record<string, unknown> = {
    email,
    tx_ref: reference,
    is_permanent: true,
    narration: `Vernex / ${(input.fullName || "Customer").toUpperCase()}`,
    firstname: nameParts[0] ?? "Vernex",
    lastname: nameParts.slice(1).join(" ") || "Customer",
  };
  if (input.phone) payload["phonenumber"] = input.phone.replace(/\s+/g, "");
  if (input.bvn) payload["bvn"] = input.bvn;

  let body: { status?: string; message?: string; data?: FlwVirtualAccount };
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
    body = (await res.json()) as typeof body;
    if (!res.ok || body.status !== "success" || !body.data?.account_number) {
      console.error(
        "[Flutterwave] virtual account failed:",
        body?.message ?? res.status,
        JSON.stringify(body),
      );
      return null;
    }
  } catch (error) {
    console.error("[Flutterwave] virtual account request error", error);
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
    return null;
  }

  return { accountNumber, bankName, reference };
}

/** Credits a wallet for a verified Flutterwave transfer (idempotent by reference). */
export async function creditWalletFromTransfer(params: {
  reference: string;
  amount: number;
  accountNumber?: string | null;
  customerEmail?: string | null;
  txRef?: string | null;
}): Promise<{ credited: boolean }> {
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
}

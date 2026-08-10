import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  kyc_status: "unverified" | "pending" | "verified";
  bvn_status: "unverified" | "pending" | "verified";
  tier: "tier_1" | "tier_2" | "tier_3";
  pin_set: boolean;
};

export type Wallet = {
  user_id: string;
  balance: number;
  ledger_balance: number;
  currency: string;
  virtual_account_number: string | null;
  virtual_bank_name: string | null;
  virtual_account_reference: string | null;
};

export type Account = {
  profile: Profile | null;
  wallet: Wallet | null;
};

export async function fetchAccount(userId: string): Promise<Account> {
  const [profileRes, walletRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, email, kyc_status, bvn_status, tier, pin_set")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("wallets")
      .select("user_id, balance, ledger_balance, currency, virtual_account_number, virtual_bank_name, virtual_account_reference")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (walletRes.error) throw walletRes.error;

  // Create a real wallet row at ₦0 if missing (never invent a balance)
  let walletRow = walletRes.data;
  if (!walletRow) {
    const { data: created, error: createErr } = await supabase
      .from("wallets")
      .upsert(
        {
          user_id: userId,
          balance: 0,
          ledger_balance: 0,
          currency: "NGN",
        },
        { onConflict: "user_id" },
      )
      .select(
        "user_id, balance, ledger_balance, currency, virtual_account_number, virtual_bank_name, virtual_account_reference",
      )
      .maybeSingle();
    if (!createErr && created) walletRow = created;
  }

  const profile = profileRes.data
    ? ({
        ...profileRes.data,
        kyc_status: (profileRes.data.kyc_status ?? "unverified") as Profile["kyc_status"],
        bvn_status: (profileRes.data.bvn_status ?? "unverified") as Profile["bvn_status"],
        tier: (profileRes.data.tier ?? "tier_1") as Profile["tier"],
      } as Profile)
    : null;

  const wallet = walletRow
    ? ({
        ...walletRow,
        balance: Number(walletRow.balance ?? 0),
        ledger_balance: Number(walletRow.ledger_balance ?? 0),
      } as Wallet)
    : null;

  return { profile, wallet };
}

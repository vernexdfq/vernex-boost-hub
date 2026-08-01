import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

export type Wallet = {
  user_id: string;
  balance: number;
  currency: string;
};

export async function fetchAccount(userId: string) {
  const [profileRes, walletRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, email").eq("id", userId).maybeSingle(),
    supabase.from("wallets").select("user_id, balance, currency").eq("user_id", userId).maybeSingle(),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (walletRes.error) throw walletRes.error;

  return {
    profile: (profileRes.data ?? null) as Profile | null,
    wallet: walletRes.data
      ? ({ ...walletRes.data, balance: Number(walletRes.data.balance) } as Wallet)
      : null,
  };
}

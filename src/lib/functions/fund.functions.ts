import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WalletFundingDetails = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
};

export const getWalletFundingDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletFundingDetails> => {
    const { supabase, userId } = context;

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("virtual_bank_name, virtual_account_number, virtual_account_reference")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(`Failed to load wallet details: ${error.message}`);

    const bankName = wallet?.virtual_bank_name ?? "Paga MFB";
    const accountNumber = wallet?.virtual_account_number ?? generateVirtualAccountNumber();
    const reference = wallet?.virtual_account_reference ?? "VNX-" + userId.slice(0, 8).toUpperCase();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const accountName = profile?.full_name
      ? `VERNEX / ${profile.full_name.toUpperCase()}`
      : "VERNEX / CUSTOMER";

    return { bankName, accountNumber, accountName, reference };
  });

function generateVirtualAccountNumber(): string {
  return "81" + Math.floor(10000000 + Math.random() * 89999999).toString();
}

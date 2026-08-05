import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WalletFundingDetails = {
  bankName: string;
  accountNumber: string | null;
  accountName: string;
  reference: string;
  pending: boolean;
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", userId)
      .maybeSingle();

    const accountName = profile?.full_name
      ? `VERNEX / ${profile.full_name.toUpperCase()}`
      : "VERNEX / CUSTOMER";

    let accountNumber = wallet?.virtual_account_number ?? null;
    let bankName = wallet?.virtual_bank_name ?? "Wema Bank";
    let reference = wallet?.virtual_account_reference ?? `VNX-${userId.slice(0, 8).toUpperCase()}`;

    // Backfill for accounts created before Flutterwave was connected.
    if (!accountNumber && profile?.email) {
      const { provisionVirtualAccount } = await import("@/lib/flutterwave.server");
      const provisioned = await provisionVirtualAccount({
        userId,
        email: profile.email,
        fullName: profile.full_name ?? "Vernex Customer",
        phone: profile.phone ?? null,
      });
      if (provisioned) {
        accountNumber = provisioned.accountNumber;
        bankName = provisioned.bankName;
        reference = provisioned.reference;
      }
    }

    return { bankName, accountNumber, accountName, reference, pending: !accountNumber };
  });

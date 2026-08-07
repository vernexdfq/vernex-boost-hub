import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WalletFundingDetails = {
  bankName: string;
  accountNumber: string | null;
  accountName: string;
  reference: string;
  pending: boolean;
  configured: boolean;
};

/**
 * Returns the user's permanent Flutterwave virtual account.
 * Auto-provisions one on first request if missing (login / fund page).
 */
export const getWalletFundingDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletFundingDetails> => {
    const { supabase, userId } = context;
    const { isFlutterwaveConfigured, provisionVirtualAccount } = await import(
      "@/lib/flutterwave.server"
    );

    const configured = isFlutterwaveConfigured();

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
    let reference =
      wallet?.virtual_account_reference ??
      `VNX-${userId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;

    // Provision (or backfill) permanent VA when Flutterwave is configured
    if (!accountNumber && configured) {
      const provisioned = await provisionVirtualAccount({
        userId,
        email:
          profile?.email ??
          `${userId.replace(/-/g, "").slice(0, 12)}@users.vernex.com.ng`,
        fullName: profile?.full_name ?? "Vernex Customer",
        phone: profile?.phone ?? null,
      });
      if (provisioned) {
        accountNumber = provisioned.accountNumber;
        bankName = provisioned.bankName;
        reference = provisioned.reference;
      }
    }

    return {
      bankName,
      accountNumber,
      accountName,
      reference,
      pending: !accountNumber,
      configured,
    };
  });

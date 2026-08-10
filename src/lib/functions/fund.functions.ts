import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WalletFundingDetails = {
  bankName: string;
  accountNumber: string | null;
  accountName: string;
  reference: string;
  pending: boolean;
  configured: boolean;
  permanent?: boolean;
  message?: string | null;
};

/**
 * Returns (and auto-provisions) the user's Flutterwave virtual account.
 * Always returns a structured object — never throws to the UI.
 */
const fundingInputSchema = z
  .object({
    force: z.boolean().optional(),
  })
  .optional();

export const getWalletFundingDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => fundingInputSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<WalletFundingDetails> => {
    try {
      const force = Boolean(data?.force);
      const { supabase, userId } = context;

      let configured = false;
      let bvnConfigured = false;
      try {
        const flw = await import("@/lib/flutterwave.server");
        configured = flw.isFlutterwaveConfigured();
        bvnConfigured = flw.isFlutterwaveBvnConfigured();
      } catch {
        configured = false;
        bvnConfigured = false;
      }

      const { data: wallet } = await supabase
        .from("wallets")
        .select("virtual_bank_name, virtual_account_number, virtual_account_reference")
        .eq("user_id", userId)
        .maybeSingle();

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
      let message: string | null = null;
      let permanent = Boolean(accountNumber);

      // Create or upgrade VA. force=true regenerates (use after adding FLUTTERWAVE_BVN).
      // When BVN is configured and no account yet, always provision permanent static.
      const shouldProvision =
        configured && (!accountNumber || force || (bvnConfigured && force));

      if (shouldProvision) {
        try {
          const { provisionVirtualAccount } = await import("@/lib/flutterwave.server");
          const provisioned = await provisionVirtualAccount({
            userId,
            email:
              profile?.email ??
              `${userId.replace(/-/g, "").slice(0, 12)}@users.vernex.com.ng`,
            fullName: profile?.full_name ?? "Vernex Customer",
            phone: profile?.phone ?? null,
            force: force || !accountNumber,
          });
          if (provisioned) {
            accountNumber = provisioned.accountNumber;
            bankName = provisioned.bankName;
            reference = provisioned.reference;
            permanent = provisioned.permanent;
            message = provisioned.permanent
              ? null
              : provisioned.message ??
                "Temporary account — ensure FLUTTERWAVE_BVN is an 11-digit BVN in Cloudflare.";
          } else {
            message = bvnConfigured
              ? "Flutterwave rejected the permanent account request. Check FLUTTERWAVE_SECRET_KEY and that FLUTTERWAVE_BVN is a valid 11-digit BVN."
              : "Flutterwave could not create a virtual account. Set FLUTTERWAVE_BVN (11 digits) for permanent static accounts.";
          }
        } catch (err) {
          message =
            err instanceof Error
              ? err.message
              : "Could not reach Flutterwave. Try again shortly.";
        }
      } else if (!accountNumber && !configured) {
        message =
          "Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY in Cloudflare Pages → Environment variables (Production).";
      } else if (accountNumber && bvnConfigured && !force) {
        // Existing account kept; user can tap Generate/Refresh (force) to upgrade to permanent
        permanent = true;
      }

      return {
        bankName,
        accountNumber,
        accountName,
        reference,
        pending: !accountNumber,
        configured,
        permanent,
        message,
      };
    } catch (err) {
      return {
        bankName: "Wema Bank",
        accountNumber: null,
        accountName: "VERNEX / CUSTOMER",
        reference: "",
        pending: true,
        configured: false,
        message:
          err instanceof Error
            ? err.message
            : "Could not load funding details. Please try again.",
      };
    }
  });

export const confirmWalletDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    credited: number;
    totalAmount: number;
    balance: number;
    message: string;
  }> => {
    const { supabase, userId } = context;

    const { data: wallet } = await supabase
      .from("wallets")
      .select("virtual_account_number, balance")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    const { syncUserDeposits } = await import("@/lib/flutterwave.server");
    const result = await syncUserDeposits({
      userId,
      accountNumber: wallet?.virtual_account_number ?? null,
      email: profile?.email ?? null,
    });

    const { data: walletAfter } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    const balance = Number(walletAfter?.balance ?? wallet?.balance ?? 0);

    if (result.credited > 0) {
      return {
        credited: result.credited,
        totalAmount: result.totalAmount,
        balance,
        message: `₦${result.totalAmount.toLocaleString("en-NG")} added to your wallet.`,
      };
    }

    return {
      credited: 0,
      totalAmount: 0,
      balance,
      message:
        "No new deposit found yet. Bank transfers can take a few minutes — tap again shortly. Ensure you transferred to your Vernex virtual account.",
    };
  });

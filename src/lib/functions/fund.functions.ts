import { createServerFn } from "@tanstack/react-start";
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
export const getWalletFundingDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletFundingDetails> => {
    try {
      const { supabase, userId } = context;

      let configured = false;
      try {
        const flw = await import("@/lib/flutterwave.server");
        configured = flw.isFlutterwaveConfigured();
      } catch {
        configured = false;
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

      if (!accountNumber && configured) {
        try {
          const { provisionVirtualAccount } = await import("@/lib/flutterwave.server");
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
            permanent = provisioned.permanent;
            message = provisioned.message ?? null;
          } else {
            message =
              "Flutterwave could not create a virtual account. Confirm FLUTTERWAVE_SECRET_KEY is set on Cloudflare, and for permanent accounts a BVN may be required.";
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

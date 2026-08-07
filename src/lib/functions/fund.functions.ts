import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WalletFundingDetails = {
  bankName: string;
  accountNumber: string | null;
  accountName: string;
  reference: string;
  pending: boolean;
  configured: boolean;
  message?: string | null;
};

/**
 * Returns the user's permanent Flutterwave virtual account.
 * Auto-provisions one on first request if missing.
 * Soft-fails (pending=true) instead of throwing when Flutterwave is slow / rejects.
 */
export const getWalletFundingDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletFundingDetails> => {
    const { supabase, userId } = context;

    let configured = false;
    try {
      const flw = await import("@/lib/flutterwave.server");
      configured = flw.isFlutterwaveConfigured();
    } catch {
      configured = false;
    }

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("virtual_bank_name, virtual_account_number, virtual_account_reference")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      // Soft-fail so the UI can still render
      console.error("[fund] wallet load error", error.message);
      return {
        bankName: "Wema Bank",
        accountNumber: null,
        accountName: "VERNEX / CUSTOMER",
        reference: `VNX-${userId.replace(/-/g, "").slice(0, 12).toUpperCase()}`,
        pending: true,
        configured,
        message: `Could not load wallet: ${error.message}`,
      };
    }

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
        } else {
          message =
            "Flutterwave could not create a virtual account yet. Confirm FLUTTERWAVE_SECRET_KEY is set, then tap Refresh.";
        }
      } catch (err) {
        console.error("[fund] provision error", err);
        message =
          err instanceof Error
            ? err.message
            : "Could not reach Flutterwave. Try again in a moment.";
      }
    } else if (!accountNumber && !configured) {
      message =
        "Flutterwave is not configured on the server. Set FLUTTERWAVE_SECRET_KEY in Cloudflare Pages environment variables.";
    }

    return {
      bankName,
      accountNumber,
      accountName,
      reference,
      pending: !accountNumber,
      configured,
      message,
    };
  });

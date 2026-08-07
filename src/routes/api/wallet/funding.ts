import { createAPIFileRoute } from "@tanstack/react-start/api";

/**
 * Fallback JSON endpoint. Preferred path is the getWalletFundingDetails server fn.
 * Fixed format: handlers are methods directly (not nested under .handlers).
 */
export const APIRoute = createAPIFileRoute("/api/wallet/funding")({
  GET: async ({ request }) => {
    try {
      const authHeader = request.headers.get("authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return Response.json(
          {
            bankName: "Wema Bank",
            accountNumber: null,
            accountName: "VERNEX / CUSTOMER",
            reference: "",
            pending: true,
            configured: false,
            message: "Unauthorized — sign in again.",
          },
          { status: 401 },
        );
      }

      // Delegate to same provision logic used by the server function
      const { isFlutterwaveConfigured, provisionVirtualAccount } = await import(
        "@/lib/flutterwave.server"
      );
      const configured = isFlutterwaveConfigured();

      const { createClient } = await import("@supabase/supabase-js");
      type Database = import("@/integrations/supabase/types").Database;

      const url = (
        process.env["SUPABASE_URL"] ||
        process.env["VITE_SUPABASE_URL"] ||
        ""
      )
        .trim()
        .replace(/\/(rest|auth|storage|functions)\/v1\/?$/i, "")
        .replace(/\/+$/, "");
      const key = (
        process.env["SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["SUPABASE_ANON_KEY"] ||
        process.env["VITE_SUPABASE_ANON_KEY"] ||
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        ""
      ).trim();

      if (!url || !key) {
        return Response.json({
          bankName: "Wema Bank",
          accountNumber: null,
          accountName: "VERNEX / CUSTOMER",
          reference: "",
          pending: true,
          configured,
          message: "Supabase env missing on server.",
        });
      }

      const token = authHeader.slice(7);
      const supabase = createClient<Database>(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user?.id) {
        return Response.json(
          {
            bankName: "Wema Bank",
            accountNumber: null,
            accountName: "VERNEX / CUSTOMER",
            reference: "",
            pending: true,
            configured,
            message: "Unauthorized",
          },
          { status: 401 },
        );
      }

      const userId = userData.user.id;
      const [{ data: wallet }, { data: profile }] = await Promise.all([
        supabase
          .from("wallets")
          .select("virtual_bank_name, virtual_account_number, virtual_account_reference")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("id", userId)
          .maybeSingle(),
      ]);

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
            "Flutterwave could not create a virtual account. Check FLUTTERWAVE_SECRET_KEY.";
        }
      } else if (!accountNumber && !configured) {
        message = "Set FLUTTERWAVE_SECRET_KEY in Cloudflare Production env.";
      }

      return Response.json({
        bankName,
        accountNumber,
        accountName,
        reference,
        pending: !accountNumber,
        configured,
        permanent,
        message,
      });
    } catch (err) {
      return Response.json({
        bankName: "Wema Bank",
        accountNumber: null,
        accountName: "VERNEX / CUSTOMER",
        reference: "",
        pending: true,
        configured: false,
        message: err instanceof Error ? err.message : "Server error",
      });
    }
  },
  POST: async (ctx) => {
    // Same as GET
    const get = (APIRoute as { GET?: (c: typeof ctx) => Promise<Response> }).GET;
    if (get) return get(ctx);
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  },
});

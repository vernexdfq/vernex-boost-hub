import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  let url = raw.trim();
  url = url.replace(/\/(rest|auth|storage|functions)\/v1\/?$/i, "");
  return url.replace(/\/+$/, "");
}

function publicEnv() {
  const url = normalizeSupabaseUrl(
    process.env["SUPABASE_URL"] ||
      process.env["VITE_SUPABASE_URL"] ||
      process.env["SUPABASE_PROJECT_URL"],
  );
  const key = (
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_ANON_KEY"] ||
    ""
  ).trim();
  return { url, key };
}

async function resolveUser(request: Request) {
  const { url, key } = publicEnv();
  if (!url || !key) {
    return { error: "Supabase is not configured on the server.", status: 500 as const };
  }

  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized", status: 401 as const };
  }
  const token = authHeader.slice(7);
  if (!token || token.split(".").length !== 3) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { error: "Unauthorized", status: 401 as const };
  }

  return { supabase, userId: data.user.id };
}

/**
 * GET/POST /api/wallet/funding
 * Returns (and auto-provisions) the user's Flutterwave virtual account.
 */
export const APIRoute = createAPIFileRoute("/api/wallet/funding")({
  GET: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) {
          return Response.json(
            {
              bankName: "Wema Bank",
              accountNumber: null,
              accountName: "VERNEX / CUSTOMER",
              reference: "",
              pending: true,
              configured: false,
              message: auth.error,
            },
            { status: auth.status },
          );
        }

        const { supabase, userId } = auth;

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

        const { isFlutterwaveConfigured, provisionVirtualAccount } = await import(
          "@/lib/flutterwave.server"
        );
        const configured = isFlutterwaveConfigured();

        // Auto-provision when missing
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
              "Flutterwave could not create an account. Confirm FLUTTERWAVE_SECRET_KEY is set and (for permanent accounts) BVN is available.";
          }
        } else if (!accountNumber && !configured) {
          message =
            "Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY in Cloudflare Pages → Environment variables.";
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
      },
    },
  },
  POST: {
    handlers: {
      POST: async ({ request }) => {
        // Same as GET — provision on demand
        const url = new URL(request.url);
        // Re-use GET handler logic by calling ourselves conceptually
        const getHandler = APIRoute.GET?.handlers?.GET;
        if (!getHandler) {
          return Response.json({ message: "Not available" }, { status: 500 });
        }
        return getHandler({ request, params: {}, url } as never);
      },
    },
  },
});

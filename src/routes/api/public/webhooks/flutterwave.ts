import { createAPIFileRoute } from "@tanstack/react-start/api";

/**
 * Flutterwave webhook endpoint.
 * Dashboard URL: https://vernex.com.ng/api/public/webhooks/flutterwave
 *
 * Set secret hash as FLW_WEBHOOK_HASH or FLUTTERWAVE_WEBHOOK_HASH (verihash header).
 */
export const APIRoute = createAPIFileRoute("/api/public/webhooks/flutterwave")({
  POST: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["FLW_WEBHOOK_HASH"]?.trim() ||
          process.env["FLUTTERWAVE_WEBHOOK_HASH"]?.trim() ||
          process.env["FLUTTERWAVE_SECRET_HASH"]?.trim() ||
          "";

        if (expected) {
          const incoming =
            request.headers.get("verif-hash") ||
            request.headers.get("Verif-Hash") ||
            "";
          if (!incoming || incoming !== expected) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let payload: {
          event?: string;
          "event.type"?: string;
          data?: {
            id?: number;
            status?: string;
            amount?: number;
            flw_ref?: string;
            tx_ref?: string;
            currency?: string;
            customer?: { email?: string };
            meta?: Record<string, unknown> | null;
            entity?: { account_number?: string } | null;
            account_number?: string;
          };
        };

        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const data = payload.data;
        const event = (payload.event ?? payload["event.type"] ?? "").toLowerCase();
        const status = (data?.status ?? "").toLowerCase();

        const isSuccessful =
          (event.includes("charge") ||
            event.includes("transfer") ||
            event.includes("bank_transfer")) &&
          (status === "successful" || status === "success" || status === "completed");

        if (!isSuccessful || !data?.amount || Number(data.amount) <= 0) {
          return Response.json({ ok: true, ignored: true, event, status });
        }

        const { creditWalletFromTransfer } = await import("@/lib/flutterwave.server");

        const accountNumber =
          data.entity?.account_number ?? data.account_number ?? null;

        const result = await creditWalletFromTransfer({
          reference: data.flw_ref ?? `FLW-${data.id ?? Date.now()}`,
          amount: Number(data.amount),
          accountNumber,
          customerEmail: data.customer?.email ?? null,
          txRef: data.tx_ref ?? null,
        });

        return Response.json({ ok: true, credited: result.credited });
      },
    },
  },
});

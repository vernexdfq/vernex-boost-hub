import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/flutterwave")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["FLW_WEBHOOK_HASH"];
        const signature = request.headers.get("verif-hash");

        if (!expected || signature !== expected) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: {
          event?: string;
          data?: {
            id?: number;
            status?: string;
            amount?: number;
            flw_ref?: string;
            tx_ref?: string;
            customer?: { email?: string };
            meta?: Record<string, unknown> | null;
            entity?: { account_number?: string } | null;
          };
        };

        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const data = payload.data;
        const isSuccessfulCharge =
          (payload.event ?? "").startsWith("charge.") &&
          (data?.status ?? "").toLowerCase() === "successful";

        if (!isSuccessfulCharge || !data?.amount || data.amount <= 0) {
          return Response.json({ ok: true, ignored: true });
        }

        const { creditWalletFromTransfer } = await import("@/lib/flutterwave.server");

        const result = await creditWalletFromTransfer({
          reference: data.flw_ref ?? `FLW-${data.id ?? Date.now()}`,
          amount: Number(data.amount),
          accountNumber: data.entity?.account_number ?? null,
          customerEmail: data.customer?.email ?? null,
          txRef: data.tx_ref ?? null,
        });

        return Response.json({ ok: true, credited: result.credited });
      },
    },
  },
});

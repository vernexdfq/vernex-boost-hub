import { creditWalletFromTransfer } from "../../../../../src/lib/flutterwave.server";

/**
 * Flutterwave webhook — Nitro server route
 * URL: /api/public/webhooks/flutterwave
 */
export default async function handler(event: { request: Request }) {
  const request = event.request ?? (event as unknown as Request);

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
      account_number?: string;
    };
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventName = payload.event || payload["event.type"] || "";
  const data = payload.data;

  // Credit on successful bank transfer / virtual account payment
  const okStatus = (data?.status || "").toLowerCase();
  const isSuccess =
    okStatus === "successful" ||
    okStatus === "success" ||
    eventName.toLowerCase().includes("success");

  if (isSuccess && data?.amount && (data.flw_ref || data.tx_ref)) {
    try {
      await creditWalletFromTransfer({
        reference: String(data.flw_ref || data.tx_ref),
        amount: Number(data.amount),
        accountNumber: data.account_number ?? null,
        customerEmail: data.customer?.email ?? null,
        txRef: data.tx_ref ?? null,
      });
    } catch (err) {
      console.error("[webhook/flutterwave] credit error", err);
    }
  }

  return Response.json({ status: "ok" });
}

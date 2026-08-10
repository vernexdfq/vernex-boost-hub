import { createFileRoute } from "@tanstack/react-router";

/**
 * Flutterwave webhook (live).
 * URL: https://vernex.com.ng/api/flutterwave/webhook
 * Requires FLUTTERWAVE_SECRET_HASH — must match Flutterwave dashboard secret hash
 * (sent as the verif-hash request header).
 */
export const Route = createFileRoute("/api/flutterwave/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const secretHash = (
            process.env["FLUTTERWAVE_SECRET_HASH"] ||
            process.env["FLW_SECRET_HASH"] ||
            ""
          ).trim();

          if (!secretHash) {
            console.error("[Flutterwave webhook] FLUTTERWAVE_SECRET_HASH is not set");
            return new Response(
              JSON.stringify({ status: "error", message: "Webhook not configured" }),
              { status: 500, headers: { "content-type": "application/json" } },
            );
          }

          const headerHash = (
            request.headers.get("verif-hash") ||
            request.headers.get("Verif-Hash") ||
            request.headers.get("VERIF-HASH") ||
            ""
          ).trim();

          if (!headerHash || headerHash !== secretHash) {
            console.error("[Flutterwave webhook] invalid or missing verif-hash");
            return new Response(
              JSON.stringify({ status: "error", message: "Invalid signature" }),
              { status: 401, headers: { "content-type": "application/json" } },
            );
          }

          const payload = (await request.json()) as Record<string, unknown>;
          const event = String(payload["event"] || "").toLowerCase();
          console.info("[Flutterwave webhook] event=", event || "(none)");

          const { handleFlutterwaveWebhookPayload } = await import(
            "@/lib/flutterwave.server"
          );
          const result = await handleFlutterwaveWebhookPayload(payload);

          return new Response(JSON.stringify({ status: "success", ...result }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (error) {
          console.error("[Flutterwave webhook]", error);
          // 200 so Flutterwave does not hammer retries on parse bugs after logging
          return new Response(JSON.stringify({ status: "error" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
      },
      GET: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            service: "flutterwave-webhook",
            url: "https://vernex.com.ng/api/flutterwave/webhook",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    },
  },
});

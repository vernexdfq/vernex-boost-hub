import { createFileRoute } from "@tanstack/react-router";

/**
 * Flutterwave webhook.
 * Dashboard URL: https://YOUR_DOMAIN/api/flutterwave/webhook
 * Optional env: FLUTTERWAVE_SECRET_HASH (verif-hash header)
 */
export const Route = createFileRoute("/api/flutterwave/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const secretHash =
            process.env["FLUTTERWAVE_SECRET_HASH"]?.trim() ||
            process.env["FLW_SECRET_HASH"]?.trim() ||
            "";
          if (secretHash) {
            const headerHash =
              request.headers.get("verif-hash") ||
              request.headers.get("Verif-Hash") ||
              "";
            if (!headerHash || headerHash !== secretHash) {
              console.error("[Flutterwave webhook] invalid verif-hash");
              return new Response(
                JSON.stringify({ status: "error", message: "Invalid signature" }),
                { status: 401, headers: { "content-type": "application/json" } },
              );
            }
          }

          const payload = (await request.json()) as Record<string, unknown>;
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
          return new Response(JSON.stringify({ status: "error" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, service: "flutterwave-webhook" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
  },
});

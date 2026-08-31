import { createFileRoute } from "@tanstack/react-router";
import { BoostPage } from "@/components/boost-page";

export const Route = createFileRoute("/_authenticated/boost")({
  head: () => ({
    meta: [
      { title: "Boost Account — Verxor" },
      {
        name: "description",
        content:
          "Boost your social accounts with followers, likes, and views across Instagram, TikTok, YouTube, and more.",
      },
      { property: "og:title", content: "Verxor — Social Boost" },
      {
        property: "og:description",
        content: "Instant SMM delivery for every major platform.",
      },
    ],
  }),
  component: BoostPage,
});

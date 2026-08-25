import { createFileRoute } from "@tanstack/react-router";
import { RentNumberApp } from "@/components/rental/calls-screen";

export const Route = createFileRoute("/_authenticated/rent-number")({
  head: () => ({
    meta: [
      { title: "Calls — Vernex" },
      { name: "description", content: "Call from your rented lines. USA via SignalWire, worldwide via DIDWW." },
      { property: "og:title", content: "Vernex — Calls & Rentals" },
    ],
  }),
  component: RentNumberApp,
});

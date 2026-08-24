import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rent-number")({
  head: () => ({
    meta: [{ title: "Calls — Vernex" }],
  }),
  component: RentNumberStub,
});

function RentNumberStub() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6 text-center">
      <Phone className="mb-4 h-10 w-10 text-teal-700" />
      <h1 className="text-lg font-semibold text-slate-900">Calls / Rent Numbers</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Updating this page to the Call.com style UI. Refresh in a moment.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  );
}

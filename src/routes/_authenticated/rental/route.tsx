import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RentalBottomNav } from "@/components/rental/rental-bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";

export const Route = createFileRoute("/_authenticated/rental")({
  component: RentalLayout,
});

function RentalLayout() {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg bg-white text-slate-900 antialiased">
      <InstallPrompt variant="dropdown" />
      <Outlet />
      <RentalBottomNav />
    </div>
  );
}

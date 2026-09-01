import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RentalBottomNav } from "@/components/rental/rental-bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";

export const Route = createFileRoute("/_authenticated/rental")({
  component: RentalLayout,
});

function RentalLayout() {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-md overflow-x-hidden bg-white text-slate-900 antialiased">
      <InstallPrompt variant="dropdown" />
      <main className="min-h-[100dvh] pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <RentalBottomNav />
    </div>
  );
}

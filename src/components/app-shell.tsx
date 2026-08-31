import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({
  children,
  showThemeToggle = true,
}: {
  children: ReactNode;
  showThemeToggle?: boolean;
}) {
  return (
    <div className="verxor-app-shell min-h-screen min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-background text-foreground">
      {showThemeToggle && (
        <div className="pointer-events-none fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50">
          <div className="pointer-events-auto rounded-full border border-border/80 bg-surface/95 shadow-sm backdrop-blur">
            <ThemeToggle />
          </div>
        </div>
      )}
      <main className="verxor-app-content mx-auto min-h-[100dvh] w-full max-w-md min-w-0 overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

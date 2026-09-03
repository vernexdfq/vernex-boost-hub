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
    <div className="min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      {showThemeToggle && (
        <div className="pointer-events-none fixed right-3 top-3 z-50 md:right-[max(0.75rem,calc((100vw-28rem)/2+0.75rem))]">
          <div className="pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>
      )}

      <main
        data-app-shell="true"
        className="mx-auto min-h-[100dvh] w-full max-w-md overflow-x-clip pb-[calc(7rem+env(safe-area-inset-bottom))]"
      >
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

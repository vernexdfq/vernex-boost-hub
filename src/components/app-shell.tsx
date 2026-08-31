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
    <div className="verxor-app-shell min-h-screen w-full bg-background text-foreground">
      {showThemeToggle && (
        <div className="pointer-events-none fixed right-3 top-3 z-50 md:right-[max(0.75rem,calc((100vw-28rem)/2+0.75rem))]">
          <div className="pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>
      )}
      <main className="verxor-app-content mx-auto min-h-screen w-full max-w-md min-w-0 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

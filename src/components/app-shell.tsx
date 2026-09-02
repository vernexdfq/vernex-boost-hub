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
    <div className="verxor-app-shell min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-x-hidden pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {showThemeToggle && (
          <div className="flex h-16 shrink-0 items-center justify-end px-5">
            <ThemeToggle />
          </div>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

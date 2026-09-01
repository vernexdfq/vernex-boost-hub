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
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden pb-28">
        {showThemeToggle && (
          <div className="flex justify-end px-5 pt-3">
            <ThemeToggle />
          </div>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}

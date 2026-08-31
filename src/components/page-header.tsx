import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
      <Link
        to="/dashboard"
        aria-label="Back"
        className="tap-fast grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-2"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

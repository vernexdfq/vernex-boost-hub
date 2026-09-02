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
    <header className="flex min-h-16 items-center gap-3 px-5 pt-5 pb-2">
      <Link
        to="/dashboard"
        aria-label="Back"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground transition hover:bg-surface-2"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

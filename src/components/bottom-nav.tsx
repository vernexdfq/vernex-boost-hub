import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ReceiptText, Plus, Gift, Bell, User } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const items: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/history", label: "History", icon: ReceiptText },
  { to: "/fund", label: "Fund", icon: Plus },
  { to: "/reward", label: "Reward", icon: Gift },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-surface/98 shadow-[0_-8px_24px_-20px_rgba(15,19,50,0.35)] backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-md grid-cols-6 items-stretch gap-0.5 px-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex min-w-0">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`tap-fast group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[10px] font-medium leading-none tracking-tight transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className={`max-w-full truncate ${active ? "font-semibold text-primary" : ""}`}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

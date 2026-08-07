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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface/95 backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-md grid-cols-6 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex">
              <Link
                to={item.to}
                className="tap-fast group flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium tracking-tight text-muted-foreground transition-colors"
              >
                <Icon
                  className={`h-[22px] w-[22px] transition-colors ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={active ? "text-primary" : ""}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

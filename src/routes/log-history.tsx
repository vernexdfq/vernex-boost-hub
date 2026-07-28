import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/log-history")({
  head: () => ({
    meta: [
      { title: "Log History — Vernex" },
      { name: "description", content: "Your account log purchase history." },
      { property: "og:title", content: "Vernex — Log History" },
      { property: "og:description", content: "Track all your aged account and log purchases." },
    ],
  }),
  component: LogHistory,
});

const logs = [
  { id: "LG-2210", name: "Instagram Aged 2019", price: 4500, when: "Yesterday" },
  { id: "LG-2208", name: "Gmail PVA + Recovery", price: 1500, when: "3 days ago" },
  { id: "LG-2201", name: "Facebook USA Verified", price: 6800, when: "1 week ago" },
];

function LogHistory() {
  return (
    <AppShell>
      <PageHeader title="Log History" subtitle="Account purchase records" />
      <ul className="px-5 pt-5 space-y-2">
        {logs.map((l) => (
          <li key={l.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{l.name}</p>
              <p className="text-[11px] text-muted-foreground">#{l.id} • {l.when}</p>
            </div>
            <span className="text-sm font-black tabular-nums">₦{l.price.toLocaleString("en-NG")}</span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

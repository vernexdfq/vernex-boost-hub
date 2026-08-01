import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/buy-accounts")({
  head: () => ({
    meta: [
      { title: "Buy Logs & Aged Accounts — Vernex" },
      { name: "description", content: "Verified aged social media accounts and SMS logs — ready to use." },
      { property: "og:title", content: "Vernex — Buy Aged Accounts" },
      { property: "og:description", content: "Instagram, Facebook, Gmail and more. Verified & delivered instantly." },
    ],
  }),
  component: BuyAccounts,
});

const products = [
  { id: 1, name: "Instagram Aged 2019", age: "5 yrs", price: 4500, stock: 42, tint: "bg-[#F3E8FF] text-[#7C3AED]", tag: "IG" },
  { id: 2, name: "Facebook USA Verified", age: "3 yrs", price: 6800, stock: 18, tint: "bg-[#EEF0FF] text-[#3949AB]", tag: "FB" },
  { id: 3, name: "Gmail PVA + Recovery", age: "New", price: 1500, stock: 210, tint: "bg-[#FFF1E0] text-[#D97706]", tag: "GM" },
  { id: 4, name: "TikTok Aged EU", age: "2 yrs", price: 5200, stock: 27, tint: "bg-[#E6F7EE] text-[#0D9488]", tag: "TT" },
  { id: 5, name: "Twitter/X Aged 2015", age: "9 yrs", price: 9500, stock: 6, tint: "bg-[#F1F5F9] text-[#0F172A]", tag: "X" },
  { id: 6, name: "LinkedIn Premium PVA", age: "1 yr", price: 7500, stock: 12, tint: "bg-[#E7F0FF] text-[#1D4ED8]", tag: "LI" },
];

function BuyAccounts() {
  return (
    <AppShell>
      <PageHeader title="Buy Logs" subtitle="Aged & verified accounts" />
      <div className="grid grid-cols-2 gap-3 px-5 pt-5">
        {products.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-surface p-3.5 shadow-card-elev">
            <div className="flex items-center justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-black ${p.tint}`}>{p.tag}</span>
              <span className="text-[10px] font-bold text-muted-foreground">{p.stock} in stock</span>
            </div>
            <p className="mt-3 text-sm font-bold leading-tight">{p.name}</p>
            <p className="text-[11px] text-muted-foreground">Age: {p.age}</p>
            <p className="mt-2 text-lg font-black tabular-nums">₦{p.price.toLocaleString("en-NG")}</p>
            <button onClick={() => toast.success(`${p.name} added to order`)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg brand-gradient py-2 text-[11px] font-bold text-white">
              <ShoppingCart className="h-3 w-3" /> Buy
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

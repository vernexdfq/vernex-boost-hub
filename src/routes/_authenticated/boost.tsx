import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Rocket, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createBoostOrder, listBoostProducts, type BoostProduct } from "@/lib/functions/boost.functions";

export const Route = createFileRoute("/_authenticated/boost")({
  head: () => ({
    meta: [
      { title: "Boost Account — Vernex" },
      { name: "description", content: "Boost your social accounts with followers, likes, and views across Instagram, TikTok, YouTube, and more." },
      { property: "og:title", content: "Vernex — Social Boost" },
      { property: "og:description", content: "Instant SMM delivery for every major platform." },
    ],
  }),
  component: BoostPage,
});

function BoostPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listBoostProducts);
  const submitOrder = useServerFn(createBoostOrder);

  const [platform, setPlatform] = useState<string>("");
  const [serviceType, setServiceType] = useState<string>("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["boost-products"],
    queryFn: () => fetchProducts({ data: undefined }),
  });

  const platforms = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map((p) => p.platform)));
  }, [products]);

  const services = useMemo(() => {
    if (!products || !platform) return [];
    return products.filter((p) => p.platform === platform);
  }, [products, platform]);

  useEffect(() => {
    if (platforms.length > 0 && !platform) {
      setPlatform(platforms[0]);
    }
  }, [platforms, platform]);

  useEffect(() => {
    if (services.length > 0) {
      setServiceType(services[0].service_type);
    }
  }, [services]);

  const selectedProduct = useMemo(() => {
    return products?.find((p) => p.platform === platform && p.service_type === serviceType);
  }, [products, platform, serviceType]);

  async function submit() {
    if (!selectedProduct) return;
    if (!url.trim()) {
      toast.error("Enter your profile / post URL");
      return;
    }
    setBusy(true);
    try {
      await submitOrder({
        data: {
          productId: selectedProduct.id,
          targetUrl: url,
          quantity: selectedProduct.quantity,
          amount: selectedProduct.price_ngn,
        },
      });
      toast.success(`Order placed: ${selectedProduct.quantity} ${selectedProduct.service_type} → ${selectedProduct.platform}`);
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["boost-orders", user.id] });
      queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Boost Account" subtitle="SMM delivery in minutes" />

      <div className="space-y-4 px-5 pt-5">
        <Field label="Platform">
          {isLoading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading products…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    platform === p ? "border-transparent brand-gradient text-white" : "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Service">
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium outline-none focus:border-primary"
          >
            {services.map((s: BoostProduct) => (
              <option key={s.service_type} value={s.service_type}>
                {s.service_type} — {s.quantity.toLocaleString()} for ₦{s.price_ngn.toLocaleString("en-NG")}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Profile / Post URL">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </Field>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-card-elev">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
            <p className="text-2xl font-black tabular-nums">
              {selectedProduct ? `₦${selectedProduct.price_ngn.toLocaleString("en-NG")}` : "₦0"}
            </p>
          </div>
          <button
            onClick={submit}
            disabled={busy || !selectedProduct}
            className="inline-flex items-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(22,199,132,0.6)] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <Rocket className="h-4 w-4" /> Order Boost
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  accsMarketFetchInventory,
  isAccsMarketConfigured,
} from "@/lib/providers/accsmarket.server";

export type AccountProduct = {
  id: string;
  platform: string;
  category: string;
  subcategory: string;
  name: string;
  description: string;
  age_label: string;
  price_ngn: number;
  stock: number;
  instant: boolean;
  country?: string;
  features: string[];
  tag: string;
};

export type AccountOrder = {
  id: string;
  product_name: string;
  platform: string;
  amount_paid: number;
  status: string;
  created_at: string;
  credentials: {
    username?: string;
    password?: string;
    email?: string;
    extra?: string;
  };
};

const CATEGORY_ORDER = [
  "All",
  "Facebook",
  "Instagram",
  "TikTok",
  "X",
  "Telegram",
  "WhatsApp",
  "Gmail",
  "YouTube",
  "Discord",
  "Snapchat",
  "Reddit",
  "LinkedIn",
  "Threads",
  "Spotify",
  "Audiomack",
  "Boomplay",
  "Apple Music",
  "Netflix",
  "ChatGPT",
  "AI",
  "Proxy",
  "Game Accounts",
  "Other Email",
  "Social Networks",
] as const;

/** Built-in catalog used when ACCS_MARKET API is not configured */
function builtInCatalog(): AccountProduct[] {
  const items: Omit<AccountProduct, "id">[] = [
    { platform: "Instagram", category: "Instagram", subcategory: "Aged", name: "Instagram Aged 2019", description: "Aged IG account, email access included. Softreg style.", age_label: "5 yrs", price_ngn: 4500, stock: 42, instant: true, country: "Mixed", features: ["Email access", "Aged", "Instant delivery"], tag: "IG" },
    { platform: "Instagram", category: "Instagram", subcategory: "With Followers", name: "Instagram 1K–5K Followers", description: "Accounts with organic-looking follower counts.", age_label: "1–2 yrs", price_ngn: 8900, stock: 15, instant: true, country: "US", features: ["1K+ followers", "Email access"], tag: "IG" },
    { platform: "Instagram", category: "Instagram", subcategory: "PVA", name: "Instagram PVA", description: "Phone-verified Instagram accounts.", age_label: "New", price_ngn: 3200, stock: 88, instant: true, country: "US", features: ["PVA", "Instant"], tag: "IG" },
    { platform: "Facebook", category: "Facebook", subcategory: "Aged", name: "Facebook USA Verified", description: "US GEO Facebook profiles, aged and verified.", age_label: "3 yrs", price_ngn: 6800, stock: 18, instant: true, country: "USA", features: ["Verified", "Aged", "Email"], tag: "FB" },
    { platform: "Facebook", category: "Facebook", subcategory: "Softregs", name: "Facebook Softreg", description: "Fresh softreg FB accounts for warming.", age_label: "New", price_ngn: 2100, stock: 120, instant: true, country: "Mixed", features: ["Softreg", "Instant"], tag: "FB" },
    { platform: "Facebook", category: "Facebook", subcategory: "Boosted", name: "Facebook With Friends", description: "Profiles with friends already added.", age_label: "6 mo+", price_ngn: 5500, stock: 24, instant: true, country: "EU", features: ["Friends", "Aged"], tag: "FB" },
    { platform: "Gmail", category: "Gmail", subcategory: "PVA", name: "Gmail PVA + Recovery", description: "Phone-verified Gmail with recovery options.", age_label: "New", price_ngn: 1500, stock: 210, instant: true, country: "US", features: ["PVA", "Recovery", "Instant"], tag: "GM" },
    { platform: "Gmail", category: "Gmail", subcategory: "Aged", name: "Gmail Aged 2018–2020", description: "Older Gmail accounts suitable for verification.", age_label: "4–6 yrs", price_ngn: 2800, stock: 64, instant: true, country: "US", features: ["Aged", "Email only"], tag: "GM" },
    { platform: "TikTok", category: "TikTok", subcategory: "Aged", name: "TikTok Aged EU", description: "EU-registered TikTok accounts.", age_label: "2 yrs", price_ngn: 5200, stock: 27, instant: true, country: "EU", features: ["Aged", "Email access"], tag: "TT" },
    { platform: "TikTok", category: "TikTok", subcategory: "With Followers", name: "TikTok 500+ Followers", description: "TikTok with starter followers.", age_label: "1 yr", price_ngn: 7500, stock: 11, instant: true, country: "US", features: ["Followers", "Email"], tag: "TT" },
    { platform: "X", category: "X", subcategory: "Aged", name: "Twitter/X Aged 2015", description: "Legacy X/Twitter accounts from 2015 era.", age_label: "9 yrs", price_ngn: 9500, stock: 6, instant: true, country: "US", features: ["Very aged", "Email"], tag: "X" },
    { platform: "X", category: "X", subcategory: "PVA", name: "X (Twitter) PVA", description: "Phone-verified X accounts.", age_label: "New", price_ngn: 3800, stock: 40, instant: true, country: "US", features: ["PVA", "Instant"], tag: "X" },
    { platform: "LinkedIn", category: "LinkedIn", subcategory: "PVA", name: "LinkedIn Premium PVA", description: "LinkedIn profiles ready for outreach.", age_label: "1 yr", price_ngn: 7500, stock: 12, instant: true, country: "US", features: ["PVA", "Profile filled"], tag: "LI" },
    { platform: "Telegram", category: "Telegram", subcategory: "Aged", name: "Telegram Aged Numbers", description: "Aged Telegram sessions / accounts.", age_label: "1 yr+", price_ngn: 4200, stock: 33, instant: true, country: "Mixed", features: ["Aged", "Session"], tag: "TG" },
    { platform: "Discord", category: "Discord", subcategory: "Aged", name: "Discord Aged Accounts", description: "Aged Discord accounts with email.", age_label: "2 yrs", price_ngn: 2900, stock: 45, instant: true, country: "US", features: ["Aged", "Email"], tag: "DC" },
    { platform: "Snapchat", category: "Snapchat", subcategory: "PVA", name: "Snapchat PVA", description: "Phone-verified Snapchat accounts.", age_label: "New", price_ngn: 3500, stock: 22, instant: true, country: "US", features: ["PVA"], tag: "SC" },
    { platform: "YouTube", category: "YouTube", subcategory: "Aged", name: "YouTube Aged Channel", description: "Aged YT channels, no strikes.", age_label: "3 yrs", price_ngn: 12000, stock: 8, instant: false, country: "US", features: ["Aged", "Email"], tag: "YT" },
    { platform: "Reddit", category: "Reddit", subcategory: "Aged", name: "Reddit Aged Accounts", description: "Aged Reddit with karma base.", age_label: "2 yrs", price_ngn: 4100, stock: 19, instant: true, country: "US", features: ["Karma", "Aged"], tag: "RD" },
    { platform: "Threads", category: "Threads", subcategory: "Softregs", name: "Threads Softreg", description: "Fresh Threads accounts linked to IG.", age_label: "New", price_ngn: 2600, stock: 30, instant: true, country: "US", features: ["Softreg"], tag: "TH" },
    { platform: "Spotify", category: "Spotify", subcategory: "Aged", name: "Spotify Aged", description: "Aged Spotify accounts.", age_label: "1 yr+", price_ngn: 2200, stock: 50, instant: true, country: "US", features: ["Aged"], tag: "SP" },
    { platform: "Netflix", category: "Netflix", subcategory: "Other", name: "Netflix Shared Plan Slot", description: "Shared plan access — follow delivery notes.", age_label: "Active", price_ngn: 1800, stock: 14, instant: true, country: "NG", features: ["Instant"], tag: "NF" },
    { platform: "ChatGPT", category: "ChatGPT", subcategory: "AI", name: "ChatGPT Plus Account", description: "ChatGPT accounts as available from supplier.", age_label: "Active", price_ngn: 15000, stock: 5, instant: false, country: "US", features: ["Plus"], tag: "AI" },
    { platform: "Proxy", category: "Proxy", subcategory: "Other", name: "Residential Proxy Day Pass", description: "Day pass residential proxy access.", age_label: "1 day", price_ngn: 3500, stock: 100, instant: true, country: "Mixed", features: ["Instant"], tag: "PX" },
    { platform: "Game Accounts", category: "Game Accounts", subcategory: "Other", name: "Starter Game Account Pack", description: "Starter packs — see product notes on delivery.", age_label: "Varies", price_ngn: 5000, stock: 9, instant: false, country: "Mixed", features: ["Games"], tag: "GM" },
    { platform: "WhatsApp", category: "WhatsApp", subcategory: "Aged", name: "WhatsApp Aged Session", description: "Aged WA sessions where available.", age_label: "6 mo+", price_ngn: 6000, stock: 7, instant: false, country: "NG", features: ["Session"], tag: "WA" },
    { platform: "Audiomack", category: "Audiomack", subcategory: "Aged", name: "Audiomack Artist Account", description: "Artist-ready Audiomack accounts.", age_label: "1 yr", price_ngn: 3000, stock: 16, instant: true, country: "NG", features: ["Artist"], tag: "AM" },
    { platform: "Apple Music", category: "Apple Music", subcategory: "Other", name: "Apple Music Account", description: "Apple Music accounts as supplied.", age_label: "Active", price_ngn: 2500, stock: 20, instant: true, country: "US", features: ["Music"], tag: "AP" },
    { platform: "Boomplay", category: "Boomplay", subcategory: "Other", name: "Boomplay Account", description: "Boomplay listener/artist accounts.", age_label: "Active", price_ngn: 2000, stock: 25, instant: true, country: "NG", features: ["Music"], tag: "BP" },
  ];

  return items.map((item, i) => ({
    ...item,
    id: `acc-${item.platform.toLowerCase().replace(/\s+/g, "-")}-${i + 1}`,
  }));
}

async function fetchFromAccsMarket(): Promise<AccountProduct[] | null> {
  // AccsMarket session sync is opt-in (ACCSMARKET_LIVE=1) — login scraping is too heavy for every page view
  if (isAccsMarketConfigured() && process.env.ACCSMARKET_LIVE === "1") {
    try {
      const inv = await accsMarketFetchInventory();
      if (inv.ok && inv.products.length > 0) {
        const rate = Number(process.env.USD_TO_NGN_RATE || 1600);
        const markup = Number(process.env.MARKUP_PERCENTAGE || 1.5);
        const fixed = Number(process.env.FIXED_NGN_MARKUP || 200);
        return inv.products.map((p, i) => ({
          id: `am-${String(p.externalId || i)}`,
          platform: p.category,
          category: p.category,
          subcategory: p.subcategory,
          name: p.name,
          description: p.description || p.name,
          age_label: "Live",
          price_ngn: Math.ceil(Number(p.priceUsd || 0) * rate * markup + fixed),
          stock: Number(p.stock || 0),
          instant: true,
          country: "Mixed",
          features: ["AccsMarket", "Live stock"],
          tag: String(p.category || "AM").slice(0, 2).toUpperCase(),
        }));
      }
    } catch (err) {
      console.error("[accsmarket] session inventory failed", err);
    }
  }


  const apiUrl = process.env.ACCS_MARKET_API_URL?.trim();
  const apiKey = process.env.ACCS_MARKET_API_KEY?.trim();
  if (!apiUrl || !apiKey) return null;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    const list = Array.isArray(json)
      ? json
      : Array.isArray((json as { data?: unknown }).data)
        ? (json as { data: unknown[] }).data
        : Array.isArray((json as { products?: unknown }).products)
          ? (json as { products: unknown[] }).products
          : null;
    if (!list) return null;

    const rate = Number(process.env.USD_TO_NGN_RATE || 1600);
    const markup = Number(process.env.MARKUP_PERCENTAGE || 1.5);
    const fixed = Number(process.env.FIXED_NGN_MARKUP || 200);

    return list.map((raw, i) => {
      const r = raw as Record<string, unknown>;
      const usd = Number(r.price ?? r.price_usd ?? r.cost ?? 0);
      const priceNgn =
        Number(r.price_ngn) ||
        Math.ceil(usd * rate * markup + fixed);
      const platform = String(r.platform ?? r.category ?? r.type ?? "Other");
      return {
        id: String(r.id ?? r.sku ?? `accs-${i}`),
        platform,
        category: String(r.category ?? platform),
        subcategory: String(r.subcategory ?? r.type ?? r.format ?? "Other"),
        name: String(r.name ?? r.title ?? `${platform} Account`),
        description: String(r.description ?? r.desc ?? ""),
        age_label: String(r.age ?? r.age_label ?? r.registered ?? "—"),
        price_ngn: priceNgn,
        stock: Number(r.stock ?? r.quantity ?? r.count ?? 0),
        instant: Boolean(r.instant ?? r.auto_delivery ?? true),
        country: r.country ? String(r.country) : undefined,
        features: Array.isArray(r.features)
          ? (r.features as unknown[]).map(String)
          : [],
        tag: String(r.tag ?? platform.slice(0, 2).toUpperCase()),
      } satisfies AccountProduct;
    });
  } catch {
    return null;
  }
}

export const listAccountCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const products = (await fetchFromAccsMarket()) ?? builtInCatalog();
    const fromProducts = Array.from(new Set(products.map((p) => p.category)));
    const ordered = [
      "All",
      ...CATEGORY_ORDER.filter((c) => c !== "All" && fromProducts.includes(c)),
      ...fromProducts.filter((c) => !(CATEGORY_ORDER as readonly string[]).includes(c)),
    ];
    const subcategories: Record<string, string[]> = {};
    for (const p of products) {
      const list = subcategories[p.category] ?? [];
      if (!list.includes(p.subcategory)) list.push(p.subcategory);
      subcategories[p.category] = list;
    }
    return { categories: ordered, subcategories };
  });

export const listAccountProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<AccountProduct[]> => {
    return (await fetchFromAccsMarket()) ?? builtInCatalog();
  });

const purchaseSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  amount: z.number().min(0),
});

function demoCredentials(product: AccountProduct, index: number) {
  const slug = product.platform.toLowerCase().replace(/\s+/g, "");
  return {
    username: `${slug}_user_${Date.now().toString(36)}_${index}`,
    password: `Vx$${Math.random().toString(36).slice(2, 10)}!`,
    email: `${slug}.${Date.now().toString(36)}@delivered.verxor`,
    extra: product.instant
      ? "Delivered instantly. Change password after login."
      : "Manual delivery — credentials may arrive within a few minutes.",
  };
}

export const purchaseAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => purchaseSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const catalog = (await fetchFromAccsMarket()) ?? builtInCatalog();
    const product = catalog.find((p) => p.id === data.productId);
    if (!product) throw new Error("Product not available");
    if (product.stock < data.quantity) throw new Error("Not enough stock");

    const expected = product.price_ngn * data.quantity;
    if (Math.abs(expected - data.amount) > 1) {
      throw new Error("Price mismatch — refresh and try again");
    }

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError || !wallet) throw new Error("Wallet not found");
    if (Number(wallet.balance) < expected) throw new Error("Insufficient wallet balance");

    const reference = `VXR-LOG-${Date.now().toString(36).toUpperCase()}`;
    const creds = Array.from({ length: data.quantity }, (_, i) =>
      demoCredentials(product, i + 1),
    );

    await supabaseAdmin.rpc("record_wallet_transaction", {
      _user_id: userId,
      _type: "debit",
      _amount: expected,
      _fee: 0,
      _description: `Account log — ${product.name} ×${data.quantity}`,
      _reference: reference,
      _payment_method: "wallet",
      _metadata: {
        kind: "account_log",
        product_id: product.id,
        product_name: product.name,
        platform: product.platform,
        quantity: data.quantity,
        credentials: creds,
        status: product.instant ? "delivered" : "processing",
      },
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Account delivered",
      body: `${product.name} ×${data.quantity} — open Log History for credentials.`,
      type: "order",
    });

    return {
      reference,
      status: product.instant ? "delivered" : "processing",
      credentials: creds,
      product_name: product.name,
      amount_paid: expected,
    };
  });

export const listAccountOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountOrder[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("transactions")
      .select("id, amount, description, metadata, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(`Failed to load orders: ${error.message}`);

    return (data ?? [])
      .filter((t) => {
        const meta = t.metadata as Record<string, unknown> | null;
        return (
          meta?.kind === "account_log" ||
          String(t.description || "").startsWith("Account log")
        );
      })
      .map((t) => {
        const meta = (t.metadata || {}) as Record<string, unknown>;
        const credsList = Array.isArray(meta.credentials)
          ? (meta.credentials as AccountOrder["credentials"][])
          : [];
        const first = credsList[0] || {};
        return {
          id: t.id,
          product_name: String(meta.product_name || t.description || "Account"),
          platform: String(meta.platform || "—"),
          amount_paid: Number(t.amount),
          status: String(meta.status || t.status || "delivered"),
          created_at: t.created_at,
          credentials: {
            username: first.username,
            password: first.password,
            email: first.email,
            extra:
              first.extra ||
              (credsList.length > 1
                ? `${credsList.length} accounts in this order — contact support for bulk export.`
                : undefined),
          },
        };
      });
  });

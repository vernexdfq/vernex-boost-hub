import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  accsMarketFetchInventory,
  isAccsMarketConfigured,
} from "@/lib/providers/accsmarket.server";
import {
  accsZonePurchase,
  getAccsZoneCatalog,
  isAccsZoneConfigured,
  logsRetailPriceNgn,
  stripHtml,
  type AccsZoneListing,
} from "@/lib/providers/accszone.server";

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
  /** Provider metadata (live integrations only) */
  provider?: "accszone" | "accsmarket" | "builtin";
  ad_id?: number;
  price_usd?: number;
  sold?: number;
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

const TAG_RULES: [string, string][] = [
  ["facebook", "FB"],
  ["instagram", "IG"],
  ["tiktok", "TT"],
  ["twitter", "X"],
  [" x ", "X"],
  ["gmail", "GM"],
  ["google", "GM"],
  ["outlook", "OL"],
  ["hotmail", "OL"],
  ["gmx", "GM"],
  ["yahoo", "GM"],
  ["telegram", "TG"],
  ["discord", "DC"],
  ["snapchat", "SC"],
  ["youtube", "YT"],
  ["reddit", "RD"],
  ["linkedin", "LI"],
  ["threads", "TH"],
  ["spotify", "SP"],
  ["netflix", "NF"],
  ["chatgpt", "AI"],
  ["openai", "AI"],
  ["whatsapp", "WA"],
  ["proxy", "PX"],
  ["apple", "AP"],
  ["boomplay", "BP"],
  ["audiomack", "AM"],
];

function tagFor(title: string, fallback: string): string {
  const low = " " + title.toLowerCase() + " ";
  for (const [needle, tag] of TAG_RULES) {
    if (low.includes(needle)) return tag;
  }
  return fallback.slice(0, 2).toUpperCase() || "AC";
}

function normalizeCategoryTitle(title: string): string {
  const cleaned = title
    .replace(/^buy\s+/i, "")
    .replace(/\s+accounts$/i, "")
    .trim();
  return cleaned || title;
}

function accsZoneToListing(l: AccsZoneListing): AccountProduct {
  const category = normalizeCategoryTitle(l.category?.title || "Other");
  const subcategory = l.subcategory?.title || "General";
  const description = stripHtml(l.description || "");
  const priceUsd = Number(l.price) || 0;
  return {
    id: "acz-" + l.id,
    provider: "accszone",
    ad_id: l.id,
    price_usd: priceUsd,
    platform: category,
    category,
    subcategory,
    name: l.title,
    description: description || l.title,
    age_label: subcategory,
    price_ngn: logsRetailPriceNgn(priceUsd),
    stock: Number(l.available_stock) || 0,
    sold: Number(l.sold) || 0,
    instant: true,
    features: [subcategory, "Instant delivery", "Verified supplier"],
    tag: tagFor(l.category?.title || l.title, l.title || "AC"),
  };
}

async function fetchFromAccsZone(): Promise<AccountProduct[] | null> {
  if (!isAccsZoneConfigured()) return null;
  try {
    const listings = await getAccsZoneCatalog();
    if (!listings.length) return null;
    return listings
      .filter((l) => (Number(l.available_stock) || 0) > 0)
      .map(accsZoneToListing);
  } catch (err) {
    console.error("[accszone] catalogue fetch failed", err);
    return null;
  }
}

/** Built-in catalog used when no provider is configured */
function builtInCatalog(): AccountProduct[] {
  const items: Omit<AccountProduct, "id">[] = [
    // Instagram
    { platform: "Instagram", category: "Instagram", subcategory: "Aged", name: "Instagram Aged 2019", description: "Aged IG account, email access included. Softreg style.", age_label: "5 yrs", price_ngn: 4500, stock: 42, sold: 310, instant: true, country: "Mixed", features: ["Email access", "Aged", "Instant delivery"], tag: "IG" },
    { platform: "Instagram", category: "Instagram", subcategory: "Aged", name: "Instagram Aged 2017", description: "Veteran IG account, great for engagement and trust.", age_label: "8 yrs", price_ngn: 9200, stock: 12, sold: 84, instant: true, country: "US", features: ["Email access", "Very aged"], tag: "IG" },
    { platform: "Instagram", category: "Instagram", subcategory: "PVA", name: "Instagram PVA", description: "Phone-verified Instagram accounts.", age_label: "New", price_ngn: 3200, stock: 88, sold: 540, instant: true, country: "US", features: ["PVA", "Instant"], tag: "IG" },
    { platform: "Instagram", category: "Instagram", subcategory: "With Followers", name: "Instagram 1K-5K Followers", description: "Accounts with organic-looking follower counts.", age_label: "1-2 yrs", price_ngn: 8900, stock: 15, sold: 62, instant: true, country: "US", features: ["1K+ followers", "Email access"], tag: "IG" },
    { platform: "Instagram", category: "Instagram", subcategory: "With Followers", name: "Instagram 10K+ Followers", description: "Established accounts with large followings.", age_label: "3+ yrs", price_ngn: 24500, stock: 4, sold: 11, instant: true, country: "US", features: ["10K+ followers", "Email access"], tag: "IG" },
    { platform: "Instagram", category: "Instagram", subcategory: "Softregs", name: "Instagram Softreg", description: "Fresh softreg accounts ready for warming.", age_label: "New", price_ngn: 1800, stock: 150, sold: 720, instant: true, country: "Mixed", features: ["Softreg", "Bulk ready"], tag: "IG" },
    // Facebook
    { platform: "Facebook", category: "Facebook", subcategory: "Aged", name: "Facebook USA Verified", description: "US GEO Facebook profiles, aged and verified.", age_label: "3 yrs", price_ngn: 6800, stock: 18, sold: 190, instant: true, country: "USA", features: ["Verified", "Aged", "Email"], tag: "FB" },
    { platform: "Facebook", category: "Facebook", subcategory: "Aged", name: "Facebook Aged 2016", description: "Old Facebook accounts, ideal for ads and pages.", age_label: "9 yrs", price_ngn: 13500, stock: 7, sold: 43, instant: true, country: "US", features: ["Very aged", "Email access"], tag: "FB" },
    { platform: "Facebook", category: "Facebook", subcategory: "Softregs", name: "Facebook Softreg", description: "Fresh softreg FB accounts for warming.", age_label: "New", price_ngn: 2100, stock: 120, sold: 880, instant: true, country: "Mixed", features: ["Softreg", "Instant"], tag: "FB" },
    { platform: "Facebook", category: "Facebook", subcategory: "Boosted", name: "Facebook With Friends", description: "Profiles with friends already added.", age_label: "6 mo+", price_ngn: 5500, stock: 24, sold: 150, instant: true, country: "EU", features: ["Friends", "Aged"], tag: "FB" },
    { platform: "Facebook", category: "Facebook", subcategory: "PVA", name: "Facebook PVA", description: "Phone-verified Facebook accounts.", age_label: "New", price_ngn: 3600, stock: 65, sold: 410, instant: true, country: "US", features: ["PVA", "Instant"], tag: "FB" },
    // Gmail
    { platform: "Gmail", category: "Gmail", subcategory: "PVA", name: "Gmail PVA + Recovery", description: "Phone-verified Gmail with recovery options.", age_label: "New", price_ngn: 1500, stock: 210, sold: 1250, instant: true, country: "US", features: ["PVA", "Recovery", "Instant"], tag: "GM" },
    { platform: "Gmail", category: "Gmail", subcategory: "Aged", name: "Gmail Aged 2018-2020", description: "Older Gmail accounts suitable for verification.", age_label: "4-6 yrs", price_ngn: 2800, stock: 64, sold: 220, instant: true, country: "US", features: ["Aged", "Email only"], tag: "GM" },
    { platform: "Gmail", category: "Gmail", subcategory: "Fresh", name: "Gmail Fresh Auto", description: "Freshly created Gmail accounts, auto-registered.", age_label: "New", price_ngn: 900, stock: 320, sold: 1600, instant: true, country: "Mixed", features: ["Fresh", "Bulk ready"], tag: "GM" },
    // TikTok
    { platform: "TikTok", category: "TikTok", subcategory: "Aged", name: "TikTok Aged EU", description: "EU-registered TikTok accounts.", age_label: "2 yrs", price_ngn: 5200, stock: 27, sold: 130, instant: true, country: "EU", features: ["Aged", "Email access"], tag: "TT" },
    { platform: "TikTok", category: "TikTok", subcategory: "PVA", name: "TikTok PVA", description: "Phone-verified TikTok accounts.", age_label: "New", price_ngn: 3400, stock: 52, sold: 380, instant: true, country: "US", features: ["PVA", "Instant"], tag: "TT" },
    { platform: "TikTok", category: "TikTok", subcategory: "With Followers", name: "TikTok 500+ Followers", description: "TikTok with starter followers.", age_label: "1 yr", price_ngn: 7500, stock: 11, sold: 40, instant: true, country: "US", features: ["Followers", "Email"], tag: "TT" },
    { platform: "TikTok", category: "TikTok", subcategory: "With Followers", name: "TikTok 5K+ Followers", description: "TikTok accounts with real audience traction.", age_label: "2 yrs", price_ngn: 18500, stock: 3, sold: 9, instant: true, country: "US", features: ["5K+ followers", "Email"], tag: "TT" },
    // X (Twitter)
    { platform: "X", category: "X", subcategory: "Aged", name: "Twitter/X Aged 2015", description: "Legacy X/Twitter accounts from 2015 era.", age_label: "9 yrs", price_ngn: 9500, stock: 6, sold: 22, instant: true, country: "US", features: ["Very aged", "Email"], tag: "X" },
    { platform: "X", category: "X", subcategory: "PVA", name: "X (Twitter) PVA", description: "Phone-verified X accounts.", age_label: "New", price_ngn: 3800, stock: 40, sold: 260, instant: true, country: "US", features: ["PVA", "Instant"], tag: "X" },
    // Telegram
    { platform: "Telegram", category: "Telegram", subcategory: "Aged", name: "Telegram Aged Numbers", description: "Aged Telegram sessions / accounts.", age_label: "1 yr+", price_ngn: 4200, stock: 33, sold: 175, instant: true, country: "Mixed", features: ["Aged", "Session"], tag: "TG" },
    { platform: "Telegram", category: "Telegram", subcategory: "Softregs", name: "Telegram Softreg", description: "Fresh Telegram accounts ready to use.", age_label: "New", price_ngn: 2400, stock: 75, sold: 340, instant: true, country: "Mixed", features: ["Softreg", "Instant"], tag: "TG" },
    // Discord
    { platform: "Discord", category: "Discord", subcategory: "Aged", name: "Discord Aged Accounts", description: "Aged Discord accounts with email.", age_label: "2 yrs", price_ngn: 2900, stock: 45, sold: 230, instant: true, country: "US", features: ["Aged", "Email"], tag: "DC" },
    { platform: "Discord", category: "Discord", subcategory: "PVA", name: "Discord Token PVA", description: "Phone-verified Discord tokens.", age_label: "New", price_ngn: 1900, stock: 95, sold: 610, instant: true, country: "US", features: ["PVA", "Token"], tag: "DC" },
    // Snapchat
    { platform: "Snapchat", category: "Snapchat", subcategory: "PVA", name: "Snapchat PVA", description: "Phone-verified Snapchat accounts.", age_label: "New", price_ngn: 3500, stock: 22, sold: 120, instant: true, country: "US", features: ["PVA"], tag: "SC" },
    { platform: "Snapchat", category: "Snapchat", subcategory: "Aged", name: "Snapchat Aged", description: "Aged Snapchat accounts with history.", age_label: "2 yrs", price_ngn: 5600, stock: 9, sold: 34, instant: true, country: "US", features: ["Aged", "Email"], tag: "SC" },
    // YouTube
    { platform: "YouTube", category: "YouTube", subcategory: "Aged", name: "YouTube Aged Channel", description: "Aged YT channels, no strikes.", age_label: "3 yrs", price_ngn: 12000, stock: 8, sold: 26, instant: false, country: "US", features: ["Aged", "Email"], tag: "YT" },
    { platform: "YouTube", category: "YouTube", subcategory: "Monetized", name: "YouTube Monetized Channel", description: "Monetization-enabled channels, subject to review.", age_label: "1 yr+", price_ngn: 68000, stock: 2, sold: 3, instant: false, country: "US", features: ["Monetized", "Serious buyers"], tag: "YT" },
    // Reddit
    { platform: "Reddit", category: "Reddit", subcategory: "Aged", name: "Reddit Aged Accounts", description: "Aged Reddit with karma base.", age_label: "2 yrs", price_ngn: 4100, stock: 19, sold: 88, instant: true, country: "US", features: ["Karma", "Aged"], tag: "RD" },
    { platform: "Reddit", category: "Reddit", subcategory: "Karma Boost", name: "Reddit High Karma", description: "Accounts with 1K+ combined karma.", age_label: "1 yr+", price_ngn: 6900, stock: 6, sold: 21, instant: true, country: "US", features: ["1K+ karma"], tag: "RD" },
    // LinkedIn
    { platform: "LinkedIn", category: "LinkedIn", subcategory: "PVA", name: "LinkedIn Premium PVA", description: "LinkedIn profiles ready for outreach.", age_label: "1 yr", price_ngn: 7500, stock: 12, sold: 45, instant: true, country: "US", features: ["PVA", "Profile filled"], tag: "LI" },
    { platform: "LinkedIn", category: "LinkedIn", subcategory: "Aged", name: "LinkedIn Aged Connection", description: "Aged LinkedIn with existing connections.", age_label: "4 yrs", price_ngn: 14500, stock: 5, sold: 14, instant: true, country: "US", features: ["Aged", "Connections"], tag: "LI" },
    // Threads
    { platform: "Threads", category: "Threads", subcategory: "Softregs", name: "Threads Softreg", description: "Fresh Threads accounts linked to IG.", age_label: "New", price_ngn: 2600, stock: 30, sold: 95, instant: true, country: "US", features: ["Softreg"], tag: "TH" },
    { platform: "Threads", category: "Threads", subcategory: "Aged", name: "Threads Aged", description: "Early-adopter Threads accounts.", age_label: "1 yr", price_ngn: 4400, stock: 14, sold: 30, instant: true, country: "US", features: ["Aged"], tag: "TH" },
    // WhatsApp
    { platform: "WhatsApp", category: "WhatsApp", subcategory: "Aged", name: "WhatsApp Aged Session", description: "Aged WA sessions where available.", age_label: "6 mo+", price_ngn: 6000, stock: 7, sold: 18, instant: false, country: "NG", features: ["Session"], tag: "WA" },
    { platform: "WhatsApp", category: "WhatsApp", subcategory: "Business", name: "WhatsApp Business API Ready", description: "Business-verified numbers for API onboarding.", age_label: "New", price_ngn: 11000, stock: 4, sold: 6, instant: false, country: "NG", features: ["Business", "API ready"], tag: "WA" },
    // Spotify
    { platform: "Spotify", category: "Spotify", subcategory: "Aged", name: "Spotify Aged", description: "Aged Spotify accounts.", age_label: "1 yr+", price_ngn: 2200, stock: 50, sold: 210, instant: true, country: "US", features: ["Aged"], tag: "SP" },
    { platform: "Spotify", category: "Spotify", subcategory: "Premium", name: "Spotify Premium Upgrade", description: "Premium upgrade applied to your own account.", age_label: "Active", price_ngn: 4800, stock: 25, sold: 130, instant: true, country: "NG", features: ["Premium", "1-3 mo"], tag: "SP" },
    // Netflix
    { platform: "Netflix", category: "Netflix", subcategory: "Shared", name: "Netflix Shared Plan Slot", description: "Shared plan access - follow delivery notes.", age_label: "Active", price_ngn: 1800, stock: 14, sold: 320, instant: true, country: "NG", features: ["Instant"], tag: "NF" },
    { platform: "Netflix", category: "Netflix", subcategory: "Private", name: "Netflix Private Profile", description: "Private profile with own PIN.", age_label: "Active", price_ngn: 4500, stock: 6, sold: 55, instant: true, country: "NG", features: ["Private", "PIN"], tag: "NF" },
    // ChatGPT / AI
    { platform: "ChatGPT", category: "ChatGPT", subcategory: "Plus", name: "ChatGPT Plus Account", description: "ChatGPT Plus subscriptions as available from supplier.", age_label: "Active", price_ngn: 15000, stock: 5, sold: 40, instant: false, country: "US", features: ["Plus"], tag: "AI" },
    { platform: "ChatGPT", category: "ChatGPT", subcategory: "API", name: "OpenAI API Credit Wallet", description: "API-credit funded wallets for developers.", age_label: "Active", price_ngn: 21000, stock: 3, sold: 12, instant: false, country: "US", features: ["API", "Developers"], tag: "AI" },
    // Proxy
    { platform: "Proxy", category: "Proxy", subcategory: "Residential", name: "Residential Proxy Day Pass", description: "Day pass residential proxy access.", age_label: "1 day", price_ngn: 3500, stock: 100, sold: 480, instant: true, country: "Mixed", features: ["Instant"], tag: "PX" },
    { platform: "Proxy", category: "Proxy", subcategory: "Datacenter", name: "Datacenter Proxy Pack", description: "High-speed datacenter IPs, 10 GB bundle.", age_label: "10 GB", price_ngn: 5200, stock: 60, sold: 190, instant: true, country: "Mixed", features: ["Fast", "Bulk"], tag: "PX" },
    // Game Accounts
    { platform: "Game Accounts", category: "Game Accounts", subcategory: "Starter", name: "Starter Game Account Pack", description: "Starter packs - see product notes on delivery.", age_label: "Varies", price_ngn: 5000, stock: 9, sold: 27, instant: false, country: "Mixed", features: ["Games"], tag: "GM" },
    { platform: "Game Accounts", category: "Game Accounts", subcategory: "Premium", name: "Premium Game Account", description: "High-value game accounts, vetted inventory.", age_label: "Varies", price_ngn: 28000, stock: 2, sold: 5, instant: false, country: "Mixed", features: ["Premium", "Vetted"], tag: "GM" },
    // Other Email
    { platform: "Other Email", category: "Other Email", subcategory: "Outlook PVA", name: "Outlook PVA", description: "Phone-verified Outlook/Hotmail accounts.", age_label: "New", price_ngn: 1300, stock: 140, sold: 690, instant: true, country: "US", features: ["PVA", "Instant"], tag: "OL" },
    { platform: "Other Email", category: "Other Email", subcategory: "Outlook Aged", name: "Outlook Aged 2019", description: "Aged Outlook accounts with inbox history.", age_label: "5 yrs", price_ngn: 3100, stock: 22, sold: 76, instant: true, country: "US", features: ["Aged", "Inbox"], tag: "OL" },
    { platform: "Other Email", category: "Other Email", subcategory: "Yahoo", name: "Yahoo PVA", description: "Phone-verified Yahoo mail accounts.", age_label: "New", price_ngn: 1100, stock: 90, sold: 430, instant: true, country: "US", features: ["PVA", "Bulk"], tag: "GM" },
    // Music / NG platforms
    { platform: "Audiomack", category: "Audiomack", subcategory: "Artist", name: "Audiomack Artist Account", description: "Artist-ready Audiomack accounts.", age_label: "1 yr", price_ngn: 3000, stock: 16, sold: 60, instant: true, country: "NG", features: ["Artist"], tag: "AM" },
    { platform: "Audiomack", category: "Audiomack", subcategory: "Listener", name: "Audiomack Listener Account", description: "Listener accounts for streams and saves.", age_label: "New", price_ngn: 1200, stock: 45, sold: 180, instant: true, country: "NG", features: ["Listener", "Bulk"], tag: "AM" },
    { platform: "Boomplay", category: "Boomplay", subcategory: "Artist", name: "Boomplay Artist Account", description: "Boomplay artist accounts for distribution.", age_label: "Active", price_ngn: 3500, stock: 20, sold: 71, instant: true, country: "NG", features: ["Artist"], tag: "BP" },
    { platform: "Boomplay", category: "Boomplay", subcategory: "Listener", name: "Boomplay Listener Account", description: "Boomplay listener accounts for plays.", age_label: "New", price_ngn: 1000, stock: 55, sold: 240, instant: true, country: "NG", features: ["Listener", "Bulk"], tag: "BP" },
    { platform: "Apple Music", category: "Apple Music", subcategory: "Individual", name: "Apple Music Individual", description: "Apple Music individual plan access.", age_label: "Active", price_ngn: 4500, stock: 12, sold: 38, instant: true, country: "US", features: ["Music"], tag: "AP" },
    { platform: "Apple Music", category: "Apple Music", subcategory: "Family", name: "Apple Music Family Slot", description: "Family plan slot on shared Apple Music.", age_label: "Active", price_ngn: 2500, stock: 18, sold: 66, instant: true, country: "NG", features: ["Family slot"], tag: "AP" },
  ];
  ];

  return items.map((item, i) => ({
    ...item,
    provider: "builtin" as const,
    id: "acc-" + item.platform.toLowerCase().replace(/\s+/g, "-") + "-" + (i + 1),
  }));
}

async function fetchFromAccsMarket(): Promise<AccountProduct[] | null> {
  if (isAccsMarketConfigured() && process.env.ACCSMARKET_LIVE === "1") {
    try {
      const inv = await accsMarketFetchInventory();
      if (inv.ok && inv.products.length > 0) {
        const rate = Number(process.env.USD_TO_NGN_RATE || 1600);
        const markup = Number(process.env.MARKUP_PERCENTAGE || 1.5);
        const fixed = Number(process.env.FIXED_NGN_MARKUP || 200);
        return inv.products.map((p, i) => ({
          id: "am-" + String(p.externalId || i),
          provider: "accsmarket" as const,
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
        Authorization: "Bearer " + apiKey,
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
        id: String(r.id ?? r.sku ?? "accs-" + i),
        platform,
        category: String(r.category ?? platform),
        subcategory: String(r.subcategory ?? r.type ?? r.format ?? "Other"),
        name: String(r.name ?? r.title ?? platform + " Account"),
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

/** Provider priority: AccsZone (real API) → AccsMarket → built-in seed. */
async function getCatalog(): Promise<AccountProduct[]> {
  return (await fetchFromAccsZone()) ?? (await fetchFromAccsMarket()) ?? builtInCatalog();
}

export const listAccountCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const products = await getCatalog();
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
    return getCatalog();
  });

const purchaseSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  amount: z.number().min(0),
});

function demoCredentials(product: AccountProduct, index: number) {
  const slug = product.platform.toLowerCase().replace(/\s+/g, "");
  const stamp = Date.now().toString(36);
  return {
    username: slug + "_user_" + stamp + "_" + index,
    password: "Vx$" + Math.random().toString(36).slice(2, 10) + "!",
    email: slug + "." + stamp + "@delivered.verxor",
    extra: product.instant
      ? "Delivered instantly. Change password after login."
      : "Manual delivery — credentials may arrive within a few minutes.",
  };
}

/**
 * Provider credential strings arrive exactly as the supplier provides them
 * (e.g. "email:password" or "email:password:token:client_id"). Keep the raw
 * string in `extra` so nothing is lost, and best-effort split login parts.
 */
type ProviderCred = { username: string; password: string; email?: string; extra: string };

function mapProviderAccount(raw: string): ProviderCred {
  const parts = String(raw).split(":");
  const login = parts[0] || raw;
  return {
    username: login,
    password: parts[1] ?? "",
    email: login.includes("@") ? login : undefined,
    extra: raw,
  };
}

export const purchaseAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => purchaseSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const catalog = await getCatalog();
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

    const isAccsZone = product.provider === "accszone" && product.ad_id != null;
    const reference = isAccsZone
      ? crypto.randomUUID()
      : "VXR-LOG-" + Date.now().toString(36).toUpperCase();

    let creds: ProviderCred[];
    let status: string;
    let providerOrderId: number | undefined;
    let rawAccounts: string[] | undefined;

    if (isAccsZone) {
      // Provider first — AccsZone guarantees no charge on any 4xx failure,
      // and client_reference makes retries idempotent (never buys twice).
      const purchase = await accsZonePurchase(
        product.ad_id as number,
        data.quantity,
        reference,
      );
      rawAccounts = purchase.accounts ?? [];
      providerOrderId = purchase.order_id;
      creds = rawAccounts.map(mapProviderAccount);
      status = "delivered";
    } else {
      creds = Array.from({ length: data.quantity }, (_, i) =>
        demoCredentials(product, i + 1),
      );
      status = product.instant ? "delivered" : "processing";
    }

    await supabaseAdmin.rpc("record_wallet_transaction", {
      _user_id: userId,
      _type: "debit",
      _amount: expected,
      _fee: 0,
      _description: "Account log — " + product.name + " ×" + data.quantity,
      _reference: reference,
      _payment_method: "wallet",
      _metadata: {
        kind: "account_log",
        product_id: product.id,
        product_name: product.name,
        platform: product.platform,
        quantity: data.quantity,
        credentials: creds,
        accounts: rawAccounts,
        provider_order_id: providerOrderId,
        status,
      },
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Account delivered",
      body: product.name + " ×" + data.quantity + " — open Log History for credentials.",
      type: "order",
    });

    return {
      reference,
      status,
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

    if (error) throw new Error("Failed to load orders: " + error.message);

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
                ? String(credsList.length) + " accounts in this order — contact support for bulk export."
                : undefined),
          },
        };
      });
  });
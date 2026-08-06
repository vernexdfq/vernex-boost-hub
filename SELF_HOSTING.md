# Vernex — self-hosting on your own domain (vernex.com.ng)

The "Missing Supabase environment variable(s)" error means your host is running the
app without backend credentials. Fix it by setting the variables below in your
hosting provider's environment settings (Cloudflare Pages → Settings → Variables,
Vercel → Settings → Environment Variables, Replit → Secrets, etc.), then redeploy.

## 1. Point your Supabase project at the app

Your own Supabase project is empty. Before the app can work against it, run every
file in `supabase/migrations/` **in filename order** inside the Supabase SQL Editor:

```
20260801010953_*.sql
20260801011004_*.sql
20260802091015_*.sql
20260802091032_*.sql
20260803012122_*.sql
20260805034708_*.sql
```

That creates: `profiles`, `wallets`, `transactions`, `notifications`,
`number_products`, `number_orders`, `boost_products`, `boost_orders`,
`bank_accounts`, `affiliate_orders`, `rental_numbers`, `rentals`, plus the
`handle_new_user` trigger, `record_wallet_transaction` RPC and all RLS policies.

Existing users, wallets and balances in the Lovable Cloud backend are **not**
copied by this — new project means starting from zero accounts.

## 2. Build-time variables (exposed to the browser — safe)

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://nyaddlzpbdvroxcwcctt.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_lqriWc_fQZYlDafwYIOdyA_RFNfHf_p` |
| `VITE_SUPABASE_PROJECT_ID` | `nyaddlzpbdvroxcwcctt` |

Note: use the **base** URL, not `.../rest/v1/`. These must exist at *build* time —
setting them only at runtime leaves the browser bundle empty.

## 3. Runtime server variables (secret — never expose)

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://nyaddlzpbdvroxcwcctt.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_lqriWc_fQZYlDafwYIOdyA_RFNfHf_p` |
| `SUPABASE_SERVICE_ROLE_KEY` | your **new** secret key (see warning below) |
| `SUPABASE_PROJECT_ID` | `nyaddlzpbdvroxcwcctt` |

`SUPABASE_SERVICE_ROLE_KEY` bypasses all row-level security. It powers signup,
PIN login, virtual-account provisioning and the Flutterwave webhook.

> ⚠️ The secret key `sb_secret_k7on…` was pasted into a chat message. Rotate it in
> Supabase → Project Settings → API Keys before going live, and use the new value here.

## 4. Payments variables

| Name | Where to get it |
| --- | --- |
| `FLW_PUBLIC_KEY` | Flutterwave dashboard → Settings → API |
| `FLW_SECRET_KEY` | Flutterwave dashboard → Settings → API |
| `FLW_ENCRYPTION_KEY` | Flutterwave dashboard → Settings → API |
| `FLW_WEBHOOK_HASH` | Flutterwave → Settings → Webhooks → "Secret hash" |

Webhook URL to register with Flutterwave:

```
https://vernex.com.ng/api/public/webhooks/flutterwave
```

## 5. Verify

After redeploying, open `https://vernex.com.ng/auth` and enter a phone number.
The red "Missing Supabase environment variable(s)" banner should be gone. If it
persists, the host is still building with the old environment — trigger a clean
rebuild rather than a cached redeploy.

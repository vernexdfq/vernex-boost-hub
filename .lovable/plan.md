# Vernex — "Real Fintech" Rebuild Plan

## Goal

Transform Vernex from a template-style demo into a production-grade fintech product that feels like OPAY or Primex: real data, real backend flows, realistic Nigerian copy, and professional code structure. No AI-generated visuals, no placeholder flows.

## Part 1 — Backend (real tables, real records)

### 1.1 Core schema
- `profiles` — keep existing, add `kyc_status` (unverified/pending/verified), `tier` (tier_1/tier_2/tier_3), `bvn_status`, `pin_set` boolean.
- `wallets` — keep existing, add `ledger_balance` (held/pending funds), `currency`, `virtual_account_number`, `virtual_bank_name`, `virtual_account_reference`.
- `transactions` — **new**. Real ledger: `id`, `user_id`, `type` (credit/debit), `status` (pending/success/failed/refunded), `amount`, `fee`, `currency`, `description`, `metadata` (JSONB), `reference`, `payment_method`, `created_at`.
- `number_products` — **new**. Catalog of services we can sell: `service_key`, `service_name`, `country_code`, `country_name`, `server_id`, `provider_cost_usd`, `selling_price_ngn`, `stock_count`, `is_active`.
- `number_orders` — **new**. Real order records: `user_id`, `product_id`, `phone_number`, `otp_code`, `status` (pending/active/received/expired/cancelled/refunded), `amount_paid`, `expires_at`, `created_at`.
- `boost_products` — **new**. SMM catalog: `platform`, `service_type`, `quantity`, `price_ngn`, `provider_cost_ngn`, `is_active`.
- `boost_orders` — **new**. Real order records: `user_id`, `product_id`, `target_url`, `quantity`, `status`, `amount_paid`, `metadata`.
- `bank_accounts` — **new**. User saved withdrawal banks: `user_id`, `bank_code`, `bank_name`, `account_number`, `account_name`.
- `notifications` — **new**. In-app alert system: `user_id`, `title`, `body`, `type`, `read`, `data`.
- `affiliate_orders` — **new**. Requests for reseller sites: `user_id`, `domain`, `domain_ext`, `website_name`, `phone`, `notes`, `status`, `amount`, `created_at`.

### 1.2 RLS & security
- Every user table gets `TO authenticated` GRANT + RLS + owner-scoped policies.
- Service-role only for admin operations.
- No broad `anon` grants.

### 1.3 Triggers / functions
- `handle_new_user()` already exists. Extend it to seed a realistic welcome notification and a default virtual account reference (e.g. `VNX-00000X`).
- `touch_updated_at()` already exists.
- New function: `record_wallet_transaction()` — atomic debit/credit that updates wallet balance and inserts a transaction row in one transaction.

### 1.4 Seed data
- Insert a real Nigerian product catalog (WhatsApp, Telegram, Google, TikTok, etc.) across USA, UK, Nigeria, Russia, India, etc. with realistic NGN prices.
- Insert sample transactions for the demo account only so the dashboard looks live on first login.
- Insert unread notifications for the demo account so the bell icon has meaning.

## Part 2 — Server functions (real business logic)

Create a clean `src/lib/functions/` layer. Each module is thin `createServerFn` wrappers calling helpers.

- `account.functions.ts` — `getMyAccount`, `updateProfile`, `setTransactionPin`, `listMyBanks`, `addBank`, `removeBank`.
- `wallet.functions.ts` — `getWallet`, `fundByTransfer` (creates a pending transaction when webhook arrives, confirmed by admin), `withdrawToBank`, `listTransactions`.
- `numbers.functions.ts` — `listProducts`, `placeNumberOrder`, `cancelNumberOrder`, `listMyNumberOrders`, `getOrderOTP`.
- `boost.functions.ts` — `listBoostProducts`, `placeBoostOrder`, `listMyBoostOrders`.
- `affiliate.functions.ts` — `requestAffiliateSite`, `listMyAffiliateRequests`.
- `notifications.functions.ts` — `getUnreadCount`, `listNotifications`, `markRead`.

All functions use `requireSupabaseAuth` and derive `userId` from `context`, never from client input. Real Zod validation on inputs. Real error handling.

## Part 3 — UI/UX redesign (OPAY-style, no AI look)

### 3.1 Design system
- Keep the app light, but move to a stricter, more "banking" palette: white cards, deep navy (#04113E) wallet banner, emerald (#16C784) accents, slate text.
- Replace generic rounded-2xl with 12px-16px consistent radius.
- Use real transaction iconography, status pills, and data density.
- Typography: tighter, more compact, smaller labels, larger numbers.
- Add skeleton states, empty states, error states, and pull-to-refresh friendly refresh buttons.

### 3.2 Dashboard
- Real wallet card with `ledger_balance` vs available balance, hide toggle, quick fund/history.
- Quick actions grid: 8 items, but with realistic icons and labels (no made-up words).
- **Recent activity**: load from `transactions` table, not static array. Show date, status, amount, payment method.
- **Promo banners**: realistic Nigerian promos (e.g., "Fund ₦5,000+, get 1% bonus").
- Bottom nav: uniform sizing, emerald active state, subtle labels.

### 3.3 Fund Wallet
- Real bank transfer section: dynamic per-user virtual account (from profile/wallet).
- Manual payment confirmation form (upload receipt reference, amount, method) that creates a pending transaction.
- Paystack/Flutterwave card toggle (UI-ready, gated by provider keys).
- Recent funding transactions list.

### 3.4 Virtual Numbers
- Real product catalog from `number_products`.
- Country + service filter, search, price displayed in NGN.
- "Buy Number" flow: deduct wallet, create `number_orders`, show number + countdown + OTP.
- Real order states: waiting, received, expired, refunded.
- Pull-to-refresh or auto-refresh active orders.

### 3.5 Number Orders / Boost Orders
- Real order lists from `number_orders` and `boost_orders`.
- Status pills, retry/refund actions, copy number/OTP.

### 3.6 Affiliate
- Keep the stepped form but persist to `affiliate_orders`.
- Show order history and status.

### 3.7 Profile & Settings
- Real KYC tier display, PIN setup (4 digits with OTP), bank account management, dark/light toggle, sign out.
- Transaction PIN stored hashed in `profiles` (not plaintext).

### 3.8 Landing page
- Keep the landing page but replace generic stats with real-looking trust signals.
- Add session-aware CTA (Sign in / Dashboard).
- Better testimonials, FAQ, and pricing from the actual product catalog.

### 3.9 Notifications
- Real `notifications` table with bell badge count.
- `/alerts` page listing all notifications.

## Part 4 — Realistic content & copy

- Replace "300+ services" with actual service names where possible.
- Replace fake testimonials with believable Nigerian names and scenarios (e.g., "Jide from Lagos uses WhatsApp Business").
- Use real Naira formatting, real dates, real transaction references like `VNX-TRF-8X29P2`.
- Add plausible empty states: "No active orders. Buy a number to start."
- Use Nigerian payment methods: Paga, Monnify, Paystack, Flutterwave, bank transfer.

## Part 5 — Professional code structure

- Move all data fetching into `src/lib/functions/*.functions.ts` and reusable hooks.
- Add `src/lib/validations.ts` with Zod schemas for every form.
- Add `src/lib/format.ts` for currency, dates, references, phone numbers.
- Add `src/components/ui/` shadcn components: skeleton, toast, sheet, dialog, badge, tabs, input, select.
- Add `src/components/loading.tsx` for consistent skeletons.
- Add `src/components/error-fallback.tsx` for real error UI.
- Ensure every route has `errorComponent` and `notFoundComponent`.
- Strict TypeScript types; no `any`.

## Implementation Phases

**Phase 1 — Foundation (this plan)**
- Schema + migrations + seed data
- Server function layer
- Format/validation helpers
- Updated design tokens

**Phase 2 — Core money flow**
- Wallet + transactions
- Fund Wallet redesign
- Transaction history
- Withdrawal (UI + pending transaction)

**Phase 3 — Product marketplace**
- Virtual number catalog + ordering
- Number orders page
- Boost products + orders

**Phase 4 — Account & growth**
- Profile/KYC/PIN
- Notifications
- Affiliate orders
- Landing page polish

## Risks

- Real payment provider integration (Paystack/Flutterwave) requires live API keys and webhooks. We will build the UI and transaction flow but leave the live provider integration as a separate step once keys are available.
- Virtual number provider integration (Text Verified, 5sim) requires provider keys. We will build the order model and UI; live provider calls can be added behind a feature flag.
- Scope is large. I will deliver Phase 1 + 2 first so you can see the wallet and transaction system working before moving to marketplace features.

## Approval request

Approve this plan and I will start with Phase 1: database schema + seed data + server functions + design tokens. You will see a real wallet balance, real transaction history, and a much more polished dashboard in the first update.

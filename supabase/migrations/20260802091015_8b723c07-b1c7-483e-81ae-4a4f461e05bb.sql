-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_status AS ENUM ('pending', 'success', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.kyc_status AS ENUM ('unverified', 'pending', 'verified');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'active', 'received', 'expired', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.affiliate_status AS ENUM ('pending', 'processing', 'live', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status public.kyc_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS tier public.user_tier NOT NULL DEFAULT 'tier_1',
  ADD COLUMN IF NOT EXISTS bvn_status public.kyc_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_set BOOLEAN NOT NULL DEFAULT FALSE;

-- Extend wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS ledger_balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS virtual_account_number TEXT,
  ADD COLUMN IF NOT EXISTS virtual_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS virtual_account_reference TEXT;

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  fee NUMERIC NOT NULL DEFAULT 0 CHECK (fee >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  reference TEXT NOT NULL UNIQUE,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Number products catalog
CREATE TABLE public.number_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT NOT NULL,
  service_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  server_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_cost_usd NUMERIC NOT NULL CHECK (provider_cost_usd >= 0),
  selling_price_ngn NUMERIC NOT NULL CHECK (selling_price_ngn >= 0),
  stock_count INTEGER NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.number_products TO authenticated;
GRANT ALL ON public.number_products TO service_role;
ALTER TABLE public.number_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active number products"
  ON public.number_products FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Number orders
CREATE TABLE public.number_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.number_products(id),
  phone_number TEXT,
  otp_code TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  amount_paid NUMERIC NOT NULL CHECK (amount_paid >= 0),
  provider_order_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.number_orders TO authenticated;
GRANT ALL ON public.number_orders TO service_role;
ALTER TABLE public.number_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own number orders"
  ON public.number_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own number orders"
  ON public.number_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own number orders"
  ON public.number_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Boost products catalog
CREATE TABLE public.boost_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  service_type TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_ngn NUMERIC NOT NULL CHECK (price_ngn >= 0),
  provider_cost_ngn NUMERIC NOT NULL DEFAULT 0 CHECK (provider_cost_ngn >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.boost_products TO authenticated;
GRANT ALL ON public.boost_products TO service_role;
ALTER TABLE public.boost_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active boost products"
  ON public.boost_products FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Boost orders
CREATE TABLE public.boost_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.boost_products(id),
  target_url TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  amount_paid NUMERIC NOT NULL CHECK (amount_paid >= 0),
  provider_order_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.boost_orders TO authenticated;
GRANT ALL ON public.boost_orders TO service_role;
ALTER TABLE public.boost_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boost orders"
  ON public.boost_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own boost orders"
  ON public.boost_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boost orders"
  ON public.boost_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Bank accounts
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bank accounts"
  ON public.bank_accounts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Affiliate orders
CREATE TABLE public.affiliate_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  domain_ext TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  status public.affiliate_status NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.affiliate_orders TO authenticated;
GRANT ALL ON public.affiliate_orders TO service_role;
ALTER TABLE public.affiliate_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own affiliate orders"
  ON public.affiliate_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own affiliate orders"
  ON public.affiliate_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function: atomic wallet credit/debit with transaction record
CREATE OR REPLACE FUNCTION public.record_wallet_transaction(
  _user_id UUID,
  _type public.transaction_type,
  _amount NUMERIC,
  _fee NUMERIC,
  _description TEXT,
  _reference TEXT,
  _payment_method TEXT,
  _metadata JSONB DEFAULT '{}'
) RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.transactions;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  INSERT INTO public.transactions (
    user_id, type, status, amount, fee, currency, description, reference, payment_method, metadata
  ) VALUES (
    _user_id, _type, 'success', _amount, _fee, 'NGN', _description, _reference, _payment_method, _metadata
  ) RETURNING * INTO tx;

  IF _type = 'credit' THEN
    UPDATE public.wallets
      SET balance = balance + _amount,
          updated_at = now()
      WHERE user_id = _user_id;
  ELSIF _type = 'debit' THEN
    UPDATE public.wallets
      SET balance = balance - (_amount + _fee),
          updated_at = now()
      WHERE user_id = _user_id AND balance >= (_amount + _fee);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
  END IF;

  RETURN tx;
END;
$$;

-- Extend handle_new_user to seed virtual account reference and welcome notification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, virtual_account_reference, virtual_bank_name)
  VALUES (
    NEW.id,
    'VNX-' || upper(substring(md5(random()::text) from 1 for 8)),
    'Paga MFB'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    NEW.id,
    'Welcome to Vernex',
    'Fund your wallet and verify your first account in seconds.',
    'welcome'
  );

  RETURN NEW;
END;
$function$;

-- Seed number products
INSERT INTO public.number_products (service_key, service_name, country_code, country_name, server_id, provider, provider_cost_usd, selling_price_ngn, stock_count) VALUES
('whatsapp', 'WhatsApp', 'US', 'United States', 'S1', 'Text Verified', 0.42, 850, 120),
('telegram', 'Telegram', 'US', 'United States', 'S1', 'Text Verified', 0.38, 780, 95),
('openai', 'OpenAI / ChatGPT', 'US', 'United States', 'S1', 'Text Verified', 0.75, 1450, 60),
('tinder', 'Tinder', 'US', 'United States', 'S1', 'Text Verified', 0.65, 1200, 45),
('tiktok', 'TikTok', 'US', 'United States', 'S2', '5Sim', 0.30, 620, 200),
('google', 'Google', 'US', 'United States', 'S2', '5Sim', 0.35, 700, 150),
('instagram', 'Instagram', 'US', 'United States', 'S2', '5Sim', 0.33, 660, 180),
('facebook', 'Facebook', 'US', 'United States', 'S2', '5Sim', 0.36, 720, 140),
('whatsapp', 'WhatsApp', 'GB', 'United Kingdom', 'S3', 'Telnyx', 0.55, 1100, 80),
('telegram', 'Telegram', 'GB', 'United Kingdom', 'S3', 'Telnyx', 0.48, 960, 70),
('google', 'Google', 'GB', 'United Kingdom', 'S3', 'Telnyx', 0.45, 900, 90),
('whatsapp', 'WhatsApp', 'NG', 'Nigeria', 'S4', 'Local SMS', 0.28, 580, 300),
('telegram', 'Telegram', 'NG', 'Nigeria', 'S4', 'Local SMS', 0.25, 520, 300),
('tiktok', 'TikTok', 'NG', 'Nigeria', 'S4', 'Local SMS', 0.20, 420, 400),
('whatsapp', 'WhatsApp', 'RU', 'Russia', 'S5', 'SMS-Activate', 0.35, 700, 110),
('telegram', 'Telegram', 'RU', 'Russia', 'S5', 'SMS-Activate', 0.30, 620, 120),
('openai', 'OpenAI / ChatGPT', 'RU', 'Russia', 'S5', 'SMS-Activate', 0.60, 1200, 55);

-- Seed boost products
INSERT INTO public.boost_products (platform, service_type, quantity, price_ngn, provider_cost_ngn) VALUES
('Instagram', 'Followers', 1000, 3500, 2500),
('Instagram', 'Likes', 1000, 1800, 1200),
('Instagram', 'Views', 5000, 2500, 1700),
('TikTok', 'Followers', 1000, 3200, 2300),
('TikTok', 'Likes', 1000, 1500, 1000),
('TikTok', 'Views', 5000, 2200, 1500),
('Twitter / X', 'Followers', 1000, 4000, 2900),
('Twitter / X', 'Retweets', 1000, 2800, 1900),
('YouTube', 'Subscribers', 1000, 7500, 5500),
('YouTube', 'Views', 5000, 4000, 2800),
('Facebook', 'Page Likes', 1000, 3000, 2100),
('Facebook', 'Post Shares', 1000, 2200, 1500),
('Telegram', 'Members', 1000, 4200, 3000),
('WhatsApp', 'Group Members', 1000, 5000, 3600);

-- Function to create seed demo transactions/notifications for a specific user (used after first sign-in if empty)
CREATE OR REPLACE FUNCTION public.seed_demo_activity(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.transactions WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  PERFORM public.record_wallet_transaction(
    _user_id, 'credit', 5000, 0, 'Welcome bonus credit',
    'VNX-WEL-' || upper(substring(md5(random()::text) from 1 for 6)),
    'promo', '{}'::jsonb
  );

  PERFORM public.record_wallet_transaction(
    _user_id, 'credit', 15000, 0, 'Bank transfer from Access Bank',
    'VNX-TRF-' || upper(substring(md5(random()::text) from 1 for 6)),
    'bank_transfer', '{"bank":"Access Bank","sender":"JIDE OMO"}'::jsonb
  );

  PERFORM public.record_wallet_transaction(
    _user_id, 'debit', 850, 0, 'Virtual number purchase — WhatsApp USA',
    'VNX-ORD-' || upper(substring(md5(random()::text) from 1 for 6)),
    'wallet', '{"service":"WhatsApp","country":"United States"}'::jsonb
  );

  PERFORM public.record_wallet_transaction(
    _user_id, 'debit', 3500, 0, 'Instagram Followers boost — 1,000',
    'VNX-BST-' || upper(substring(md5(random()::text) from 1 for 6)),
    'wallet', '{"platform":"Instagram","quantity":1000}'::jsonb
  );

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES
    (_user_id, 'Welcome bonus credited', '₦5,000 welcome bonus has been added to your wallet.', 'credit'),
    (_user_id, 'Complete your KYC', 'Upgrade to Tier 2 to increase your wallet limits.', 'kyc'),
    (_user_id, 'New feature: Boost orders', 'You can now track all your SMM orders in one place.', 'feature');
END;
$$;

-- Triggers for updated_at (idempotent drop/create)
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS update_number_products_updated_at ON public.number_products;
CREATE TRIGGER update_number_products_updated_at
  BEFORE UPDATE ON public.number_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS update_number_orders_updated_at ON public.number_orders;
CREATE TRIGGER update_number_orders_updated_at
  BEFORE UPDATE ON public.number_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS update_boost_products_updated_at ON public.boost_products;
CREATE TRIGGER update_boost_products_updated_at
  BEFORE UPDATE ON public.boost_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS update_boost_orders_updated_at ON public.boost_orders;
CREATE TRIGGER update_boost_orders_updated_at
  BEFORE UPDATE ON public.boost_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS update_affiliate_orders_updated_at ON public.affiliate_orders;
CREATE TRIGGER update_affiliate_orders_updated_at
  BEFORE UPDATE ON public.affiliate_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

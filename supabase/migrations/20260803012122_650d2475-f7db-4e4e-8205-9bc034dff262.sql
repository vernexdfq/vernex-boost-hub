CREATE TYPE public.rental_number_type AS ENUM ('mobile', 'business');
CREATE TYPE public.rental_status AS ENUM ('active', 'expired', 'cancelled');

CREATE TABLE public.rental_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  country_code text NOT NULL,
  country_name text NOT NULL,
  dial_code text NOT NULL,
  carrier text NOT NULL,
  region_name text,
  area_code text,
  number_type public.rental_number_type NOT NULL DEFAULT 'mobile',
  provider text NOT NULL,
  monthly_price_ngn numeric NOT NULL,
  expires_at timestamptz NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rental_numbers TO authenticated;
GRANT ALL ON public.rental_numbers TO service_role;
ALTER TABLE public.rental_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view available rental numbers"
  ON public.rental_numbers FOR SELECT TO authenticated USING (true);

CREATE TABLE public.rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rental_number_id uuid NOT NULL REFERENCES public.rental_numbers(id),
  plan text NOT NULL,
  amount_paid numeric NOT NULL,
  status public.rental_status NOT NULL DEFAULT 'active',
  auto_renew boolean NOT NULL DEFAULT false,
  renews_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.rentals TO authenticated;
GRANT ALL ON public.rentals TO service_role;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rentals" ON public.rentals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rentals" ON public.rentals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rentals" ON public.rentals FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_rental_numbers_country ON public.rental_numbers (country_code, is_available);
CREATE INDEX idx_rental_numbers_area ON public.rental_numbers (area_code);
CREATE INDEX idx_rentals_user ON public.rentals (user_id, created_at DESC);

CREATE TRIGGER touch_rental_numbers BEFORE UPDATE ON public.rental_numbers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_rentals BEFORE UPDATE ON public.rentals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.rental_numbers (phone_number, country_code, country_name, dial_code, carrier, region_name, area_code, number_type, provider, monthly_price_ngn, expires_at) VALUES
('+43 660 1204 881','AT','Austria','+43','A1 Telekom','Vienna','660','mobile','5Sim',24500,'2026-10-08'),
('+43 664 3391 027','AT','Austria','+43','Magenta','Graz','664','mobile','Grizzly SMS',23800,'2026-11-14'),
('+43 720 883 114','AT','Austria','+43','Drei','Linz','720','business','Telnyx',31500,'2026-12-01'),
('+1 416 555 0182','CA','Canada','+1','Rogers','Ontario','416','mobile','TextVerified',26500,'2026-10-08'),
('+1 604 555 0117','CA','Canada','+1','Telus','British Columbia','604','mobile','Hero SMS',25900,'2026-09-27'),
('+1 438 555 0904','CA','Canada','+1','Bell','Quebec','438','business','Telnyx',33200,'2027-01-19'),
('+972 54 883 4410','IL','Israel','+972','Cellcom','Tel Aviv','54','mobile','5Sim',28900,'2026-10-30'),
('+972 52 771 0093','IL','Israel','+972','Partner','Haifa','52','mobile','Smsbuyz',27400,'2026-11-22'),
('+44 7700 900021','GB','United Kingdom','+44','EE','England','7700','mobile','TextVerified',22500,'2026-10-08'),
('+44 7911 123842','GB','United Kingdom','+44','Vodafone','Scotland','7911','mobile','Grizzly SMS',21900,'2026-12-12'),
('+44 20 7946 0333','GB','United Kingdom','+44','BT','London','20','business','Telnyx',34800,'2027-02-03'),
('+1 213 555 0146','US','United States','+1','AT&T','California','213','mobile','TextVerified',24900,'2026-10-08'),
('+1 424 555 0771','US','United States','+1','T-Mobile','California','424','mobile','Hero SMS',24900,'2026-11-05'),
('+1 658 555 0230','US','United States','+1','Verizon','Alabama','658','mobile','Smsbuyz',23600,'2026-10-19'),
('+1 205 555 0488','US','United States','+1','AT&T','Alabama','205','mobile','5Sim',23600,'2026-12-24'),
('+1 305 555 0912','US','United States','+1','T-Mobile','Florida','305','mobile','Grizzly SMS',25300,'2026-11-30'),
('+1 786 555 0644','US','United States','+1','Verizon','Florida','786','business','Telnyx',35600,'2027-03-11'),
('+1 512 555 0327','US','United States','+1','AT&T','Texas','512','mobile','TextVerified',24100,'2026-10-08'),
('+1 646 555 0159','US','United States','+1','Verizon','New York','646','mobile','Hero SMS',26800,'2027-01-08'),
('+1 312 555 0743','US','United States','+1','T-Mobile','Illinois','312','business','Telnyx',32900,'2026-12-16'),
('+1 206 555 0398','US','United States','+1','T-Mobile','Washington','206','mobile','Smsbuyz',24400,'2026-11-02'),
('+1 702 555 0865','US','United States','+1','AT&T','Nevada','702','mobile','5Sim',23900,'2026-10-08');
-- Child panels: wholesale partners (e.g. Vernex Digital) managed from Verxor admin.
CREATE TABLE IF NOT EXISTS public.child_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  phone text,
  email text,
  wallet_balance numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.child_panels TO service_role;
REVOKE ALL ON public.child_panels FROM anon, authenticated;
ALTER TABLE public.child_panels ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER child_panels_touch
BEFORE UPDATE ON public.child_panels
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Manual wallet adjustments audit log
CREATE TABLE IF NOT EXISTS public.child_panel_wallet_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  panel_id uuid NOT NULL REFERENCES public.child_panels(id) ON DELETE CASCADE,
  kind text NOT NULL,
  amount numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.child_panel_wallet_logs TO service_role;
REVOKE ALL ON public.child_panel_wallet_logs FROM anon, authenticated;
ALTER TABLE public.child_panel_wallet_logs ENABLE ROW LEVEL SECURITY;

-- Seed the existing child panel
INSERT INTO public.child_panels (name, slug, status, notes)
VALUES ('Vernex Digital', 'vernexdigital', 'active', 'Vernex Digital child panel')
ON CONFLICT (slug) DO NOTHING;

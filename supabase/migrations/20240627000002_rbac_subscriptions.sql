-- =============================================================================
-- NOVAKAM – Migration 001 : RBAC, Abonnements, Caisses, Magasins, Employés
-- =============================================================================
-- Exécuter dans Supabase SQL Editor ou via `supabase db push`
-- =============================================================================

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.plan AS ENUM ('free', 'starter', 'business', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'manager', 'cashier', 'storekeeper', 'accountant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.register_status AS ENUM ('active', 'inactive', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.warehouse_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.employee_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mise à jour du type user_role existant pour ajouter les nouveaux rôles
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'storekeeper';

-- ── Table: shops ──────────────────────────────────────────────────────────────
-- Ajout du champ plan avec le nouvel enum
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS plan public.plan DEFAULT 'free';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Douala';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ── Table: user_shops ─────────────────────────────────────────────────────────
-- Ajout de la colonne role (Enum) pour simplifier les requêtes RLS
ALTER TABLE public.user_shops ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'cashier';

-- ── Table: subscriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  plan public.plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  trial_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  monthly_price INTEGER NOT NULL DEFAULT 0, -- En FCFA
  currency TEXT NOT NULL DEFAULT 'XAF',
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

-- ── Table: employees ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'cashier',
  pin TEXT, -- PIN hashé pour connexion caisse
  status public.employee_status NOT NULL DEFAULT 'active',
  hired_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Table: registers (Caisses) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  status public.register_status NOT NULL DEFAULT 'active',
  assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, code)
);

-- ── Table: warehouses (Magasins) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  status public.warehouse_status NOT NULL DEFAULT 'active',
  is_default BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, code)
);

-- ── Table: subscription_limits (vue calculée) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_limits (
  plan public.plan PRIMARY KEY,
  max_shops INTEGER NOT NULL DEFAULT 1,
  max_registers_per_shop INTEGER NOT NULL DEFAULT 1,
  max_employees INTEGER NOT NULL DEFAULT 2,
  max_products INTEGER NOT NULL DEFAULT 100, -- -1 = illimité
  max_warehouses_per_shop INTEGER NOT NULL DEFAULT 1,
  has_advanced_reports BOOLEAN NOT NULL DEFAULT false,
  has_api_access BOOLEAN NOT NULL DEFAULT false,
  has_export BOOLEAN NOT NULL DEFAULT false,
  has_credits BOOLEAN NOT NULL DEFAULT false,
  has_suppliers BOOLEAN NOT NULL DEFAULT false,
  has_priority_support BOOLEAN NOT NULL DEFAULT false,
  has_custom_branding BOOLEAN NOT NULL DEFAULT false,
  has_sla BOOLEAN NOT NULL DEFAULT false
);

-- Insertion des limites par plan
INSERT INTO public.subscription_limits VALUES
  ('free',       1,  1,  2,   100, 1,  false, false, false, false, false, false, false, false),
  ('starter',    1,  2,  5,   500, 2,  false, false, true,  false, false, false, false, false),
  ('business',   2,  5,  15,  -1,  5,  true,  false, true,  true,  true,  true,  false, false),
  ('pro',        5,  10, 50,  -1,  10, true,  true,  true,  true,  true,  true,  true,  false),
  ('enterprise', -1, -1, -1,  -1,  -1, true,  true,  true,  true,  true,  true,  true,  true)
ON CONFLICT (plan) DO UPDATE SET
  max_shops = EXCLUDED.max_shops,
  max_registers_per_shop = EXCLUDED.max_registers_per_shop,
  max_employees = EXCLUDED.max_employees,
  max_products = EXCLUDED.max_products,
  max_warehouses_per_shop = EXCLUDED.max_warehouses_per_shop,
  has_advanced_reports = EXCLUDED.has_advanced_reports,
  has_api_access = EXCLUDED.has_api_access,
  has_export = EXCLUDED.has_export,
  has_credits = EXCLUDED.has_credits,
  has_suppliers = EXCLUDED.has_suppliers,
  has_priority_support = EXCLUDED.has_priority_support,
  has_custom_branding = EXCLUDED.has_custom_branding,
  has_sla = EXCLUDED.has_sla;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_shop_id ON public.subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_employees_shop_id ON public.employees(shop_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_registers_shop_id ON public.registers(shop_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_shop_id ON public.warehouses(shop_id);

-- ── Triggers updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_registers_updated_at ON public.registers;
CREATE TRIGGER trg_registers_updated_at
  BEFORE UPDATE ON public.registers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_warehouses_updated_at ON public.warehouses;
CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Trigger: Auto-créer abonnement FREE lors de la création d'une boutique ────
CREATE OR REPLACE FUNCTION public.create_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (shop_id, plan, status, monthly_price)
  VALUES (NEW.id, 'free', 'active', 0)
  ON CONFLICT (shop_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_shop_subscription ON public.shops;
CREATE TRIGGER trg_new_shop_subscription
  AFTER INSERT ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.create_free_subscription();

-- ── Trigger: Auto-créer magasin principal lors de la création d'une boutique ──
CREATE OR REPLACE FUNCTION public.create_default_warehouse()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.warehouses (shop_id, name, code, is_default)
  VALUES (NEW.id, 'Magasin Principal', 'MAIN', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_shop_warehouse ON public.shops;
CREATE TRIGGER trg_new_shop_warehouse
  AFTER INSERT ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.create_default_warehouse();

-- ── Fonction: Vérifier une limite d'abonnement ────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_subscription_limit(
  p_shop_id UUID,
  p_resource TEXT
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, max_allowed INTEGER, plan TEXT) AS $$
DECLARE
  v_plan public.plan;
  v_limits public.subscription_limits%ROWTYPE;
  v_count INTEGER;
  v_max INTEGER;
BEGIN
  -- Récupérer le plan de la boutique
  SELECT s.plan INTO v_plan FROM public.shops s WHERE s.id = p_shop_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shop not found'; END IF;

  -- Récupérer les limites du plan
  SELECT * INTO v_limits FROM public.subscription_limits sl WHERE sl.plan = v_plan;

  -- Compter selon la ressource
  CASE p_resource
    WHEN 'employees' THEN
      SELECT COUNT(*) INTO v_count FROM public.employees
        WHERE shop_id = p_shop_id AND status = 'active';
      v_max := v_limits.max_employees;
    WHEN 'registers' THEN
      SELECT COUNT(*) INTO v_count FROM public.registers
        WHERE shop_id = p_shop_id AND status = 'active';
      v_max := v_limits.max_registers_per_shop;
    WHEN 'warehouses' THEN
      SELECT COUNT(*) INTO v_count FROM public.warehouses
        WHERE shop_id = p_shop_id AND status = 'active';
      v_max := v_limits.max_warehouses_per_shop;
    WHEN 'products' THEN
      SELECT COUNT(*) INTO v_count FROM public.products
        WHERE shop_id = p_shop_id AND is_deleted = false;
      v_max := v_limits.max_products;
    ELSE RAISE EXCEPTION 'Unknown resource: %', p_resource;
  END CASE;

  RETURN QUERY SELECT
    (v_max = -1 OR v_count < v_max),
    v_count::INTEGER,
    v_max::INTEGER,
    v_plan::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RLS — Row Level Security ──────────────────────────────────────────────────

-- Helper: get_user_shop_ids
CREATE OR REPLACE FUNCTION public.get_user_shop_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(shop_id) FROM public.user_shops
  WHERE user_id = auth.uid() AND is_deleted = false;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_members_read_subscription" ON public.subscriptions;
CREATE POLICY "shop_members_read_subscription" ON public.subscriptions
  FOR SELECT USING (shop_id = ANY(public.get_user_shop_ids()));

DROP POLICY IF EXISTS "owner_manage_subscription" ON public.subscriptions;
CREATE POLICY "owner_manage_subscription" ON public.subscriptions
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.user_shops
      WHERE user_id = auth.uid() AND role = 'owner' AND is_deleted = false
    )
  );

-- employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_members_read_employees" ON public.employees;
CREATE POLICY "shop_members_read_employees" ON public.employees
  FOR SELECT USING (shop_id = ANY(public.get_user_shop_ids()));

DROP POLICY IF EXISTS "owner_admin_manage_employees" ON public.employees;
CREATE POLICY "owner_admin_manage_employees" ON public.employees
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.user_shops
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_deleted = false
    )
  );

-- registers
ALTER TABLE public.registers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_members_read_registers" ON public.registers;
CREATE POLICY "shop_members_read_registers" ON public.registers
  FOR SELECT USING (shop_id = ANY(public.get_user_shop_ids()));

DROP POLICY IF EXISTS "owner_admin_manage_registers" ON public.registers;
CREATE POLICY "owner_admin_manage_registers" ON public.registers
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.user_shops
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_deleted = false
    )
  );

-- warehouses
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_members_read_warehouses" ON public.warehouses;
CREATE POLICY "shop_members_read_warehouses" ON public.warehouses
  FOR SELECT USING (shop_id = ANY(public.get_user_shop_ids()));

DROP POLICY IF EXISTS "owner_admin_manage_warehouses" ON public.warehouses;
CREATE POLICY "owner_admin_manage_warehouses" ON public.warehouses
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.user_shops
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_deleted = false
    )
  );

-- subscription_limits: lecture publique (pas de données sensibles)
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_limits" ON public.subscription_limits;
CREATE POLICY "public_read_limits" ON public.subscription_limits
  FOR SELECT USING (true);

-- ── Subscriptions existantes pour boutiques déjà créées ───────────────────────
INSERT INTO public.subscriptions (shop_id, plan, status, monthly_price)
SELECT id, COALESCE(plan, 'free'), 'active', 0
FROM public.shops
WHERE id NOT IN (SELECT shop_id FROM public.subscriptions)
ON CONFLICT DO NOTHING;

-- ── TERMINÉ ──────────────────────────────────────────────────────────────────
-- Copiez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- et exécutez-le pour appliquer la migration.

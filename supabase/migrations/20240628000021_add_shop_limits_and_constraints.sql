-- =============================================================================
-- NOVAKAM – Migration 021 : Limites Strictes, Codes d'Activation, Contraintes
-- =============================================================================

-- ── 1. Contraintes Uniques ───────────────────────────────────────────────────
-- Éviter les doublons de noms de boutiques (insensible à la casse)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_name_unique ON public.shops (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_slug_unique ON public.shops (LOWER(slug));

-- ── 2. Activation Codes ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.activation_status AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING', 'CANCELLED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  plan public.plan NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  status public.activation_status NOT NULL DEFAULT 'ACTIVE',
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Historique d'Abonnements ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  plan public.plan NOT NULL,
  activation_code_id UUID REFERENCES public.activation_codes(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'activated', 'renewed', 'expired', 'downgraded'
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Seuls les admins (roles spécifiques) gèrent les codes, lecture publique pour vérification
CREATE POLICY "Public read active codes" ON public.activation_codes
  FOR SELECT USING (status = 'ACTIVE');

CREATE POLICY "Shop owners read their history" ON public.subscription_history
  FOR SELECT USING (
    shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── 4. Triggers de Sécurité Strictes (Quotas) ────────────────────────────────

-- Fonction générique pour bloquer si dépassement
CREATE OR REPLACE FUNCTION public.enforce_subscription_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_plan public.plan;
  v_limits public.subscription_limits%ROWTYPE;
  v_count INTEGER;
  v_max INTEGER;
  v_shop_id UUID;
BEGIN
  -- Déterminer le shop_id selon la table
  IF TG_TABLE_NAME = 'shops' THEN
    v_shop_id := NEW.id; -- exception pour shops
  ELSE
    v_shop_id := NEW.shop_id;
  END IF;

  -- Obtenir le plan (si shops, c'est direct, sinon jointure via shops)
  IF TG_TABLE_NAME = 'shops' THEN
    -- Un owner peut créer max X shops
    SELECT COUNT(*) INTO v_count FROM public.shops WHERE owner_id = NEW.owner_id;
    -- Le owner a un plan maximum parmi ses shops existants, par défaut 'free'
    SELECT COALESCE(MAX(plan), 'free') INTO v_plan FROM public.shops WHERE owner_id = NEW.owner_id;
  ELSE
    SELECT plan INTO v_plan FROM public.shops WHERE id = v_shop_id;
  END IF;

  IF v_plan IS NULL THEN v_plan := 'free'; END IF;

  -- Obtenir les limites du plan
  SELECT * INTO v_limits FROM public.subscription_limits sl WHERE sl.plan = v_plan;

  -- Vérifier selon la table
  CASE TG_TABLE_NAME
    WHEN 'shops' THEN
      v_max := v_limits.max_shops;
      IF v_max != -1 AND v_count >= v_max THEN
        RAISE EXCEPTION 'Quota atteint : Vous ne pouvez pas créer plus de % boutique(s) avec le forfait %.', v_max, UPPER(v_plan::TEXT);
      END IF;

    WHEN 'employees' THEN
      SELECT COUNT(*) INTO v_count FROM public.employees WHERE shop_id = v_shop_id AND status = 'active';
      v_max := v_limits.max_employees;
      IF v_max != -1 AND v_count >= v_max THEN
        RAISE EXCEPTION 'Quota atteint : Vous ne pouvez pas avoir plus de % employé(s) avec le forfait %.', v_max, UPPER(v_plan::TEXT);
      END IF;

    WHEN 'registers' THEN
      SELECT COUNT(*) INTO v_count FROM public.registers WHERE shop_id = v_shop_id AND status = 'active';
      v_max := v_limits.max_registers_per_shop;
      IF v_max != -1 AND v_count >= v_max THEN
        RAISE EXCEPTION 'Quota atteint : Vous ne pouvez pas avoir plus de % caisse(s) avec le forfait %.', v_max, UPPER(v_plan::TEXT);
      END IF;

    WHEN 'warehouses' THEN
      SELECT COUNT(*) INTO v_count FROM public.warehouses WHERE shop_id = v_shop_id AND status = 'active';
      v_max := v_limits.max_warehouses_per_shop;
      IF v_max != -1 AND v_count >= v_max THEN
        RAISE EXCEPTION 'Quota atteint : Vous ne pouvez pas avoir plus de % magasin(s) avec le forfait %.', v_max, UPPER(v_plan::TEXT);
      END IF;

    WHEN 'products' THEN
      -- Vérification basique des produits
      SELECT COUNT(*) INTO v_count FROM public.products WHERE shop_id = v_shop_id AND is_deleted = false;
      v_max := v_limits.max_products;
      IF v_max != -1 AND v_count >= v_max THEN
        RAISE EXCEPTION 'Quota atteint : Vous ne pouvez pas avoir plus de % produit(s) avec le forfait %.', v_max, UPPER(v_plan::TEXT);
      END IF;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attacher le trigger aux tables
DROP TRIGGER IF EXISTS enforce_limits_shops ON public.shops;
CREATE TRIGGER enforce_limits_shops BEFORE INSERT ON public.shops FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limits();

DROP TRIGGER IF EXISTS enforce_limits_employees ON public.employees;
CREATE TRIGGER enforce_limits_employees BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limits();

DROP TRIGGER IF EXISTS enforce_limits_registers ON public.registers;
CREATE TRIGGER enforce_limits_registers BEFORE INSERT ON public.registers FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limits();

DROP TRIGGER IF EXISTS enforce_limits_warehouses ON public.warehouses;
CREATE TRIGGER enforce_limits_warehouses BEFORE INSERT ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limits();

-- (La table products n'existe peut-être pas avec le champ shop_id/is_deleted tel quel, on la liera si nécessaire)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        DROP TRIGGER IF EXISTS enforce_limits_products ON public.products;
        CREATE TRIGGER enforce_limits_products BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limits();
    END IF;
END $$;

-- =============================================================================
-- NOVAKAM – Migration 006 : Consolidation Schema & Licences Bêta
-- =============================================================================

-- 1. Nettoyage de user_shops et roles
ALTER TABLE public.user_shops ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'owner';

-- Supprimer la contrainte de clé étrangère vers `roles` si elle existe (dépend du nom généré)
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'user_shops' AND constraint_type = 'FOREIGN KEY' AND constraint_name LIKE '%role%';
    
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.user_shops DROP CONSTRAINT ' || fk_name;
    END IF;
END $$;

ALTER TABLE public.user_shops DROP COLUMN IF EXISTS role_id;
DROP TABLE IF EXISTS public.roles CASCADE;

-- 2. Unification des fonctions de RLS
DROP FUNCTION IF EXISTS public.get_user_shop_ids() CASCADE;

CREATE OR REPLACE FUNCTION public.get_my_shops()
RETURNS UUID[] AS $$
    SELECT ARRAY(
        SELECT shop_id FROM public.user_shops 
        WHERE user_id = auth.uid() AND is_deleted = false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Mise à jour des policies RLS de subscriptions, employees, registers, warehouses
-- Subscriptions
DROP POLICY IF EXISTS "shop_members_read_subscription" ON public.subscriptions;
CREATE POLICY "shop_members_read_subscription" ON public.subscriptions
  FOR SELECT USING (shop_id = ANY(public.get_my_shops()));

DROP POLICY IF EXISTS "owner_manage_subscription" ON public.subscriptions;
CREATE POLICY "owner_manage_subscription" ON public.subscriptions
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.user_shops
      WHERE user_id = auth.uid() AND role = 'owner' AND is_deleted = false
    )
  );

-- Employees
DROP POLICY IF EXISTS "shop_members_read_employees" ON public.employees;
CREATE POLICY "shop_members_read_employees" ON public.employees
  FOR SELECT USING (shop_id = ANY(public.get_my_shops()));

DROP POLICY IF EXISTS "owner_admin_manage_employees" ON public.employees;
CREATE POLICY "owner_admin_manage_employees" ON public.employees
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.user_shops
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_deleted = false
    )
  );

-- Registers
DROP POLICY IF EXISTS "shop_members_read_registers" ON public.registers;
CREATE POLICY "shop_members_read_registers" ON public.registers
  FOR SELECT USING (shop_id = ANY(public.get_my_shops()));

DROP POLICY IF EXISTS "owner_admin_manage_registers" ON public.registers;
CREATE POLICY "owner_admin_manage_registers" ON public.registers
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.user_shops
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_deleted = false
    )
  );

-- Warehouses
DROP POLICY IF EXISTS "shop_members_read_warehouses" ON public.warehouses;
CREATE POLICY "shop_members_read_warehouses" ON public.warehouses
  FOR SELECT USING (shop_id = ANY(public.get_my_shops()));

DROP POLICY IF EXISTS "owner_admin_manage_warehouses" ON public.warehouses;
CREATE POLICY "owner_admin_manage_warehouses" ON public.warehouses
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.user_shops
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_deleted = false
    )
  );

-- 4. Système de Licences Bêta (activation_codes)
DO $$ BEGIN
  CREATE TYPE public.activation_code_status AS ENUM ('active', 'used', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    plan public.plan NOT NULL,
    validity_days INTEGER NOT NULL DEFAULT 30,
    max_activations INTEGER NOT NULL DEFAULT 1,
    remaining_activations INTEGER NOT NULL DEFAULT 1,
    status public.activation_code_status NOT NULL DEFAULT 'active',
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_activated_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historique des activations par boutique
CREATE TABLE IF NOT EXISTS public.shop_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    activation_code_id UUID NOT NULL REFERENCES public.activation_codes(id) ON DELETE CASCADE,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Triggers pour updated_at (utilise une fonction existante public.handle_updated_at() ou set_updated_at() définie dans 001)
-- Check si handle_updated_at existe sinon creer
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activation_codes_updated_at ON public.activation_codes;
CREATE TRIGGER trg_activation_codes_updated_at
  BEFORE UPDATE ON public.activation_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS pour activation_codes (Lecture seule pour l'utilisateur, admin pour écriture)
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_active_codes" ON public.activation_codes;
CREATE POLICY "public_read_active_codes" ON public.activation_codes
  FOR SELECT USING (status = 'active');

ALTER TABLE public.shop_activations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_members_read_activations" ON public.shop_activations;
CREATE POLICY "shop_members_read_activations" ON public.shop_activations
  FOR SELECT USING (shop_id = ANY(public.get_my_shops()));

-- 5. RPC function pour activer une licence
CREATE OR REPLACE FUNCTION public.activate_license(p_shop_id UUID, p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_code_record public.activation_codes%ROWTYPE;
    v_shop_role public.user_role;
BEGIN
    -- 1. Vérifier si l'utilisateur est admin ou owner de la boutique
    SELECT role INTO v_shop_role FROM public.user_shops 
    WHERE shop_id = p_shop_id AND user_id = auth.uid() AND is_deleted = false;
    
    IF v_shop_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Vous n''avez pas la permission d''activer une licence pour cette boutique.';
    END IF;

    -- 2. Chercher le code
    SELECT * INTO v_code_record FROM public.activation_codes 
    WHERE code = p_code AND status = 'active' AND remaining_activations > 0;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Code d''activation invalide, expiré ou épuisé.';
    END IF;

    -- 3. Mettre à jour l'abonnement
    UPDATE public.subscriptions 
    SET plan = v_code_record.plan,
        status = 'active',
        current_period_end = now() + (v_code_record.validity_days || ' days')::interval,
        payment_method = 'activation_code_' || p_code,
        updated_at = now()
    WHERE shop_id = p_shop_id;

    -- 4. Ajouter l'historique
    INSERT INTO public.shop_activations (shop_id, activation_code_id, expires_at)
    VALUES (p_shop_id, v_code_record.id, now() + (v_code_record.validity_days || ' days')::interval);

    -- 5. Décrémenter les activations du code
    UPDATE public.activation_codes
    SET remaining_activations = remaining_activations - 1,
        first_activated_at = COALESCE(first_activated_at, now()),
        last_used_at = now(),
        status = CASE WHEN (remaining_activations - 1) <= 0 THEN 'used'::public.activation_code_status ELSE status END
    WHERE id = v_code_record.id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

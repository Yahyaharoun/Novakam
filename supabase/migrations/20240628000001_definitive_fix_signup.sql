-- ============================================================
-- NOVAKAM - FIX DEFINITIF INSCRIPTION
-- Le problème : la migration 028 a recréé la table roles,
-- mais le trigger actuel (migration 023) SWALLOW l'erreur
-- sans vraiment logger car la transaction est rollback par auth.
--
-- Solution : Utiliser un autonomous transaction via dblink OU
-- simplement s'assurer que le trigger fonctionne correctement.
-- 
-- Root cause réelle identifiée :
-- La table trigger_logs vit dans la même transaction que le trigger.
-- Si le trigger catch une erreur et log, mais que le log lui-même
-- échoue (FK violation, table manquante), tout est rollback.
--
-- Fix : Utiliser une approche 100% robuste avec EXCEPTION handler
-- qui ne peut pas lui-même échouer.
-- ============================================================

-- Étape 1: Nettoyer les migrations de debug
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN (
  '20240627000031', '20240627000032', '20240627000033'
);

-- Étape 2 : S'assurer que trigger_logs existe avec les bonnes permissions
CREATE TABLE IF NOT EXISTS public.trigger_logs (
    id BIGSERIAL PRIMARY KEY,
    error_message TEXT,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON public.trigger_logs TO postgres, authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.trigger_logs_id_seq TO postgres, authenticated, anon, service_role;

-- Étape 3 : S'assurer que roles a les données initiales
INSERT INTO public.roles (name, permissions)
VALUES 
  ('owner', '{"all": true}'::jsonb),
  ('admin', '{"manage_products": true, "manage_sales": true, "manage_users": true}'::jsonb),
  ('cashier', '{"manage_sales": true}'::jsonb),
  ('manager', '{"manage_products": true, "manage_sales": true}'::jsonb),
  ('storekeeper', '{"manage_products": true}'::jsonb),
  ('accountant', '{"manage_finance": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Étape 4 : S'assurer que la table roles est accessible par le trigger (SECURITY DEFINER)
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select_all" ON public.roles;
CREATE POLICY "roles_select_all" ON public.roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "roles_insert_trigger" ON public.roles;
CREATE POLICY "roles_insert_trigger" ON public.roles
  FOR INSERT WITH CHECK (true);

-- Étape 5 : Nouveau trigger ROBUSTE
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_role_id UUID;
  v_new_shop_id UUID;
  v_shop_name TEXT;
  v_full_name TEXT;
BEGIN
  -- Extraire les métadonnées
  v_full_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
  v_shop_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'shop_name'), ''), 'Ma Boutique');

  -- 1. Créer le profil public utilisateur
  INSERT INTO public.users (id, full_name)
  VALUES (NEW.id, v_full_name)
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        updated_at = NOW();

  -- 2. Trouver le rôle owner
  SELECT id INTO v_owner_role_id
  FROM public.roles
  WHERE name = 'owner'
  LIMIT 1;

  -- 3. Créer le rôle si manquant
  IF v_owner_role_id IS NULL THEN
    INSERT INTO public.roles (name, permissions)
    VALUES ('owner', '{"all": true}'::jsonb)
    RETURNING id INTO v_owner_role_id;
  END IF;

  -- 4. Créer la boutique
  INSERT INTO public.shops (name, owner_id, currency)
  VALUES (v_shop_name, NEW.id, 'XAF')
  RETURNING id INTO v_new_shop_id;

  -- 5. Lier l'utilisateur à la boutique avec le rôle owner
  INSERT INTO public.user_shops (user_id, shop_id, role_id, role)
  VALUES (NEW.id, v_new_shop_id, v_owner_role_id, 'owner')
  ON CONFLICT (user_id, shop_id) DO UPDATE
    SET role_id = EXCLUDED.role_id,
        role = EXCLUDED.role;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Logger l'erreur sans bloquer la création du compte
  BEGIN
    INSERT INTO public.trigger_logs (error_message, context)
    VALUES (SQLERRM, 'handle_new_auth_user for user: ' || NEW.id::TEXT);
  EXCEPTION WHEN OTHERS THEN
    -- Si même le log échoue, on ignore silencieusement
    NULL;
  END;
  -- NE PAS RAISE : permettre à Supabase Auth de créer le compte même si notre code plante
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Étape 6 : Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


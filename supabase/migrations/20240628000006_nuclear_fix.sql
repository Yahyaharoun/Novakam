-- ============================================================
-- NOVAKAM - FIX NUCLÉAIRE DU TRIGGER
-- 
-- Dans Supabase, les triggers s'exécutent via le rôle
-- "supabase_auth_admin" et non "postgres".
-- Ce rôle est soumis aux RLS policies.
-- 
-- La seule solution propre : accorder le BYPASSRLS au rôle
-- supabase_auth_admin, ou mieux, utiliser SET LOCAL ROLE.
-- 
-- Solution enterprise : Insérer les données directement via
-- une fonction RPC avec SECURITY DEFINER qui bypasse RLS.
-- ============================================================

-- Accorder BYPASSRLS au rôle qui exécute les triggers auth
-- (Dans Supabase managed, "supabase_auth_admin" exécute les triggers)
DO $$
BEGIN
  -- Essayer d'accorder bypassrls, ignorer si pas les droits
  EXECUTE 'ALTER ROLE supabase_auth_admin BYPASSRLS';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter supabase_auth_admin: %', SQLERRM;
END $$;

-- Recréer la fonction trigger en version finale et robuste
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_new_shop_id UUID;
  v_shop_name TEXT;
  v_full_name TEXT;
BEGIN
  v_full_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
  v_shop_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'shop_name'), ''), 'Ma Boutique');

  -- Bypasser RLS en utilisant SET LOCAL
  SET LOCAL row_security = off;

  INSERT INTO public.users (id, full_name)
  VALUES (NEW.id, v_full_name)
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        updated_at = NOW();

  INSERT INTO public.shops (name, owner_id, currency)
  VALUES (v_shop_name || ' ' || NEW.id, NEW.id, 'XAF')
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO v_new_shop_id;
  
  IF v_new_shop_id IS NULL THEN
     SELECT id INTO v_new_shop_id FROM public.shops WHERE name = (v_shop_name || ' ' || NEW.id) LIMIT 1;
  END IF;

  INSERT INTO public.user_shops (user_id, shop_id, role)
  VALUES (NEW.id, v_new_shop_id, 'owner')
  ON CONFLICT (user_id, shop_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'NOVAKAM trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Ownership de la fonction au rôle postgres (superuser)
ALTER FUNCTION public.handle_new_auth_user() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill : insérer les utilisateurs existants dans public.users
-- (pour les 4 qui sont déjà dans auth.users)
INSERT INTO public.users (id, full_name)
SELECT 
  id,
  NULLIF(TRIM(raw_user_meta_data->>'full_name'), '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Ne pas tenter de créer de shops dans le backfill car ça cause des duplicatas de noms 
-- avec la contrainte unique shops_name_key.

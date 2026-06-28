-- ============================================================
-- NOVAKAM - FIX COMPLET DU TRIGGER D'INSCRIPTION
-- 
-- Problème : le trigger ne créait pas les données complètes
-- Solution : lire toutes les métadonnées passées lors du signUp
--            et créer la boutique avec le vrai nom + toutes infos
-- ============================================================

-- 1. Recréer la fonction trigger complète (SECURITY DEFINER = bypass RLS)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_shop_id UUID;
  v_shop_name   TEXT;
  v_full_name   TEXT;
  v_slug        TEXT;
  v_city        TEXT;
  v_phone       TEXT;
  v_country     TEXT;
  v_plan        TEXT;
BEGIN
  -- Lire toutes les métadonnées passées lors du signUp
  v_full_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
  v_shop_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'shop_name'), ''), 'Ma Boutique');
  v_city      := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'city'), ''), NULL);
  v_phone     := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), NULL);
  v_country   := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'country'), ''), 'Cameroun');
  v_plan      := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'plan'), ''), 'free');

  -- Générer un slug unique
  v_slug := regexp_replace(lower(v_shop_name), '[^a-z0-9]+', '-', 'g');
  v_slug := btrim(v_slug, '-');
  v_slug := v_slug || '-' || substring(NEW.id::text, 1, 8);

  -- ÉTAPE 1 : Créer l'entrée dans public.users
  INSERT INTO public.users (id, full_name, phone)
  VALUES (NEW.id, v_full_name, v_phone)
  ON CONFLICT (id) DO UPDATE
    SET full_name  = COALESCE(EXCLUDED.full_name, public.users.full_name),
        updated_at = NOW();

  -- ÉTAPE 2 : Créer la boutique avec toutes les informations
  INSERT INTO public.shops (
    name, slug, owner_id, currency, language,
    timezone, is_active, plan, city, phone, country
  )
  VALUES (
    v_shop_name,
    v_slug,
    NEW.id,
    'XAF',
    'fr',
    'Africa/Douala',
    true,
    v_plan::public.plan,
    v_city,
    v_phone,
    v_country
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_new_shop_id;

  -- Si conflit sur le slug, récupérer l'ID de la boutique existante
  IF v_new_shop_id IS NULL THEN
    SELECT id INTO v_new_shop_id
    FROM public.shops
    WHERE owner_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- ÉTAPE 3 : Lier l'utilisateur à sa boutique comme owner
  IF v_new_shop_id IS NOT NULL THEN
    INSERT INTO public.user_shops (user_id, shop_id, role)
    VALUES (NEW.id, v_new_shop_id, 'owner')
    ON CONFLICT (user_id, shop_id) DO UPDATE
      SET role = 'owner';

    -- ÉTAPE 4 : Créer l'abonnement initial
    INSERT INTO public.subscriptions (shop_id, plan, status)
    VALUES (v_new_shop_id, v_plan::public.plan, 'active')
    ON CONFLICT (shop_id) DO NOTHING;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[NOVAKAM] trigger handle_new_auth_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Attribuer la propriété à postgres pour que SECURITY DEFINER ait les bons droits
ALTER FUNCTION public.handle_new_auth_user() OWNER TO postgres;

-- 3. Recréer le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Rétablir les privilèges sur toutes les tables
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- 5. S'assurer que la policy d'INSERT sur shops est correcte
DROP POLICY IF EXISTS "shops_insert" ON public.shops;
CREATE POLICY "shops_insert" ON public.shops
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- 6. S'assurer que les fonctions utilitaires ont les bons droits
ALTER FUNCTION public.get_my_shops() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_my_shops() TO authenticated;

-- 7. Vérification : afficher l'état du trigger
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_schema,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

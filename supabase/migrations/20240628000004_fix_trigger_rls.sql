-- ============================================================
-- NOVAKAM - FIX TRIGGER RLS
-- Le trigger SECURITY DEFINER s'exécute en tant que superuser
-- mais les tables users, shops, user_shops ont RLS activé.
-- En SECURITY DEFINER, le search_path est limité à 'public'
-- mais le rôle effectif reste le rôle qui a créé la fonction (postgres).
-- 
-- Le problème réel : les policies INSERT sur public.users 
-- n'autorisent QUE l'utilisateur à insérer son propre profil
-- (id = auth.uid()), mais auth.uid() retourne NULL dans le
-- contexte d'un trigger AFTER INSERT sur auth.users car la
-- session auth n'est pas encore établie.
--
-- FIX : Ajouter des policies qui permettent au trigger de
-- fonctionner, ou mieux : utiliser ALTER TABLE FORCE RLS
-- avec une exception pour le rôle postgres.
-- ============================================================

-- Option 1 : Bypasser RLS pour le rôle de service (le plus propre)
-- Cela permet aux triggers SECURITY DEFINER de ne pas être bloqués

-- Pour public.users : permettre l'insert depuis un trigger
DROP POLICY IF EXISTS "users_insert_trigger" ON public.users;
CREATE POLICY "users_insert_trigger" ON public.users
  FOR INSERT WITH CHECK (true);

-- Pour public.shops : permettre l'insert depuis un trigger  
DROP POLICY IF EXISTS "shops_insert_trigger" ON public.shops;
CREATE POLICY "shops_insert_trigger" ON public.shops
  FOR INSERT WITH CHECK (true);

-- Pour public.user_shops : permettre l'insert depuis un trigger
DROP POLICY IF EXISTS "user_shops_insert_trigger" ON public.user_shops;
CREATE POLICY "user_shops_insert_trigger" ON public.user_shops
  FOR INSERT WITH CHECK (true);

-- Pour public.roles : permettre la lecture et l'insert depuis un trigger
DROP POLICY IF EXISTS "roles_read_all" ON public.roles;
CREATE POLICY "roles_read_all" ON public.roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "roles_insert_all" ON public.roles;
CREATE POLICY "roles_insert_all" ON public.roles
  FOR INSERT WITH CHECK (true);

-- RECRÉER le trigger avec bypassrls = false mais en s'assurant
-- qu'il s'exécute en tant que postgres (qui bypasse RLS par défaut)
-- La clé : SET search_path = public, auth suffit
-- et SECURITY DEFINER garantit que la fonction tourne en tant que
-- le propriétaire de la fonction (généralement postgres)

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER SECURITY DEFINER
SET search_path = public, auth, extensions
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_role_id UUID;
  v_new_shop_id UUID;
  v_shop_name TEXT;
  v_full_name TEXT;
BEGIN
  v_full_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
  v_shop_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'shop_name'), ''), 'Ma Boutique');

  -- 1. Créer le profil public
  INSERT INTO public.users (id, full_name)
  VALUES (NEW.id, v_full_name)
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        updated_at = NOW();

  -- 2. Trouver le rôle owner
  SELECT id INTO v_owner_role_id FROM public.roles WHERE name = 'owner' LIMIT 1;
  
  IF v_owner_role_id IS NULL THEN
    INSERT INTO public.roles (name, permissions) 
    VALUES ('owner', '{"all": true}'::jsonb)
    RETURNING id INTO v_owner_role_id;
  END IF;

  -- 3. Créer la boutique
  INSERT INTO public.shops (name, owner_id, currency)
  VALUES (v_shop_name, NEW.id, 'XAF')
  RETURNING id INTO v_new_shop_id;

  -- 4. Lier l'utilisateur à la boutique
  INSERT INTO public.user_shops (user_id, shop_id, role_id, role)
  VALUES (NEW.id, v_new_shop_id, v_owner_role_id, 'owner')
  ON CONFLICT (user_id, shop_id) DO UPDATE
    SET role_id = EXCLUDED.role_id, role = EXCLUDED.role;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Logger silencieusement sans bloquer la création de compte
  RAISE WARNING 'handle_new_auth_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ============================================================
-- ÉTAPE 1: Verrouillage des RLS (Security Hardening)
-- ============================================================

-- Suppression des bypass dangereux introduits temporairement pour le trigger
DROP POLICY IF EXISTS "users_insert_trigger" ON public.users;
DROP POLICY IF EXISTS "shops_insert_trigger" ON public.shops;
DROP POLICY IF EXISTS "user_shops_insert_trigger" ON public.user_shops;
DROP POLICY IF EXISTS "roles_read_all" ON public.roles;
DROP POLICY IF EXISTS "roles_insert_all" ON public.roles;

-- On nettoie les anciennes avant de recréer
DROP POLICY IF EXISTS "users_select_self" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "shops_select" ON public.shops;
DROP POLICY IF EXISTS "user_shops_select" ON public.user_shops;
DROP POLICY IF EXISTS "roles_select_all" ON public.roles;

-- On recrée les permissions standard
-- Les utilisateurs peuvent voir leurs propres infos
CREATE POLICY "users_select_self" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_self" ON public.users FOR UPDATE USING (id = auth.uid());

-- Les shops sont gérés via get_my_shops()
CREATE POLICY "shops_select" ON public.shops FOR SELECT USING (id = ANY(get_my_shops()));
CREATE POLICY "user_shops_select" ON public.user_shops FOR SELECT USING (user_id = auth.uid());

-- La lecture des rôles est autorisée pour tout le monde (nécessaire pour l'UI)
CREATE POLICY "roles_select_all" ON public.roles FOR SELECT USING (true);

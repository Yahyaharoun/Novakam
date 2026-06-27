-- ============================================================
-- NOVAKAM - Module Super Admin (Migration 007)
-- ============================================================

-- 1. Ajout de la colonne is_superadmin à la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- ============================================================
-- 2. Fonction utilitaire pour vérifier si l'utilisateur est superadmin
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    _is_admin BOOLEAN;
BEGIN
    SELECT is_superadmin INTO _is_admin FROM users WHERE id = auth.uid();
    RETURN COALESCE(_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Mise à jour des politiques RLS pour autoriser le Super Admin
-- ============================================================

-- RLS sur shops
-- Un Super Admin peut tout faire sur n'importe quelle boutique
CREATE POLICY "Super Admins can do everything on shops" ON shops
    FOR ALL USING (is_super_admin());

-- RLS sur users
-- Un Super Admin peut tout faire sur les utilisateurs
CREATE POLICY "Super Admins can do everything on users" ON users
    FOR ALL USING (is_super_admin());

-- RLS sur user_shops
CREATE POLICY "Super Admins can do everything on user_shops" ON user_shops
    FOR ALL USING (is_super_admin());

-- RLS sur subscriptions (si la table existe déjà)
CREATE POLICY "Super Admins can do everything on subscriptions" ON subscriptions
    FOR ALL USING (is_super_admin());



-- Note: Pour les autres tables liées à un shop_id (products, customers, sales, etc.),
-- bien que le Super Admin pourrait vouloir y accéder pour le support,
-- l'accès principal se fait via les API Admin ou le dashboard Admin.
-- Pour plus de sécurité, on peut ajouter une RLS globale ou utiliser le service role.
-- Dans cette V1, l'accès se fera via l'API (service_role) ou en modifiant les RLS :

CREATE POLICY "Super Admins can access all categories" ON categories FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all products" ON products FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all customers" ON customers FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all suppliers" ON suppliers FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all cash_registers" ON cash_registers FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all sales" ON sales FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all sale_items" ON sale_items FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all expenses" ON expenses FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all credits" ON credits FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all debts" ON debts FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all product_variants" ON product_variants FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all product_batches" ON product_batches FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can access all stock_movements" ON stock_movements FOR ALL USING (is_super_admin());


-- ============================================================
-- 4. Seed d'un premier Super Admin (optionnel, pour tests)
-- ============================================================
-- Le premier Super Admin peut être créé via le dashboard Supabase.
-- UPDATE users SET is_superadmin = true WHERE email = 'admin@novakam.com';

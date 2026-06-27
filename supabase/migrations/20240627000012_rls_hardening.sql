-- ============================================================
-- NOVAKAM - Migration 011 : Durcissement RLS et Indexes
-- ============================================================

-- 1. Indexation Systématique
-- Assurer que chaque table contenant shop_id possède un index pour de meilleures performances RLS
CREATE INDEX IF NOT EXISTS idx_users_is_superadmin ON public.users(is_superadmin);
CREATE INDEX IF NOT EXISTS idx_user_shops_user_id ON public.user_shops(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shops_shop_id ON public.user_shops(shop_id);
CREATE INDEX IF NOT EXISTS idx_employees_shop_id ON public.employees(shop_id);
CREATE INDEX IF NOT EXISTS idx_registers_shop_id ON public.registers(shop_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_shop_id ON public.warehouses(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_categories_shop_id ON public.categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_shop_id ON public.suppliers(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON public.sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_shop_id ON public.sale_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_id ON public.expenses(shop_id);
CREATE INDEX IF NOT EXISTS idx_credits_shop_id ON public.credits(shop_id);
CREATE INDEX IF NOT EXISTS idx_debts_shop_id ON public.debts(shop_id);

-- 2. Fonction utilitaire "has_role"
-- Permet de vérifier rapidement si l'utilisateur a un rôle spécifique dans une boutique
CREATE OR REPLACE FUNCTION public.has_role(p_shop_id UUID, p_roles user_role[])
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Super admin bypass everything
  IF public.is_super_admin() THEN RETURN TRUE; END IF;

  SELECT role INTO v_role 
  FROM public.user_shops 
  WHERE shop_id = p_shop_id AND user_id = auth.uid()
  LIMIT 1;
  
  IF v_role = ANY(p_roles) THEN
      RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Sécurisation anti-escalade sur `user_shops`
-- On empêche un utilisateur de modifier son propre rôle ou celui des autres
-- Sauf s'il est OWNER de la boutique.

DROP POLICY IF EXISTS "user_shops_update" ON public.user_shops;
CREATE POLICY "user_shops_update_owner_only" ON public.user_shops
    FOR UPDATE USING (
        has_role(shop_id, ARRAY['owner']::user_role[])
    ) WITH CHECK (
        has_role(shop_id, ARRAY['owner']::user_role[])
    );

DROP POLICY IF EXISTS "user_shops_insert" ON public.user_shops;
CREATE POLICY "user_shops_insert_owner_only" ON public.user_shops
    FOR INSERT WITH CHECK (
        has_role(shop_id, ARRAY['owner']::user_role[])
    );

DROP POLICY IF EXISTS "user_shops_delete" ON public.user_shops;
CREATE POLICY "user_shops_delete_owner_only" ON public.user_shops
    FOR DELETE USING (
        has_role(shop_id, ARRAY['owner']::user_role[])
    );

-- 4. Sécurisation des données financières (Sales, Expenses, Credits, Debts)
-- (Exemple de durcissement : Seuls les owners/managers/cashiers peuvent insérer des ventes)

-- SALES
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
CREATE POLICY "sales_insert_strict" ON public.sales
    FOR INSERT WITH CHECK (
        has_role(shop_id, ARRAY['owner', 'manager', 'cashier']::user_role[])
    );

DROP POLICY IF EXISTS "sales_update" ON public.sales;
CREATE POLICY "sales_update_strict" ON public.sales
    FOR UPDATE USING (
        has_role(shop_id, ARRAY['owner', 'manager']::user_role[])
    );

DROP POLICY IF EXISTS "sales_delete" ON public.sales;
CREATE POLICY "sales_delete_strict" ON public.sales
    FOR DELETE USING (
        has_role(shop_id, ARRAY['owner']::user_role[])
    );

-- PRODUCTS
DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert_strict" ON public.products
    FOR INSERT WITH CHECK (
        has_role(shop_id, ARRAY['owner', 'manager', 'storekeeper']::user_role[])
    );

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update_strict" ON public.products
    FOR UPDATE USING (
        has_role(shop_id, ARRAY['owner', 'manager', 'storekeeper']::user_role[])
    );

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete_strict" ON public.products
    FOR DELETE USING (
        has_role(shop_id, ARRAY['owner', 'manager']::user_role[])
    );

-- 5. Protection de la table shops
-- Personne ne peut supprimer un shop sauf le super admin
DROP POLICY IF EXISTS "shops_delete" ON public.shops;
-- (Rien n'est créé pour DELETE, donc par défaut refusé à cause de ENABLE ROW LEVEL SECURITY)

-- ============================================================
-- ÉTAPE 1: Fix RBAC (Role-Based Access Control)
-- ============================================================

-- Recréer la fonction has_permission pour utiliser "role" (enum) au lieu de "role_id"
CREATE OR REPLACE FUNCTION has_permission(target_shop_id UUID, module_name TEXT, access_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_perms JSONB;
BEGIN
  -- Lier sur us.role (enum) et r.name (text)
  SELECT r.permissions INTO user_perms
  FROM user_shops us
  JOIN roles r ON us.role::text = r.name
  WHERE us.user_id = auth.uid() AND us.shop_id = target_shop_id AND us.is_deleted = false;

  -- Default to false if no role found
  IF user_perms IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extract the boolean value: permissions->module_name->>access_type
  RETURN (user_perms->module_name->>access_type)::boolean = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour les RLS (Row Level Security) sur toutes les tables principales
-- (On vérifie d'abord que les RLS sont activées)

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Categories
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'inventory', 'write'));
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'inventory', 'write'));
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'inventory', 'write'));

-- Customers
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'pos', 'write'));
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'pos', 'write'));

-- Suppliers
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'inventory', 'write'));
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE USING (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'inventory', 'write'));

-- Stock Movements
DROP POLICY IF EXISTS "stock_movements_insert" ON stock_movements;
CREATE POLICY "stock_movements_insert" ON stock_movements FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'inventory', 'write'));

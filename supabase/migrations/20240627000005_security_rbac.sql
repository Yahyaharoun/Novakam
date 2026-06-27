-- ============================================================
-- MIGRATION 004: Security & RBAC (Role-Based Access Control)
-- ============================================================

-- 1. Update Default Roles with specific JSONB Matrix
TRUNCATE TABLE roles CASCADE; -- Warning: This resets user_shops links in a real production environment, but okay for setup phase.

INSERT INTO roles (id, name, permissions) VALUES 
(gen_random_uuid(), 'owner', '{
  "pos": { "read": true, "write": true },
  "inventory": { "read": true, "write": true },
  "finance": { "read": true, "write": true },
  "settings": { "read": true, "write": true }
}'),
(gen_random_uuid(), 'admin', '{
  "pos": { "read": true, "write": true },
  "inventory": { "read": true, "write": true },
  "finance": { "read": true, "write": true },
  "settings": { "read": true, "write": false }
}'),
(gen_random_uuid(), 'cashier', '{
  "pos": { "read": true, "write": true },
  "inventory": { "read": true, "write": false },
  "finance": { "read": false, "write": false },
  "settings": { "read": false, "write": false }
}'),
(gen_random_uuid(), 'stock_manager', '{
  "pos": { "read": false, "write": false },
  "inventory": { "read": true, "write": true },
  "finance": { "read": false, "write": false },
  "settings": { "read": false, "write": false }
}'),
(gen_random_uuid(), 'accountant', '{
  "pos": { "read": true, "write": false },
  "inventory": { "read": true, "write": false },
  "finance": { "read": true, "write": true },
  "settings": { "read": false, "write": false }
}');

-- 2. Create the fast RBAC check function
CREATE OR REPLACE FUNCTION has_permission(target_shop_id UUID, module_name TEXT, access_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_perms JSONB;
BEGIN
  -- Note: Super admin bypass can be added here if checking auth.jwt()->>'role'
  
  SELECT r.permissions INTO user_perms
  FROM user_shops us
  JOIN roles r ON us.role_id = r.id
  WHERE us.user_id = auth.uid() AND us.shop_id = target_shop_id AND us.is_deleted = false;

  -- Default to false if no role found
  IF user_perms IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extract the boolean value: permissions->module_name->>access_type
  RETURN (user_perms->module_name->>access_type)::boolean = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Enhance RLS Policies with has_permission checks
-- We drop the basic INSERT/UPDATE policies from 001_init_schema and recreate them with RBAC logic.

-- PRODUCTS (Inventory)
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'inventory', 'write'));
CREATE POLICY "products_update" ON products FOR UPDATE USING (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'inventory', 'write'));

-- SALES (POS)
DROP POLICY IF EXISTS "sales_insert" ON sales;
DROP POLICY IF EXISTS "sales_update" ON sales;
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'pos', 'write'));
CREATE POLICY "sales_update" ON sales FOR UPDATE USING (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'pos', 'write'));

-- EXPENSES (Finance)
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'finance', 'write'));
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'finance', 'write'));

-- CASH SESSIONS & MOVEMENTS (Finance/POS overlap - mostly POS for cashier)
DROP POLICY IF EXISTS "cash_register_sessions_insert" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_sessions_update" ON cash_register_sessions;
CREATE POLICY "cash_register_sessions_insert" ON cash_register_sessions FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'pos', 'write'));
CREATE POLICY "cash_register_sessions_update" ON cash_register_sessions FOR UPDATE USING (shop_id = ANY(get_my_shops()) AND has_permission(shop_id, 'pos', 'write'));

-- SHOPS (Settings)
DROP POLICY IF EXISTS "shops_update" ON shops;
CREATE POLICY "shops_update" ON shops FOR UPDATE USING (id = ANY(get_my_shops()) AND has_permission(id, 'settings', 'write'));

-- 4. Set Custom JWT Claims hook (Optional optimization, standard Supabase requires specific config to do auth hooks)
-- We will rely on Next.js Middleware checking a cookie or calling Supabase SSR for edge-route protection.

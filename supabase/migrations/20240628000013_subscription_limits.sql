-- ============================================================
-- ÉTAPE 4 : Garde-fous d'abonnement (Subscription Limits)
-- La fonction check_subscription_limit existe déjà (migration 002) 
-- avec un type de retour TABLE(). On ne la recrée pas.
-- On ajoute seulement le trigger produit et les index de performance.
-- ============================================================

-- Trigger sur products pour bloquer les insertions si limite dépassée
CREATE OR REPLACE FUNCTION check_product_limit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_allowed BOOLEAN;
BEGIN
  SELECT allowed INTO v_allowed 
  FROM check_subscription_limit(NEW.shop_id, 'products');
  
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED: Vous avez atteint la limite de produits de votre plan. Veuillez passer à un plan supérieur.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_product_limit ON products;
CREATE TRIGGER enforce_product_limit
  BEFORE INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION check_product_limit_trigger();

-- ============================================================
-- Indexes de Performance (ÉTAPE 1) 
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_shop_id_date ON sales(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_shop_id_name ON products(shop_id, name);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_shops_user_id ON user_shops(user_id);


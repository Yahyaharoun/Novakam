-- ============================================================
-- ÉTAPE 1: Sécurisation DB & RPC - Moteur Transactionnel POS
-- ============================================================

-- Fonction RPC pour le POS (Point of Sale) pour traiter une vente
-- Assure l'atomicité et évite les conditions de concurrence sur les stocks.
CREATE OR REPLACE FUNCTION process_pos_sale(
  p_shop_id UUID,
  p_cash_register_id UUID,
  p_customer_id UUID,
  p_total_amount DECIMAL(15,2),
  p_payment_method payment_method,
  p_items JSONB
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty DECIMAL(15,3);
  v_price DECIMAL(15,2);
  v_stock DECIMAL(15,3);
  v_allow_negative BOOLEAN;
  v_track_stock BOOLEAN;
BEGIN
  -- 1. Créer la vente
  INSERT INTO sales (
    shop_id, cash_register_id, customer_id, user_id, 
    total_amount, payment_method, status
  ) VALUES (
    p_shop_id, p_cash_register_id, p_customer_id, auth.uid(), 
    p_total_amount, p_payment_method, 'completed'
  ) RETURNING id INTO v_sale_id;

  -- 2. Parcourir les articles
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::DECIMAL;
    v_price := (v_item->>'unit_price')::DECIMAL;

    -- Créer la ligne de vente
    INSERT INTO sale_items (
      shop_id, sale_id, product_id, quantity, unit_price, total_price
    ) VALUES (
      p_shop_id, v_sale_id, v_product_id, v_qty, v_price, v_qty * v_price
    );

    -- Gérer le stock
    SELECT stock_quantity, allow_negative, track_stock 
    INTO v_stock, v_allow_negative, v_track_stock
    FROM products 
    WHERE id = v_product_id AND shop_id = p_shop_id 
    FOR UPDATE; -- Lock la ligne de produit

    IF v_track_stock THEN
      IF v_stock < v_qty AND NOT v_allow_negative THEN
        RAISE EXCEPTION 'Stock insuffisant pour le produit %', v_product_id;
      END IF;

      -- Déduire le stock
      UPDATE products 
      SET stock_quantity = stock_quantity - v_qty 
      WHERE id = v_product_id;

      -- Historique
      INSERT INTO stock_movements (
        shop_id, product_id, type, quantity
      ) VALUES (
        p_shop_id, v_product_id, 'out', v_qty
      );
    END IF;
  END LOOP;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

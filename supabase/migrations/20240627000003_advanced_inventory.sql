-- ============================================================
-- MIGRATION 002: Advanced Inventory (Variants & Batches)
-- ============================================================

-- 1. Extend products table
ALTER TABLE products ADD COLUMN has_variants BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN has_batches BOOLEAN DEFAULT false;

-- 2. Create product_variants table
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Red - Size M"
    sku VARCHAR(100),
    barcode VARCHAR(100),
    purchase_price DECIMAL(15,2), -- overrides product if not null
    selling_price DECIMAL(15,2), -- overrides product if not null
    stock_quantity DECIMAL(15,3) DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create product_batches table for expiration dates
CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    stock_quantity DECIMAL(15,3) DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Extend stock_movements table
ALTER TABLE stock_movements ADD COLUMN variant_id UUID REFERENCES product_variants(id);
ALTER TABLE stock_movements ADD COLUMN batch_id UUID REFERENCES product_batches(id);
ALTER TABLE stock_movements ADD COLUMN reason VARCHAR(255);
ALTER TABLE stock_movements ADD COLUMN reference_doc VARCHAR(255);
ALTER TABLE stock_movements ADD COLUMN from_shop_id UUID REFERENCES shops(id);
ALTER TABLE stock_movements ADD COLUMN to_shop_id UUID REFERENCES shops(id);
ALTER TABLE stock_movements ADD COLUMN user_id UUID REFERENCES users(id);

-- Update ENUM for new movement types (PostgreSQL requires a trick to add to ENUM if it's used, but usually ALTER TYPE ADD VALUE is fine)
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'purchase_receive';
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'inventory_adjustment';
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'transfer_out';
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'transfer_in';
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'expired_loss';

-- 5. RLS Policies and Indexes
CREATE INDEX idx_product_variants_product ON product_variants(product_id) WHERE is_deleted = false;
CREATE INDEX idx_product_batches_product ON product_batches(product_id) WHERE is_deleted = false;

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_variants_select" ON product_variants FOR SELECT USING (shop_id = ANY(get_my_shops()) AND is_deleted = false);
CREATE POLICY "product_variants_insert" ON product_variants FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()));
CREATE POLICY "product_variants_update" ON product_variants FOR UPDATE USING (shop_id = ANY(get_my_shops()));

CREATE POLICY "product_batches_select" ON product_batches FOR SELECT USING (shop_id = ANY(get_my_shops()) AND is_deleted = false);
CREATE POLICY "product_batches_insert" ON product_batches FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()));
CREATE POLICY "product_batches_update" ON product_batches FOR UPDATE USING (shop_id = ANY(get_my_shops()));

-- 6. Triggers
CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_batches_updated_at BEFORE UPDATE ON product_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Note: Since this is an extension, audit logs trigger will automatically catch it based on TG_OP.

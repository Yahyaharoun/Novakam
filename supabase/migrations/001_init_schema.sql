-- ============================================================
-- NOVAKAM - Schéma Base de Données (PostgreSQL / Supabase)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'conflict');
CREATE TYPE sale_status AS ENUM ('completed', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money', 'card', 'credit', 'bank_transfer');
CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment', 'loss', 'return');
CREATE TYPE debt_status AS ENUM ('active', 'paid', 'overdue', 'cancelled');

-- ============================================================
-- 2. TABLES GLOBALES (Sans shop_id)
-- ============================================================

-- ROLES
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertion des rôles par défaut
INSERT INTO roles (name, permissions) VALUES 
('owner', '{"all": true}'), 
('admin', '{"manage_products": true, "manage_sales": true, "manage_users": true}'), 
('cashier', '{"manage_sales": true}');

-- USERS (Extension de auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TABLES MULTI-TENANT (Avec shop_id)
-- ============================================================

-- SHOPS
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    currency VARCHAR(10) DEFAULT 'XAF',
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_SHOPS (Liaison Utilisateurs <-> Boutiques <-> Rôles)
CREATE TABLE user_shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    shop_id UUID NOT NULL REFERENCES shops(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, shop_id)
);

-- CATEGORIES
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    name VARCHAR(255) NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    category_id UUID REFERENCES categories(id),
    name VARCHAR(500) NOT NULL,
    barcode VARCHAR(100),
    purchase_price DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) NOT NULL,
    stock_quantity DECIMAL(15,3) DEFAULT 0,
    min_stock DECIMAL(15,3) DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMERS
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPPLIERS
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CASH_REGISTERS (Caisses)
CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    name VARCHAR(100) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'closed', -- open, closed
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALES
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    cash_register_id UUID REFERENCES cash_registers(id),
    customer_id UUID REFERENCES customers(id),
    user_id UUID REFERENCES users(id),
    total_amount DECIMAL(15,2) NOT NULL,
    payment_method payment_method DEFAULT 'cash',
    status sale_status DEFAULT 'completed',
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALE_ITEMS
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    sale_id UUID NOT NULL REFERENCES sales(id),
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STOCK_MOVEMENTS
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    product_id UUID NOT NULL REFERENCES products(id),
    type stock_movement_type NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREDITS (Dettes des clients envers la boutique)
CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    sale_id UUID REFERENCES sales(id),
    amount DECIMAL(15,2) NOT NULL,
    status debt_status DEFAULT 'active',
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEBTS (Dettes de la boutique envers les fournisseurs)
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    amount DECIMAL(15,2) NOT NULL,
    status debt_status DEFAULT 'active',
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPENSES
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT_LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    user_id UUID REFERENCES users(id),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete, soft_delete
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. INDEX DE PERFORMANCE
-- ============================================================
CREATE INDEX idx_user_shops_user ON user_shops(user_id) WHERE is_deleted = false;
CREATE INDEX idx_products_shop ON products(shop_id) WHERE is_deleted = false;
CREATE INDEX idx_sales_shop_date ON sales(shop_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id) WHERE is_deleted = false;
CREATE INDEX idx_credits_customer ON credits(customer_id) WHERE status = 'active' AND is_deleted = false;

-- ============================================================
-- 5. TRIGGERS : UPDATED_AT & AUDIT LOGS
-- ============================================================

-- Fonction Auto updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger updated_at à toutes les tables
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name != 'audit_logs'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
            CREATE TRIGGER trg_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION set_updated_at();
        ', t_name, t_name, t_name, t_name);
    END LOOP;
END $$;

-- Fonction d'Audit
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (shop_id, user_id, table_name, record_id, action, new_data)
        VALUES (NEW.shop_id, auth.uid(), TG_TABLE_NAME, NEW.id, 'create', row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
            INSERT INTO audit_logs (shop_id, user_id, table_name, record_id, action, old_data, new_data)
            VALUES (NEW.shop_id, auth.uid(), TG_TABLE_NAME, NEW.id, 'soft_delete', row_to_json(OLD), row_to_json(NEW));
        ELSE
            INSERT INTO audit_logs (shop_id, user_id, table_name, record_id, action, old_data, new_data)
            VALUES (NEW.shop_id, auth.uid(), TG_TABLE_NAME, NEW.id, 'update', row_to_json(OLD), row_to_json(NEW));
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (shop_id, user_id, table_name, record_id, action, old_data)
        VALUES (OLD.shop_id, auth.uid(), TG_TABLE_NAME, OLD.id, 'hard_delete', row_to_json(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Fonction utilitaire pour récupérer les shops autorisés de l'utilisateur
CREATE OR REPLACE FUNCTION get_my_shops()
RETURNS UUID[] AS $$
    SELECT ARRAY(
        SELECT shop_id FROM user_shops 
        WHERE user_id = auth.uid() AND is_deleted = false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies génériques pour les tables liées à un shop_id
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT table_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name = 'shop_id'
    LOOP
        -- SELECT : L'utilisateur doit avoir accès à la boutique ET l'item ne doit pas être supprimé (soft delete)
        EXECUTE format('
            DROP POLICY IF EXISTS "%I_select" ON %I;
            CREATE POLICY "%I_select" ON %I 
            FOR SELECT USING (shop_id = ANY(get_my_shops()) AND is_deleted = false);
        ', t_name, t_name, t_name, t_name);

        -- INSERT : L'utilisateur doit avoir accès à la boutique
        EXECUTE format('
            DROP POLICY IF EXISTS "%I_insert" ON %I;
            CREATE POLICY "%I_insert" ON %I 
            FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()));
        ', t_name, t_name, t_name, t_name);

        -- UPDATE : L'utilisateur doit avoir accès à la boutique
        EXECUTE format('
            DROP POLICY IF EXISTS "%I_update" ON %I;
            CREATE POLICY "%I_update" ON %I 
            FOR UPDATE USING (shop_id = ANY(get_my_shops()));
        ', t_name, t_name, t_name, t_name);
    END LOOP;
END $$;

-- Policy spécifique pour les utilisateurs
DROP POLICY IF EXISTS "users_read_self" ON users;
CREATE POLICY "users_read_self" ON users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "users_update_self" ON users;
CREATE POLICY "users_update_self" ON users FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- MIGRATION 003: Finance Module (Sessions & Cash Movements)
-- ============================================================

-- 1. Create cash_register_sessions table
CREATE TABLE cash_register_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id),
    opened_by UUID NOT NULL REFERENCES users(id),
    closed_by UUID REFERENCES users(id),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    expected_closing_balance DECIMAL(15,2),
    real_closing_balance DECIMAL(15,2),
    discrepancy DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'open', -- 'open' or 'closed'
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create cash_movements table
-- Used to trace every single financial flux in/out of the shop
CREATE TYPE cash_movement_type AS ENUM ('sale_income', 'expense', 'credit_payment', 'debt_payment', 'withdrawal', 'deposit');

CREATE TABLE cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    session_id UUID REFERENCES cash_register_sessions(id),
    type cash_movement_type NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    amount DECIMAL(15,2) NOT NULL,
    reference_id UUID, -- Can be sale_id, expense_id, credit_id, etc.
    user_id UUID REFERENCES users(id),
    notes VARCHAR(500),
    is_deleted BOOLEAN DEFAULT false,
    sync_status sync_status DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Link Sales to Session
ALTER TABLE sales ADD COLUMN session_id UUID REFERENCES cash_register_sessions(id);

-- 4. Extend Expenses
ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE expenses ADD COLUMN payment_method payment_method DEFAULT 'cash';

-- 5. Indexes for Performance
CREATE INDEX idx_cash_sessions_shop ON cash_register_sessions(shop_id) WHERE is_deleted = false;
CREATE INDEX idx_cash_sessions_status ON cash_register_sessions(cash_register_id, status) WHERE is_deleted = false;
CREATE INDEX idx_cash_movements_session ON cash_movements(session_id) WHERE is_deleted = false;
CREATE INDEX idx_cash_movements_shop_type ON cash_movements(shop_id, type) WHERE is_deleted = false;

-- 6. Row Level Security (RLS)
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_register_sessions_select" ON cash_register_sessions FOR SELECT USING (shop_id = ANY(get_my_shops()) AND is_deleted = false);
CREATE POLICY "cash_register_sessions_insert" ON cash_register_sessions FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()));
CREATE POLICY "cash_register_sessions_update" ON cash_register_sessions FOR UPDATE USING (shop_id = ANY(get_my_shops()));

CREATE POLICY "cash_movements_select" ON cash_movements FOR SELECT USING (shop_id = ANY(get_my_shops()) AND is_deleted = false);
CREATE POLICY "cash_movements_insert" ON cash_movements FOR INSERT WITH CHECK (shop_id = ANY(get_my_shops()));
CREATE POLICY "cash_movements_update" ON cash_movements FOR UPDATE USING (shop_id = ANY(get_my_shops()));

-- 7. Triggers for updated_at
CREATE TRIGGER trg_cash_sessions_updated_at BEFORE UPDATE ON cash_register_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cash_movements_updated_at BEFORE UPDATE ON cash_movements FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- NOVAKAM - Système de Licences (Migration 008)
-- ============================================================

-- 1. ENUMS (Si pas déjà créés, sinon on ignore avec exception)
DO $$ BEGIN
  CREATE TYPE activation_code_status AS ENUM ('active', 'exhausted', 'suspended', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLE: activation_codes
CREATE TABLE IF NOT EXISTS activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    plan plan NOT NULL,
    duration_months INTEGER NOT NULL DEFAULT 1,
    max_activations INTEGER NOT NULL DEFAULT 1,
    remaining_activations INTEGER NOT NULL DEFAULT 1,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL, -- Restreint à un shop (optionnel)
    status activation_code_status NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ, -- Expiration du code lui-même (pas de l'abonnement)
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Le Super Admin qui l'a créé
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour la recherche rapide du code
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);

-- 3. TABLE: license_history
CREATE TABLE IF NOT EXISTS license_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_id UUID NOT NULL REFERENCES activation_codes(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    activated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    plan_granted plan NOT NULL,
    duration_granted_months INTEGER NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. POLITIQUES RLS
-- ============================================================

-- Activer RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_history ENABLE ROW LEVEL SECURITY;

-- Pour activation_codes : 
-- Les utilisateurs normaux peuvent lire les codes via une fonction API (service_role bypass RLS de toute façon).
-- Ou on peut autoriser la lecture aux authentifiés.
CREATE POLICY "Super Admins can do everything on activation_codes" ON activation_codes
    FOR ALL USING (is_super_admin());

CREATE POLICY "Authenticated users can read activation_codes" ON activation_codes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Pour license_history :
CREATE POLICY "Super Admins can do everything on license_history" ON license_history
    FOR ALL USING (is_super_admin());

CREATE POLICY "Shop owners/employees can read their own license_history" ON license_history
    FOR SELECT USING (shop_id IN (
        SELECT shop_id FROM user_shops WHERE user_id = auth.uid()
    ));

-- Note : L'insertion dans license_history et la mise à jour de activation_codes 
-- se feront côté serveur via le service_role, donc pas besoin de policy d'INSERT pour les marchands.

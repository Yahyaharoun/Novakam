-- ============================================================
-- NOVAKAM - Migration 010 : Logs de Sécurité (Audit Trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'UPDATE', 'DELETE', 'INSERT'
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour la recherche rapide des logs
CREATE INDEX IF NOT EXISTS idx_security_logs_shop_id ON public.security_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at);

-- Activer RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Les Super Admins voient tout
CREATE POLICY "Super Admins can view all security logs" 
ON public.security_logs FOR SELECT 
USING (is_super_admin());

-- Les Owners voient les logs de leur boutique
CREATE POLICY "Owners can view security logs of their shop" 
ON public.security_logs FOR SELECT 
USING (
    shop_id IN (
        SELECT shop_id FROM user_shops 
        WHERE user_id = auth.uid() AND role = 'owner'
    )
);

-- Fonction de Trigger générique pour auditer les changements
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_shop_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Tenter d'extraire le shop_id de la table affectée
    BEGIN
        IF TG_OP = 'DELETE' THEN
            v_shop_id := OLD.shop_id;
        ELSE
            v_shop_id := NEW.shop_id;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        -- Si la table n'a pas de colonne shop_id (ex: users, certaines configs globales)
        v_shop_id := NULL;
    END;

    INSERT INTO public.security_logs (
        shop_id, user_id, action, table_name, record_id, old_data, new_data
    ) VALUES (
        v_shop_id,
        v_user_id,
        TG_OP,
        TG_TABLE_NAME::TEXT,
        COALESCE(OLD.id::TEXT, NEW.id::TEXT),
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD)::JSONB ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::JSONB ELSE NULL END
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter les Triggers sur les tables les plus sensibles


DROP TRIGGER IF EXISTS audit_user_shops ON public.user_shops;
CREATE TRIGGER audit_user_shops
    AFTER INSERT OR UPDATE OR DELETE ON public.user_shops
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_subscriptions ON public.subscriptions;
CREATE TRIGGER audit_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_activation_codes ON public.activation_codes;
CREATE TRIGGER audit_activation_codes
    AFTER UPDATE OR DELETE ON public.activation_codes
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_shops ON public.shops;
CREATE TRIGGER audit_shops
    AFTER UPDATE OR DELETE ON public.shops
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

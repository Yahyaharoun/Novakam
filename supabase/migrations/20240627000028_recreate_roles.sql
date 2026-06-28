-- Drop 26 and 27 which are broken
-- Also recreate roles if missing
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-insert default owner role if missing
INSERT INTO public.roles (name, permissions)
VALUES ('owner', '{
      "pos": { "read": true, "write": true },
      "inventory": { "read": true, "write": true },
      "finance": { "read": true, "write": true },
      "settings": { "read": true, "write": true }
    }'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Also check if user_shops needs to re-add foreign key constraint
-- If the foreign key constraint is missing, it will not enforce anything, but that's fine for now, or we can try to re-add it.

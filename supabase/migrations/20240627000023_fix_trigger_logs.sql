CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  owner_role_id UUID;
  new_shop_id UUID;
  requested_shop_name TEXT;
BEGIN
  requested_shop_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'shop_name'), ''), 'Ma Boutique');

  BEGIN
      INSERT INTO public.users (id, full_name)
      VALUES (NEW.id, NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''))
      ON CONFLICT (id) DO UPDATE
      SET full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
          updated_at = NOW();

      SELECT id INTO owner_role_id
      FROM public.roles
      WHERE name = 'owner' AND is_deleted = false
      LIMIT 1;

      IF owner_role_id IS NULL THEN
        INSERT INTO public.roles (name, permissions)
        VALUES ('owner', '{
          "pos": { "read": true, "write": true },
          "inventory": { "read": true, "write": true },
          "finance": { "read": true, "write": true },
          "settings": { "read": true, "write": true }
        }'::jsonb)
        RETURNING id INTO owner_role_id;
      END IF;

      INSERT INTO public.shops (name, owner_id, currency)
      VALUES (requested_shop_name, NEW.id, 'XAF')
      RETURNING id INTO new_shop_id;

      INSERT INTO public.user_shops (user_id, shop_id, role_id)
      VALUES (NEW.id, new_shop_id, owner_role_id)
      ON CONFLICT (user_id, shop_id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.trigger_logs (error_message) VALUES (SQLERRM);
      -- DO NOT RAISE so it commits the log!
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

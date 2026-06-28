DO $$
DECLARE
  r RECORD;
  v_new_shop_id UUID;
  v_shop_name TEXT;
BEGIN
  -- We just need to give them a shop name that is definitely unique
  FOR r IN 
    SELECT au.id, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.user_shops us ON us.user_id = au.id
    WHERE us.user_id IS NULL
  LOOP
    v_shop_name := COALESCE(
      NULLIF(TRIM(r.raw_user_meta_data->>'shop_name'), ''), 
      'Ma Boutique'
    ) || ' ' || substr(r.id::text, 1, 8);
    
    INSERT INTO public.shops (name, owner_id, currency)
    VALUES (v_shop_name, r.id, 'XAF')
    RETURNING id INTO v_new_shop_id;
    
    INSERT INTO public.user_shops (user_id, shop_id, role)
    VALUES (r.id, v_new_shop_id, 'owner')
    ON CONFLICT (user_id, shop_id) DO NOTHING;
  END LOOP;
END $$;

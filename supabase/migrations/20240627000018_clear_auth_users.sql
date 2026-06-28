DO $$
BEGIN
  -- We delete all auth users to start fresh since the public tables are empty anyway.
  DELETE FROM auth.users;
END $$;

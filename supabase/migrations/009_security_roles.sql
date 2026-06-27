-- ============================================================
-- NOVAKAM - Migration 009 : Refonte et Alignement des Rôles
-- Objectif : OWNER, MANAGER, CASHIER, WAREHOUSE, ACCOUNTANT, SUPPORT
-- ============================================================

-- 1. Création du nouvel ENUM
CREATE TYPE public.user_role_new AS ENUM (
    'owner', 
    'manager', 
    'cashier', 
    'warehouse', 
    'accountant', 
    'support'
);

-- 2. Mise à jour de la table user_shops
-- Les rôles 'admin' deviennent 'manager', 'storekeeper' devient 'warehouse'
ALTER TABLE public.user_shops ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.user_shops 
  ALTER COLUMN role TYPE public.user_role_new 
  USING (
    CASE role::text
      WHEN 'admin' THEN 'manager'::text
      WHEN 'storekeeper' THEN 'warehouse'::text
      ELSE role::text
    END
  )::public.user_role_new;

ALTER TABLE public.user_shops ALTER COLUMN role SET DEFAULT 'cashier'::public.user_role_new;

-- 3. Mise à jour de la table employees
ALTER TABLE public.employees ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.employees 
  ALTER COLUMN role TYPE public.user_role_new 
  USING (
    CASE role::text
      WHEN 'admin' THEN 'manager'::text
      WHEN 'storekeeper' THEN 'warehouse'::text
      ELSE role::text
    END
  )::public.user_role_new;

ALTER TABLE public.employees ALTER COLUMN role SET DEFAULT 'cashier'::public.user_role_new;

-- 4. Suppression de l'ancien type et renommage
DROP TYPE public.user_role;
ALTER TYPE public.user_role_new RENAME TO user_role;

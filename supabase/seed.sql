-- ============================================================
-- NOVAKAM - Données de Démonstration (Seed)
-- A exécuter DANS CET ORDRE après les migrations 001, 002, 003, 004
-- ============================================================

-- Variables
DO $$
DECLARE
    owner_uuid UUID := '00000000-0000-0000-0000-000000000001'; -- Remplacer par un VRAI auth.uid() de votre projet !
    shop_uuid UUID := uuid_generate_v4();
    role_owner_uuid UUID;
    cat_boissons UUID := uuid_generate_v4();
    cat_epicerie UUID := uuid_generate_v4();
    prod_coca UUID := uuid_generate_v4();
    prod_riz UUID := uuid_generate_v4();
    cust_jean UUID := uuid_generate_v4();
    cash_reg UUID := uuid_generate_v4();
    session_id UUID := uuid_generate_v4();
BEGIN

    -- 1. Récupération du rôle owner
    SELECT id INTO role_owner_uuid FROM roles WHERE name = 'owner' LIMIT 1;

    -- Si vous n'avez pas d'utilisateur auth.users, la ligne suivante échouera.
    -- IL FAUT AVOIR CRÉÉ UN UTILISATEUR DANS L'ONGLET AUTHENTIFICATION SUPABASE AVANT DE LANCER CE SCRIPT.
    -- Remplacez owner_uuid par l'ID copié depuis Supabase Auth.
    -- (Pour le test pur sans contrainte de clé étrangère, commentez la FK dans 'shops' et 'user_shops')

    -- Pour éviter l'erreur de FK sur auth.users dans ce script, on suppose que owner_uuid existe.
    -- Sinon, retirez les blocs 2 et 3 et exécutez le reste en adaptant.

    /*
    -- 2. Création de la boutique
    INSERT INTO shops (id, name, owner_id, currency) 
    VALUES (shop_uuid, 'Superette La Grâce', owner_uuid, 'XAF');

    -- 3. Liaison Utilisateur <-> Boutique
    INSERT INTO user_shops (user_id, shop_id, role_id)
    VALUES (owner_uuid, shop_uuid, role_owner_uuid);

    -- 4. Création des catégories
    INSERT INTO categories (id, shop_id, name) VALUES 
    (cat_boissons, shop_uuid, 'Boissons & Jus'),
    (cat_epicerie, shop_uuid, 'Épicerie Générale');

    -- 5. Création des produits
    INSERT INTO products (id, shop_id, category_id, name, barcode, purchase_price, selling_price, stock_quantity, min_stock) VALUES 
    (prod_coca, shop_uuid, cat_boissons, 'Coca-Cola 1.5L', '5449000000996', 600, 800, 50, 10),
    (prod_riz, shop_uuid, cat_epicerie, 'Riz Parfumé 5kg (Sac)', '2000000000001', 3500, 4200, 20, 5);

    -- 6. Création des clients
    INSERT INTO customers (id, shop_id, name, phone) VALUES 
    (cust_jean, shop_uuid, 'Maman Jean', '+237600000000');

    -- 7. Création de la caisse
    INSERT INTO cash_registers (id, shop_id, name, status, balance) VALUES 
    (cash_reg, shop_uuid, 'Caisse Principale', 'closed', 0);
    */

END $$;

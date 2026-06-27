"use client";

import { getDB } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";

/**
 * Hydratation globale de la base IndexedDB depuis Supabase.
 * A exécuter lors de la première connexion ou de manière asynchrone 
 * pour s'assurer que toutes les données sont disponibles hors ligne.
 */
export async function hydrateLocalDB(shopId: string) {
  if (!navigator.onLine) return;

  const db = getDB();
  const supabase = createClient();
  console.log("[Hydration] Démarrage du téléchargement massif des données pour la boutique", shopId);

  try {
    // Téléchargement parallèle de toutes les tables critiques
    const [
      { data: products },
      { data: categories },
      { data: customers },
      { data: suppliers },
      { data: employees },
      { data: warehouses },
      { data: registers },
      { data: subscriptions },
      { data: settings },
      { data: credits },
      { data: debts },
    ] = await Promise.all([
      supabase.from("products").select("*").eq("shop_id", shopId),
      supabase.from("categories").select("*").eq("shop_id", shopId),
      supabase.from("customers").select("*").eq("shop_id", shopId),
      supabase.from("suppliers").select("*").eq("shop_id", shopId),
      supabase.from("employees").select("*").eq("shop_id", shopId),
      supabase.from("warehouses").select("*").eq("shop_id", shopId),
      supabase.from("registers").select("*").eq("shop_id", shopId),
      supabase.from("subscriptions").select("*").eq("shop_id", shopId).maybeSingle(),
      supabase.from("settings").select("*").eq("shop_id", shopId),
      supabase.from("credits").select("*").eq("shop_id", shopId).in("status", ["active", "overdue"]),
      supabase.from("debts").select("*").eq("shop_id", shopId).eq("status", "active"),
    ]);

    // Insertion transactionnelle dans Dexie
    await db.transaction("rw", 
      [db.products, 
      db.categories, 
      db.customers,
      db.suppliers,
      db.employees,
      db.warehouses,
      db.cashRegisters,
      db.subscriptions,
      db.posSettings, 
      db.credits,
      db.debts],
      async () => {
        // Vider puis insérer (ou BulkPut)
        if (products && products.length > 0) {
          // On s'assure de mapper les is_deleted vers is_active
          const localProducts = products.map((p: any) => ({
            ...p,
            is_active: !p.is_deleted,
            track_stock: p.track_stock ?? true,
            is_weighable: p.is_weighable ?? false,
          }));
          await db.products.bulkPut(localProducts);
        }

        if (categories && categories.length > 0) {
          const localCats = categories.map((c: any) => ({
            ...c,
            is_active: !c.is_deleted,
            color: c.color || "#3B82F6",
          }));
          await db.categories.bulkPut(localCats);
        }

        if (customers && customers.length > 0) {
          const localCusts = customers.map((c: any) => ({
            ...c,
            status: c.is_deleted ? "inactive" : "active",
          }));
          await db.customers.bulkPut(localCusts);
        }

        if (suppliers && suppliers.length > 0) {
          await db.suppliers.bulkPut(suppliers.map((s: any) => ({
            ...s,
            is_deleted: !!s.is_deleted
          })));
        }

        if (employees && employees.length > 0) {
          await db.employees.bulkPut(employees);
        }

        if (warehouses && warehouses.length > 0) {
          await db.warehouses.bulkPut(warehouses);
        }

        if (registers && registers.length > 0) {
          await db.cashRegisters.bulkPut(registers);
        }

        if (subscriptions) {
          await db.subscriptions.put(subscriptions);
        }
        
        if (settings && settings.length > 0) {
           await db.posSettings.bulkPut(settings);
        }

        if (credits && credits.length > 0) {
          await db.credits.bulkPut(credits);
        }

        if (debts && debts.length > 0) {
          await db.debts.bulkPut(debts);
        }
    });

    console.log("[Hydration] Terminée avec succès !");
  } catch (error) {
    console.error("[Hydration] Erreur lors de l'hydratation", error);
  }
}

"use client";

import { getDB } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";

/**
 * Hydratation globale de la base IndexedDB depuis Supabase.
 * A exécuter lors de la première connexion ou de manière asynchrone 
 * pour s'assurer que toutes les données sont disponibles hors ligne.
 * (PAGINATION AJOUTÉE POUR ÉVITER OOM)
 */
export async function hydrateLocalDB(shopId: string) {
  if (!navigator.onLine) return;

  const db = getDB();
  const supabase = createClient();
  console.log("[Hydration] Démarrage du téléchargement paginé des données pour la boutique", shopId);

  try {
    const BATCH_SIZE = 500;
    
    // Téléchargement des tables de configuration (petit volume, pas besoin de paginer)
    const [
      { data: categories },
      { data: employees },
      { data: warehouses },
      { data: registers },
      { data: subscriptions },
      { data: settings },
    ] = await Promise.all([
      supabase.from("categories").select("*").eq("shop_id", shopId),
      supabase.from("employees").select("*").eq("shop_id", shopId),
      supabase.from("warehouses").select("*").eq("shop_id", shopId),
      supabase.from("registers").select("*").eq("shop_id", shopId),
      supabase.from("subscriptions").select("*").eq("shop_id", shopId).maybeSingle(),
      supabase.from("settings").select("*").eq("shop_id", shopId),
    ]);

    await db.transaction("rw", 
      [db.categories, db.employees, db.warehouses, db.cashRegisters, db.subscriptions, db.posSettings],
      async () => {
        if (categories && categories.length > 0) {
          const localCats = categories.map((c: any) => ({
            ...c, is_active: !c.is_deleted, color: c.color || "#3B82F6",
          }));
          await db.categories.bulkPut(localCats);
        }
        if (employees && employees.length > 0) await db.employees.bulkPut(employees);
        if (warehouses && warehouses.length > 0) await db.warehouses.bulkPut(warehouses);
        if (registers && registers.length > 0) await db.cashRegisters.bulkPut(registers);
        if (subscriptions) await db.subscriptions.put(subscriptions);
        if (settings && settings.length > 0) await db.posSettings.bulkPut(settings);
    });

    // Hydratation Paginée pour les données volumineuses (Products, Customers)
    async function fetchAndStorePaginated(table: string, dbTable: any, transformer?: (d:any) => any) {
      let hasMore = true;
      let from = 0;
      while (hasMore) {
        const { data } = await supabase.from(table).select("*").eq("shop_id", shopId).range(from, from + BATCH_SIZE - 1);
        if (data && data.length > 0) {
          const processed = transformer ? data.map(transformer) : data;
          await db.transaction("rw", [dbTable], async () => {
             await dbTable.bulkPut(processed);
          });
          from += BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }
    }

    await Promise.all([
      fetchAndStorePaginated("products", db.products, (p: any) => ({
        ...p, is_active: !p.is_deleted, track_stock: p.track_stock ?? true, is_weighable: p.is_weighable ?? false
      })),
      fetchAndStorePaginated("customers", db.customers, (c: any) => ({
        ...c, status: c.is_deleted ? "inactive" : "active"
      })),
      fetchAndStorePaginated("suppliers", db.suppliers, (s: any) => ({
        ...s, is_deleted: !!s.is_deleted
      }))
    ]);

    console.log("[Hydration] Terminée avec succès !");
  } catch (error) {
    console.error("[Hydration] Erreur lors de l'hydratation", error);
  }
}

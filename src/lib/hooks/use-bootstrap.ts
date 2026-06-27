// src/lib/hooks/use-bootstrap.ts
// Charge toutes les données cloud → IndexedDB au premier login
"use client";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDB } from "@/lib/db/schema";
import { useAuthStore } from "@/lib/store/auth.store";
import { initSyncEngine } from "@/lib/sync/engine";

export function useBootstrap() {
  const shop = useAuthStore((s) => s.currentShop);
  const booted = useRef(false);

  useEffect(() => {
    if (!shop?.id || booted.current || !navigator.onLine) return;
    booted.current = true;

    (async () => {
      const supabase = createClient();
      const db = getDB();

      // Parallel fetch from Supabase
      const [
        { data: products },
        { data: categories },
        { data: customers },
      ] = await Promise.all([
        supabase.from("products").select("*").eq("shop_id", shop.id).eq("is_active", true),
        supabase.from("categories").select("*").eq("shop_id", shop.id),
        supabase.from("customers").select("*").eq("shop_id", shop.id).eq("is_active", true),
      ]);

      // Seed IndexedDB
      if (products?.length)   await db.products.bulkPut(products as never);
      if (categories?.length) await db.categories.bulkPut(categories as never);
      if (customers?.length)  await db.customers.bulkPut(customers as never);

      console.log("[Bootstrap] Local DB seeded ✅", {
        products: products?.length ?? 0,
        categories: categories?.length ?? 0,
        customers: customers?.length ?? 0,
      });

      // Start sync engine
      initSyncEngine();
    })();
  }, [shop?.id]);
}

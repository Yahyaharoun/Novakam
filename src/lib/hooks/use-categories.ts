// src/lib/hooks/use-categories.ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { getDB, type LocalCategory } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { createClient } from "@/lib/supabase/client";
import { v4 as uuid } from "uuid";
import { useLiveQuery } from "dexie-react-hooks";

export function useCategories() {
  const shop = useAuthStore((s) => s.currentShop);
  const categories = useLiveQuery(
    async () => {
      if (!shop?.id) return [];
      const db = getDB();
      let local = await db.categories.where("shop_id").equals(shop.id).toArray();
      local.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "fr"));
      return local.filter((c) => c.is_active);
    },
    [shop?.id]
  ) || [];

  const isLoading = useLiveQuery(() => false, []) ?? true;
  const load = useCallback(async () => { /* No-op */ }, []);

  const createCategory = useCallback(
    async (data: { name: string; color?: string; icon?: string }) => {
      if (!shop?.id) return;
      const db = getDB();
      const now = new Date().toISOString();
      const cat: LocalCategory = {
        id: uuid(),
        shop_id: shop.id,
        name: data.name,
        color: data.color ?? "#3B82F6",
        icon: data.icon,
        sort_order: categories.length,
        is_active: true,
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      };
      await db.categories.add(cat);
      await enqueueSync("categories", cat.id, "create", cat);
      await load();
      return cat;
    },
    [shop?.id, categories.length, load]
  );

  const updateCategory = useCallback(
    async (id: string, changes: Partial<LocalCategory>) => {
      const db = getDB();
      await db.categories.update(id, { ...changes, updated_at: new Date().toISOString(), sync_status: "pending" });
      const full = await db.categories.get(id);
      if (full) await enqueueSync("categories", id, "update", full);
      await load();
    },
    [load]
  );

  return { categories, isLoading, refresh: load, createCategory, updateCategory };
}

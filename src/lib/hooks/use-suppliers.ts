// src/lib/hooks/use-suppliers.ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { getDB, type LocalSupplier, type LocalDebt } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";

export interface SupplierWithStats extends LocalSupplier {
  total_purchases: number;
  remaining_debt: number;
}

export function useSuppliers(search?: string) {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const shop = useAuthStore((s) => s.currentShop);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    try {
      const db = getDB();
      let query = db.suppliers.where("shop_id").equals(shop.id).filter(s => !s.is_deleted);
      let results = await query.toArray();

      if (search) {
        const s = search.toLowerCase();
        results = results.filter((supplier) => 
          supplier.name.toLowerCase().includes(s) || 
          (supplier.phone && supplier.phone.includes(s))
        );
      }

      // Compute stats
      const debts = await db.debts.where("shop_id").equals(shop.id).toArray();
      
      const statsMap = new Map<string, { total_purchases: number; remaining_debt: number }>();
      
      for (const debt of debts) {
        if (!statsMap.has(debt.supplier_id)) {
          statsMap.set(debt.supplier_id, { total_purchases: 0, remaining_debt: 0 });
        }
        const st = statsMap.get(debt.supplier_id)!;
        st.total_purchases += debt.amount; // total original amount
        st.remaining_debt += debt.remaining_amount;
      }

      const enriched: SupplierWithStats[] = results.map(s => {
        const st = statsMap.get(s.id) || { total_purchases: 0, remaining_debt: 0 };
        return {
          ...s,
          total_purchases: st.total_purchases,
          remaining_debt: st.remaining_debt
        };
      });

      enriched.sort((a, b) => a.name.localeCompare(b.name, "fr"));
      setSuppliers(enriched);
    } finally {
      setIsLoading(false);
    }
  }, [shop?.id, search]);

  useEffect(() => { load(); }, [load]);

  const createSupplier = useCallback(async (data: { name: string; phone?: string; email?: string; address?: string }) => {
    if (!shop?.id) return null;
    const db = getDB();
    const now = new Date().toISOString();
    const supplier: LocalSupplier = {
      id: uuid(),
      shop_id: shop.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      is_deleted: false,
      sync_status: "pending",
      created_at: now,
      updated_at: now,
    };
    await db.suppliers.add(supplier);
    await enqueueSync("suppliers", supplier.id, "create", supplier);
    await load();
    return supplier;
  }, [shop?.id, load]);

  const updateSupplier = useCallback(async (id: string, changes: Partial<LocalSupplier>) => {
    const db = getDB();
    const now = new Date().toISOString();
    const updated = { ...changes, updated_at: now, sync_status: "pending" as const };
    await db.suppliers.update(id, updated);
    const full = await db.suppliers.get(id);
    if (full) await enqueueSync("suppliers", id, "update", full);
    await load();
  }, [load]);

  const deleteSupplier = useCallback(async (id: string) => {
    const db = getDB();
    const now = new Date().toISOString();
    await db.suppliers.update(id, { is_deleted: true, updated_at: now, sync_status: "pending" as const });
    const full = await db.suppliers.get(id);
    if (full) await enqueueSync("suppliers", id, "update", full);
    await load();
  }, [load]);

  return { suppliers, isLoading, refresh: load, createSupplier, updateSupplier, deleteSupplier };
}

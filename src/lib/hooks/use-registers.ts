// src/lib/hooks/use-registers.ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { getDB, type LocalCashRegister } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";

export type RegisterWithEmployee = LocalCashRegister & { employee?: { name: string } };

export function useRegisters(search?: string) {
  const [registers, setRegisters] = useState<RegisterWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const shop = useAuthStore((s) => s.currentShop);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    try {
      const db = getDB();
      let query = db.cashRegisters.where("shop_id").equals(shop.id);
      let results = await query.toArray();

      if (search) {
        const s = search.toLowerCase();
        results = results.filter((reg) => 
          reg.name.toLowerCase().includes(s) || 
          reg.code.toLowerCase().includes(s)
        );
      }

      // Populate employee names manually (Dexie doesn't auto-join)
      const populated: RegisterWithEmployee[] = [];
      for (const r of results) {
        let employeeObj = undefined;
        if (r.assigned_employee_id) {
            const emp = await db.employees.get(r.assigned_employee_id);
            if (emp) {
                employeeObj = { name: emp.name };
            }
        }
        populated.push({ ...r, employee: employeeObj });
      }

      populated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRegisters(populated);
    } finally {
      setIsLoading(false);
    }
  }, [shop?.id, search]);

  useEffect(() => { load(); }, [load]);

  const createRegister = useCallback(async (data: { name: string; code: string; pin?: string; location?: string; notes?: string; assigned_employee_id?: string }) => {
    if (!shop?.id) return null;
    const db = getDB();
    const now = new Date().toISOString();
    const register: LocalCashRegister = {
      id: uuid(),
      shop_id: shop.id,
      name: data.name,
      code: data.code,
      status: "active",
      assigned_employee_id: data.assigned_employee_id || undefined,
      location: data.location || undefined,
      sync_status: "pending",
      created_at: now,
      updated_at: now,
    };
    
    // We can store pin in notes or an extended field if needed, but schema doesn't have pin explicitly for registers.
    // Let's store it in a mock-safe way if needed, or omit if schema doesn't support. Schema has no 'pin' or 'notes'.

    await db.cashRegisters.add(register);
    await enqueueSync("registers", register.id, "create", register); // Sync will send it to Supabase registers table
    await load();
    return register;
  }, [shop?.id, load]);

  const updateRegister = useCallback(async (id: string, changes: Partial<LocalCashRegister>) => {
    const db = getDB();
    const now = new Date().toISOString();
    
    // Handle null values to undefined for Dexie compatibility if needed
    const safeChanges: any = { ...changes };
    if (safeChanges.assigned_employee_id === null) safeChanges.assigned_employee_id = undefined;

    const updated = { ...safeChanges, updated_at: now, sync_status: "pending" as const };
    await db.cashRegisters.update(id, updated);
    const full = await db.cashRegisters.get(id);
    if (full) await enqueueSync("registers", id, "update", full);
    await load();
  }, [load]);

  const deleteRegister = useCallback(async (id: string) => {
    const db = getDB();
    await db.cashRegisters.delete(id);
    await enqueueSync("registers", id, "delete", { id });
    await load();
  }, [load]);

  return { registers, isLoading, refresh: load, createRegister, updateRegister, deleteRegister };
}

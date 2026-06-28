// src/lib/hooks/use-employees.ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { getDB, type LocalEmployee } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";

export function useEmployees(search?: string) {
  const [employees, setEmployees] = useState<LocalEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const shop = useAuthStore((s) => s.currentShop);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    try {
      const db = getDB();
      let query = db.employees.where("shop_id").equals(shop.id);
      let results = await query.toArray();

      if (search) {
        const s = search.toLowerCase();
        results = results.filter((emp) => 
          emp.name.toLowerCase().includes(s) || 
          (emp.phone && emp.phone.includes(s)) ||
          (emp.email && emp.email.includes(s)) ||
          emp.role.toLowerCase().includes(s)
        );
      }

      results.sort((a, b) => a.name.localeCompare(b.name, "fr"));
      setEmployees(results);
    } finally {
      setIsLoading(false);
    }
  }, [shop?.id, search]);

  useEffect(() => { load(); }, [load]);

  const createEmployee = useCallback(async (data: { name: string; role: string; phone?: string; email?: string; pin?: string }) => {
    if (!shop?.id) return null;
    const db = getDB();
    const now = new Date().toISOString();
    const employee: LocalEmployee = {
      id: uuid(),
      shop_id: shop.id,
      name: data.name,
      role: data.role,
      phone: data.phone,
      email: data.email,
      pin: data.pin,
      status: "active",
      sync_status: "pending",
      created_at: now,
      updated_at: now,
    };
    await db.employees.add(employee);
    await enqueueSync("employees", employee.id, "create", employee);
    await load();
    return employee;
  }, [shop?.id, load]);

  const updateEmployee = useCallback(async (id: string, changes: Partial<LocalEmployee>) => {
    const db = getDB();
    const now = new Date().toISOString();
    const updated = { ...changes, updated_at: now, sync_status: "pending" as const };
    await db.employees.update(id, updated);
    const full = await db.employees.get(id);
    if (full) await enqueueSync("employees", id, "update", full);
    await load();
  }, [load]);

  const deleteEmployee = useCallback(async (id: string) => {
    const db = getDB();
    // In many POS systems, employees are archived instead of deleted, but we'll follow standard delete here
    // or just change status to inactive based on schema. LocalEmployee has status: "active" | "inactive" | "suspended"
    const now = new Date().toISOString();
    await db.employees.update(id, { status: "inactive", updated_at: now, sync_status: "pending" as const });
    const full = await db.employees.get(id);
    if (full) await enqueueSync("employees", id, "update", full);
    await load();
  }, [load]);

  return { employees, isLoading, refresh: load, createEmployee, updateEmployee, deleteEmployee };
}

// src/lib/hooks/use-customers.ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { getDB, type LocalCustomer, type LocalCredit, type LocalCashMovement } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";

export function useCustomers(search?: string) {
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const shop = useAuthStore((s) => s.currentShop);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    try {
      const db = getDB();
      let query = db.customers.where("shop_id").equals(shop.id);
      let results = await query.toArray();

      if (search) {
        const s = search.toLowerCase();
        results = results.filter((c) => 
          c.name.toLowerCase().includes(s) || 
          (c.phone && c.phone.includes(s))
        );
      }

      results.sort((a, b) => a.name.localeCompare(b.name, "fr"));
      setCustomers(results.filter(c => c.is_active));
    } finally {
      setIsLoading(false);
    }
  }, [shop?.id, search]);

  useEffect(() => { load(); }, [load]);

  const createCustomer = useCallback(async (data: { name: string; phone?: string; email?: string; address?: string; credit_limit?: number }) => {
    if (!shop?.id) return null;
    const db = getDB();
    const now = new Date().toISOString();
    const customer: LocalCustomer = {
      id: uuid(),
      shop_id: shop.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      credit_limit: data.credit_limit || 0,
      current_debt: 0,
      total_purchases: 0,
      points: 0,
      status: "active",
      is_active: true,
      sync_status: "pending",
      created_at: now,
      updated_at: now,
    };
    await db.customers.add(customer);
    await enqueueSync("customers", customer.id, "create", customer);
    await load();
    return customer;
  }, [shop?.id, load]);

  const updateCustomer = useCallback(async (id: string, changes: Partial<LocalCustomer>) => {
    const db = getDB();
    const now = new Date().toISOString();
    const updated = { ...changes, updated_at: now, sync_status: "pending" as const };
    await db.customers.update(id, updated);
    const full = await db.customers.get(id);
    if (full) await enqueueSync("customers", id, "update", full);
    await load();
  }, [load]);

  const payDebt = useCallback(async (customerId: string, amount: number, paymentMethod: "cash" | "mobile_money" | "bank_transfer") => {
    if (!shop?.id || amount <= 0) return;
    const db = getDB();
    const now = new Date().toISOString();

    await db.transaction("rw", [db.customers, db.credits, db.cashMovements, db.syncQueue], async () => {
      const customer = await db.customers.get(customerId);
      if (!customer) throw new Error("Customer not found");

      let remainingToPay = amount;

      // Find unpaid credits sorted by oldest first
      const unpaidCredits = await db.credits
        .where("customer_id").equals(customerId)
        .filter(c => c.status === "active" || c.status === "overdue")
        .sortBy("created_at");

      for (const credit of unpaidCredits) {
        if (remainingToPay <= 0) break;
        
        const payAmount = Math.min(credit.remaining_amount, remainingToPay);
        remainingToPay -= payAmount;
        
        const newRemaining = credit.remaining_amount - payAmount;
        const newStatus = newRemaining <= 0 ? "paid" : credit.status;

        await db.credits.update(credit.id, {
          remaining_amount: newRemaining,
          status: newStatus,
          updated_at: now,
          sync_status: "pending"
        });
        
        const updatedCredit = await db.credits.get(credit.id);
        if (updatedCredit) await enqueueSync("credits", credit.id, "update", updatedCredit);
      }

      // Decrease customer's total current_debt
      const newDebt = Math.max(0, customer.current_debt - amount);
      await db.customers.update(customerId, {
        current_debt: newDebt,
        updated_at: now,
        sync_status: "pending"
      });
      const updatedCustomer = await db.customers.get(customerId);
      if (updatedCustomer) await enqueueSync("customers", customerId, "update", updatedCustomer);

      // Record Cash Movement
      const cashMove: LocalCashMovement = {
        id: uuid(),
        shop_id: shop.id,
        type: "credit_payment",
        payment_method: paymentMethod,
        amount: amount,
        session_id: "",
        user_id: customerId, // reference to who paid
        reason: "Remboursement de dette",
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      };
      await db.cashMovements.add(cashMove);
      await enqueueSync("cash_movements", cashMove.id, "create", cashMove);
    });

    await load();
  }, [shop?.id, load]);

  return { customers, isLoading, refresh: load, createCustomer, updateCustomer, payDebt };
}


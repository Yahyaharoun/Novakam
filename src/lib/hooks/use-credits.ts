"use client";

import { useCallback, useState, useEffect } from "react";
import { getDB, type LocalCredit, type LocalCashMovement } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";
import type { PaymentMethod } from "@/lib/supabase/database.types";

export interface CreditWithCustomer extends LocalCredit {
  customerName: string;
  customerPhone?: string;
}

export function useCredits() {
  const shop = useAuthStore((s) => s.currentShop);
  const user = useAuthStore((s) => s.user);

  const [credits, setCredits] = useState<CreditWithCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCredits = useCallback(async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    try {
      const db = getDB();
      const dbCredits = await db.credits.where("shop_id").equals(shop.id).reverse().sortBy("created_at");
      const dbCustomers = await db.customers.where("shop_id").equals(shop.id).toArray();
      const customerMap = new Map(dbCustomers.map(c => [c.id, c]));

      const enriched = dbCredits.map(c => {
        const cust = customerMap.get(c.customer_id);
        return {
          ...c,
          customerName: cust?.name || "Client inconnu",
          customerPhone: cust?.phone || ""
        };
      });

      setCredits(enriched);
    } finally {
      setIsLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { loadCredits(); }, [loadCredits]);

  const createCredit = useCallback(async (params: { customerName: string, phone?: string, amount: number, dueDate?: string }) => {
    if (!shop?.id) return;
    const db = getDB();
    const now = new Date().toISOString();
    
    await db.transaction("rw", [db.customers, db.credits, db.syncQueue], async () => {
       // create customer on the fly
       const newCustomer = {
         id: uuid(),
         shop_id: shop.id,
         name: params.customerName,
         phone: params.phone || "",
         credit_limit: 0,
         total_purchases: 0,
         current_debt: params.amount,
         points: 0,
         status: "active" as const,
         is_active: true,
         sync_status: "pending" as const,
         created_at: now,
         updated_at: now,
       };
       await db.customers.add(newCustomer);
       await enqueueSync("customers", newCustomer.id, "create", newCustomer);

       const credit: LocalCredit = {
         id: uuid(),
         shop_id: shop.id,
         customer_id: newCustomer.id,
         sale_id: "",
         original_amount: params.amount,
         amount: params.amount,
         remaining_amount: params.amount,
         due_date: params.dueDate,
         status: "active",
         sync_status: "pending",
         created_at: now,
         updated_at: now
       };
       await db.credits.add(credit);
       await enqueueSync("credits", credit.id, "create", credit);
    });

    await loadCredits();
  }, [shop?.id, loadCredits]);

  const deleteCredit = useCallback(async (credit_id: string) => {
    const db = getDB();
    await db.transaction("rw", [db.credits, db.customers, db.syncQueue], async () => {
      const credit = await db.credits.get(credit_id);
      if (credit) {
        const customer = await db.customers.get(credit.customer_id);
        if (customer) {
          await db.customers.update(customer.id, {
            current_debt: Math.max(0, customer.current_debt - credit.remaining_amount),
            updated_at: new Date().toISOString(),
            sync_status: "pending"
          });
          const updated = await db.customers.get(customer.id);
          if (updated) await enqueueSync("customers", customer.id, "update", updated);
        }
        await db.credits.delete(credit_id);
        await enqueueSync("credits", credit_id, "delete", { id: credit_id });
      }
    });
    await loadCredits();
  }, [loadCredits]);

  const markAsPaid = useCallback(async (credit_id: string) => {
    if (!shop?.id) return;
    const db = getDB();
    const now = new Date().toISOString();
    await db.transaction("rw", [db.credits, db.customers, db.cashMovements, db.syncQueue], async () => {
      const credit = await db.credits.get(credit_id);
      if (!credit) return;
      
      const paidAmount = credit.remaining_amount;
      await db.credits.update(credit_id, {
        remaining_amount: 0,
        status: "paid",
        updated_at: now,
        sync_status: "pending"
      });
      const updatedCredit = await db.credits.get(credit_id);
      if (updatedCredit) await enqueueSync("credits", credit.id, "update", updatedCredit);

      const customer = await db.customers.get(credit.customer_id);
      if (customer) {
        await db.customers.update(customer.id, {
          current_debt: Math.max(0, customer.current_debt - paidAmount),
          updated_at: now,
          sync_status: "pending"
        });
        const updated = await db.customers.get(customer.id);
        if (updated) await enqueueSync("customers", customer.id, "update", updated);
      }

      const movement: LocalCashMovement = {
        id: uuid(),
        shop_id: shop.id,
        session_id: "",
        type: "credit_payment",
        amount: paidAmount,
        reason: "Remboursement de crédit",
        user_id: credit.customer_id,
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      };
      await db.cashMovements.add(movement);
      await enqueueSync("cash_movements", movement.id, "create", movement);
    });
    await loadCredits();
  }, [shop?.id, loadCredits]);

  return { credits, isLoading, createCredit, deleteCredit, markAsPaid, refresh: loadCredits };
}

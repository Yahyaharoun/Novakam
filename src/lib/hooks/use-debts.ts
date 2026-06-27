// src/lib/hooks/use-debts.ts
"use client";

import { useCallback, useState, useEffect } from "react";
import { getDB, type LocalDebt, type LocalCashMovement } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";
import type { PaymentMethod } from "@/lib/supabase/database.types";

export function useDebts() {
  const shop = useAuthStore((s) => s.currentShop);
  const user = useAuthStore((s) => s.user);

  const [debts, setDebts] = useState<LocalDebt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDebts = useCallback(async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    try {
      const db = getDB();

      // Migrate mock debts from local storage if they haven't been migrated yet
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem("novakam-mock-suppliers");
        if (saved) {
          const suppliers = JSON.parse(saved);
          for (const s of suppliers) {
            if (s.remaining_debt > 0) {
              const existingDebt = await db.debts
                .where("supplier_id").equals(s.id)
                .filter(d => d.shop_id === shop.id)
                .first();
              if (!existingDebt) {
                const now = new Date().toISOString();
                const debt: LocalDebt = {
                  id: uuid(),
                  shop_id: shop.id,
                  supplier_id: s.id,
                  amount: s.remaining_debt,
                  remaining_amount: s.remaining_debt,
                  status: "active",
                  sync_status: "pending",
                  created_at: now,
                  updated_at: now
                };
                await db.debts.add(debt);
              }
            }
          }
        }
      }

      // Load all debts for the shop
      const results = await db.debts
        .where("shop_id").equals(shop.id)
        .reverse()
        .sortBy("created_at");
      setDebts(results);
    } finally {
      setIsLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  /**
   * Repay a portion or all of a supplier's debt
   */
  const repayDebt = useCallback(async (params: {
    debt_id: string;
    amount: number;
    payment_method: PaymentMethod;
  }) => {
    if (!shop?.id || !user?.id) throw new Error("Missing context");
    
    const db = getDB();
    const now = new Date().toISOString();

    await db.transaction("rw", [db.debts, db.cashMovements, db.cashRegisterSessions, db.syncQueue], async () => {
      const debt = await db.debts.get(params.debt_id);
      if (!debt) throw new Error("Debt not found");

      const newRemaining = debt.remaining_amount - params.amount;
      const status = newRemaining <= 0 ? "paid" : debt.status;

      // 1. Update Debt
      await db.debts.update(debt.id, {
        remaining_amount: Math.max(0, newRemaining),
        status,
        updated_at: now,
        sync_status: "pending",
      });
      const updatedDebt = await db.debts.get(debt.id);
      if (updatedDebt) await enqueueSync("debts", debt.id, "update", updatedDebt);

      // 2. Update Supplier Debt in localStorage
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("novakam-mock-suppliers");
        if (saved) {
          const suppliers = JSON.parse(saved);
          const updatedSuppliers = suppliers.map((s: any) => {
            if (s.id === debt.supplier_id) {
              return { ...s, remaining_debt: Math.max(0, s.remaining_debt - params.amount) };
            }
            return s;
          });
          localStorage.setItem("novakam-mock-suppliers", JSON.stringify(updatedSuppliers));
        }
      }

      // 3. Generate Cash Movement (Expense/Withdrawal)
      let sessionId = undefined;
      if (params.payment_method === "cash") {
        const activeSession = await db.cashRegisterSessions
          .where("shop_id").equals(shop.id)
          .filter(s => s.status === "open")
          .first();
        sessionId = activeSession?.id;
      }

      const movement: LocalCashMovement = {
        id: uuid(),
        shop_id: shop.id,
        session_id: sessionId || "",
        type: "supplier_payment",
        amount: -params.amount, // Negative amount for cash register
        reason: `Remboursement dette fournisseur`,
        reference_id: debt.id,
        user_id: user.id,
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      };

      await db.cashMovements.add(movement);
      await enqueueSync("cashMovements", movement.id, "create", movement);
    });

    await loadDebts();
  }, [shop?.id, user?.id, loadDebts]);

  const createDebt = useCallback(async (params: { supplier_id: string, amount: number }) => {
    if (!shop?.id) return;
    const db = getDB();
    const now = new Date().toISOString();
    const debt: LocalDebt = {
      id: uuid(),
      shop_id: shop.id,
      supplier_id: params.supplier_id,
      amount: params.amount,
      remaining_amount: params.amount,
      status: "active",
      sync_status: "pending",
      created_at: now,
      updated_at: now
    };
    await db.debts.add(debt);
    await enqueueSync("debts", debt.id, "create", debt);

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("novakam-mock-suppliers");
      if (saved) {
        const suppliers = JSON.parse(saved);
        const updatedSuppliers = suppliers.map((s: any) => {
          if (s.id === params.supplier_id) {
            return { ...s, remaining_debt: s.remaining_debt + params.amount };
          }
          return s;
        });
        localStorage.setItem("novakam-mock-suppliers", JSON.stringify(updatedSuppliers));
      }
    }

    await loadDebts();
  }, [shop?.id, loadDebts]);

  const deleteDebt = useCallback(async (debt_id: string) => {
    const db = getDB();
    await db.debts.delete(debt_id);
    await enqueueSync("debts", debt_id, "delete", { id: debt_id });
    await loadDebts();
  }, [loadDebts]);

  return { debts, isLoading, repayDebt, createDebt, deleteDebt, refresh: loadDebts };
}

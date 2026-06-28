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

      // 2. Generate Cash Movement (Expense/Withdrawal)
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

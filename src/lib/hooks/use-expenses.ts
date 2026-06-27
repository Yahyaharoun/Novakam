// src/lib/hooks/use-expenses.ts
"use client";

import { useCallback, useState, useEffect } from "react";
import { getDB, type LocalExpense, type LocalCashMovement } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";
import type { ExpenseCategory, PaymentMethod } from "@/lib/supabase/database.types";

export function useExpenses() {
  const shop = useAuthStore((s) => s.currentShop);
  const user = useAuthStore((s) => s.user);
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadExpenses = useCallback(async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    try {
      const db = getDB();
      const results = await db.expenses.where("shop_id").equals(shop.id).reverse().sortBy("spent_at");
      setExpenses(results);
    } finally {
      setIsLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const addExpense = useCallback(async (params: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    payment_method: PaymentMethod;
    beneficiary?: string;
    notes?: string;
  }) => {
    if (!shop?.id || !user?.id) throw new Error("Missing context");
    
    const db = getDB();
    const now = new Date().toISOString();

    const expense: LocalExpense = {
      id: uuid(),
      shop_id: shop.id,
      category: params.category,
      description: params.description,
      amount: params.amount,
      payment_method: params.payment_method,
      beneficiary: params.beneficiary,
      sync_status: "pending",
      spent_at: now,
      created_at: now,
      updated_at: now,
    };

    await db.transaction("rw", [db.expenses, db.cashMovements, db.cashRegisterSessions, db.syncQueue], async () => {
      // 1. Add expense
      await db.expenses.add(expense);
      await enqueueSync("expenses", expense.id, "create", expense);

      // 2. If it's a cash expense, it impacts the current cash register session
      if (params.payment_method === "cash") {
        const activeSession = await db.cashRegisterSessions
          .where("shop_id").equals(shop.id)
          .filter(s => s.status === "open")
          .first();

        const movement: LocalCashMovement = {
          id: uuid(),
          shop_id: shop.id,
          session_id: activeSession?.id || "", // Can be empty if no open session
          type: "expense",
          payment_method: "cash",
          amount: params.amount,
          reference_id: expense.id,
          user_id: user.id,
          reason: params.description,
          sync_status: "pending",
          created_at: now,
          updated_at: now,
        };

        await db.cashMovements.add(movement);
        await enqueueSync("cashMovements", movement.id, "create", movement);
      }
    });

    await loadExpenses();
    return expense;
  }, [shop?.id, user?.id, loadExpenses]);

  return { expenses, isLoading, addExpense, refresh: loadExpenses };
}

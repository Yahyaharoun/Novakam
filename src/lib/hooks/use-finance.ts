// src/lib/hooks/use-finance.ts
"use client";

import { useCallback, useState } from "react";
import { getDB, type LocalCashRegisterSession, type LocalCashMovement } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";

export function useFinance() {
  const shop = useAuthStore((s) => s.currentShop);
  const user = useAuthStore((s) => s.user);

  /**
   * Calculate Financial Metrics dynamically (Zero Manual Calculation)
   * CA, Gross Profit, Net Profit, Stock Value
   */
  const getMetrics = useCallback(async (startDate?: string, endDate?: string) => {
    if (!shop?.id) return null;
    const db = getDB();

    // 1. Stock Value
    const products = await db.products.where("shop_id").equals(shop.id).toArray();
    const stockValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0);

    // 2. Revenue (CA) & Gross Profit
    let salesQuery = db.sales.where("shop_id").equals(shop.id);
    const allSales = await salesQuery.toArray();
    
    // Filter by date if provided (IndexedDB doesn't do great range queries on secondary indexes easily without compound keys)
    const sales = allSales.filter(s => {
      if (s.status !== "completed") return false;
      if (startDate && s.sold_at < startDate) return false;
      if (endDate && s.sold_at > endDate) return false;
      return true;
    });

    const revenue = sales.reduce((sum, s) => sum + s.total_amount, 0);

    // Gross profit needs saleItems to know the exact purchase_price at the time of sale
    let grossProfit = 0;
    for (const sale of sales) {
      const items = await db.saleItems.where("sale_id").equals(sale.id).toArray();
      grossProfit += items.reduce((sum, item) => sum + (item.total_price - (item.quantity * item.purchase_price)), 0);
    }

    // 3. Expenses & Net Profit
    let expensesQuery = db.expenses.where("shop_id").equals(shop.id);
    const allExpenses = await expensesQuery.toArray();
    const expenses = allExpenses.filter(e => {
      if (startDate && e.spent_at < startDate) return false;
      if (endDate && e.spent_at > endDate) return false;
      return true;
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    return {
      revenue,
      grossProfit,
      netProfit,
      totalExpenses,
      stockValue,
      salesCount: sales.length
    };
  }, [shop?.id]);

  /**
   * Open Cash Register Session
   */
  const openCashRegister = useCallback(async (cashRegisterId: string, openingBalance: number) => {
    if (!shop?.id || !user?.id) throw new Error("Missing context");
    
    const db = getDB();
    const now = new Date().toISOString();

    const session: LocalCashRegisterSession = {
      id: uuid(),
      shop_id: shop.id,
      cash_register_id: cashRegisterId,
      opened_by: user.id,
      opened_at: now,
      opening_balance: openingBalance,
      status: "open",
      sync_status: "pending",
      created_at: now,
      updated_at: now,
    };

    await db.cashRegisterSessions.add(session);
    await enqueueSync("cashRegisterSessions", session.id, "create", session);
    
    return session;
  }, [shop?.id, user?.id]);

  /**
   * Close Cash Register Session
   */
  const closeCashRegister = useCallback(async (sessionId: string, realClosingBalance: number) => {
    if (!shop?.id || !user?.id) throw new Error("Missing context");
    
    const db = getDB();
    const now = new Date().toISOString();

    await db.transaction("rw", [db.cashRegisterSessions, db.cashMovements, db.syncQueue], async () => {
      const session = await db.cashRegisterSessions.get(sessionId);
      if (!session) throw new Error("Session not found");
      if (session.status === "closed") throw new Error("Session already closed");

      // Calculate Expected Balance from Cash Movements
      const movements = await db.cashMovements.where("session_id").equals(sessionId).toArray();
      // Only CASH movements impact the physical drawer
      const cashMovements = movements.filter(m => m.payment_method === "cash");
      
      let expectedBalance = session.opening_balance;
      for (const m of cashMovements) {
        if (m.type === "sale_income" || m.type === "credit_payment" || m.type === "deposit") {
          expectedBalance += m.amount;
        } else if (m.type === "expense" || m.type === "debt_payment" || m.type === "withdrawal") {
          expectedBalance -= m.amount;
        }
      }

      const discrepancy = realClosingBalance - expectedBalance;

      // Close the session
      await db.cashRegisterSessions.update(sessionId, {
        closed_by: user.id,
        closed_at: now,
        expected_balance: expectedBalance,
        closing_balance: realClosingBalance,
        notes: `Discrepancy: ${discrepancy}`,
        status: "closed",
        updated_at: now,
        sync_status: "pending",
      });

      const updatedSession = await db.cashRegisterSessions.get(sessionId);
      if (updatedSession) {
        await enqueueSync("cashRegisterSessions", updatedSession.id, "update", updatedSession);
      }
    });
  }, [shop?.id, user?.id]);

  return { getMetrics, openCashRegister, closeCashRegister };
}

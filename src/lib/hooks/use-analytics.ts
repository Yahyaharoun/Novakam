// src/lib/hooks/use-analytics.ts
"use client";

import { useCallback, useState, useEffect } from "react";
import { getDB } from "@/lib/db/schema";
import { useAuthStore } from "@/lib/store/auth.store";

export interface SalesHistoryData {
  date: string;
  revenue: number;
  profit: number;
}

export interface CashFlowData {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface TopProductData {
  product_id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function useAnalytics() {
  const shop = useAuthStore((s) => s.currentShop);
  const [isLoading, setIsLoading] = useState(true);

  const [salesHistory, setSalesHistory] = useState<SalesHistoryData[]>([]);
  const [cashFlowHistory, setCashFlowHistory] = useState<CashFlowData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  
  // High-level KPIs
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalCredits: 0,
    totalDebts: 0,
  });

  const loadData = useCallback(async (days: number = 30) => {
    if (!shop?.id) return;
    setIsLoading(true);
    
    try {
      const db = getDB();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffStr = cutoffDate.toISOString();

      // 1. Fetch relevant data
      const [sales, saleItems, cashMovements, customers, products] = await Promise.all([
        db.sales.where("shop_id").equals(shop.id).filter(s => s.status === "completed" && s.sold_at >= cutoffStr).toArray(),
        db.saleItems.where("shop_id").equals(shop.id).filter(si => si.created_at >= cutoffStr).toArray(),
        db.cashMovements.where("shop_id").equals(shop.id).filter(cm => cm.created_at >= cutoffStr).toArray(),
        db.customers.where("shop_id").equals(shop.id).filter(c => c.is_active !== false).toArray(),
        db.products.where("shop_id").equals(shop.id).toArray()
      ]);

      // --- KPI Calculation ---
      let totalRev = 0;
      let totalProfit = 0;

      // Group sales by date for history
      const salesMap = new Map<string, SalesHistoryData>();
      const cashFlowMap = new Map<string, CashFlowData>();
      const saleToDateMap = new Map<string, string>(); // Helper to map saleItems back to date

      // Pre-fill the last N days with 0 so the charts always render (even with no data)
      for (let i = days; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toLocaleDateString("fr-CA");
        salesMap.set(dateKey, { date: dateKey, revenue: 0, profit: 0 });
        cashFlowMap.set(dateKey, { date: dateKey, inflow: 0, outflow: 0, net: 0 });
      }

      for (const sale of sales) {
        totalRev += sale.total_amount;
        const dateKey = new Date(sale.sold_at).toLocaleDateString("fr-CA"); // YYYY-MM-DD
        saleToDateMap.set(sale.id, dateKey);

        if (!salesMap.has(dateKey)) {
          salesMap.set(dateKey, { date: dateKey, revenue: 0, profit: 0 });
        }
        const sData = salesMap.get(dateKey)!;
        sData.revenue += sale.total_amount;
      }

      // --- Top Products & Profit Calculation ---
      const productMap = new Map<string, TopProductData>();

      for (const item of saleItems) {
        const itemProfit = item.total_price - (item.quantity * item.purchase_price);
        totalProfit += itemProfit;

        // Map profit to the specific date
        const dateKey = saleToDateMap.get(item.sale_id);
        if (dateKey && salesMap.has(dateKey)) {
          salesMap.get(dateKey)!.profit += itemProfit;
        }

        // Top products grouping
        if (!item.product_id) continue;
        if (!productMap.has(item.product_id)) {
          productMap.set(item.product_id, {
            product_id: item.product_id,
            name: item.product_name,
            quantity: 0,
            revenue: 0
          });
        }
        const pData = productMap.get(item.product_id)!;
        pData.quantity += item.quantity;
        pData.revenue += item.total_price;
      }

      // Prepare Top Products array (Sort by revenue)
      const topArr = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10

      // --- Cash Flow Calculation ---
      for (const move of cashMovements) {
        const dateKey = new Date(move.created_at).toLocaleDateString("fr-CA");
        if (!cashFlowMap.has(dateKey)) {
          cashFlowMap.set(dateKey, { date: dateKey, inflow: 0, outflow: 0, net: 0 });
        }
        const cData = cashFlowMap.get(dateKey)!;

        if (["sale_income", "credit_payment", "deposit"].includes(move.type)) {
          cData.inflow += move.amount;
        } else {
          cData.outflow += move.amount;
        }
        cData.net = cData.inflow - cData.outflow;
      }

      // --- Credits & Debts ---
      const totalCredits = customers.reduce((sum, c) => sum + (c.current_debt || 0), 0);
      
      // Debts (Fournisseurs) usually need to be calculated similarly, but we haven't implemented supplier debts deeply yet in M7 UI, 
      // though the table exists. We'll default to 0 for now or sum if there are any.
      const debtsQuery = await db.table('debts').where("shop_id").equals(shop.id).filter((d: any) => d.status === 'active').toArray();
      const totalDebts = debtsQuery.reduce((sum: number, d: any) => sum + d.amount, 0);

      // --- Set State ---
      // Sort history chronologically
      setSalesHistory(Array.from(salesMap.values()).sort((a, b) => a.date.localeCompare(b.date)));
      setCashFlowHistory(Array.from(cashFlowMap.values()).sort((a, b) => a.date.localeCompare(b.date)));
      setTopProducts(topArr);
      
      setKpis({
        totalRevenue: totalRev,
        totalProfit: totalProfit,
        totalCredits: totalCredits,
        totalDebts: totalDebts
      });

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => {
    loadData(30); // Default to 30 days
  }, [loadData]);

  return {
    kpis,
    salesHistory,
    cashFlowHistory,
    topProducts,
    isLoading,
    refresh: loadData
  };
}

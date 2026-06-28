// src/lib/hooks/use-sales.ts
"use client";

import { useCallback } from "react";
import { getDB, type LocalSale, type LocalSaleItem, type LocalCredit } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";
import type { CartItem } from "@/lib/store/cart.store";
import type { PaymentMethod } from "@/lib/supabase/database.types";


export type PaymentSplit = {
  method: PaymentMethod;
  amount: number;
};

export function useSales() {
  const shop = useAuthStore((s) => s.currentShop);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.currentRole);

  const generateSaleNumber = useCallback(async (_shopId: string) => {
    // Format: S-YYYYMMDD-HHMMSS-XXXX
    // Guaranteed unique offline: timestamp (seconds-level) + 4 random hex chars
    // Collision probability in the same second on the same device: 1/65536 — acceptable for POS.
    const now = new Date();
    const datePart = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const timePart = String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const randomPart = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return `S-${datePart}-${timePart}-${randomPart}`;
  }, []);


  const processSale = useCallback(async (params: {
    items: CartItem[];
    subtotal: number;
    discountAmount: number;
    total: number;
    payments: PaymentSplit[];
    customerId?: string;
    notes?: string;
  }) => {
    if (!shop?.id || !user?.id) throw new Error("Missing shop or user context");
    
    const db = getDB();
    const saleId = uuid();
    const saleNumber = await generateSaleNumber(shop.id);
    const now = new Date().toISOString();

    // Calculate total paid
    const paidAmount = params.payments.reduce((sum, p) => sum + p.amount, 0);
    const isCredit = paidAmount < params.total;
    const mainPaymentMethod = params.payments.length > 0 ? params.payments[0].method : "cash";

    const newSale: LocalSale = {
      id: saleId,
      shop_id: shop.id,
      customer_id: params.customerId,
      employee_id: user.id, // Assuming user acts as employee/cashier
      sale_number: saleNumber,
      subtotal: params.subtotal,
      discount_amount: params.discountAmount,
      tax_amount: 0, // Not implemented yet
      total_amount: params.total,
      amount_paid: paidAmount,
      change_amount: paidAmount > params.total ? paidAmount - params.total : 0,
      payment_status: paidAmount >= params.total ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
      status: "completed",
      sync_status: "pending",
      sold_at: now,
      created_at: now,
      updated_at: now,
    };

    const newSaleItems: LocalSaleItem[] = params.items.map((item) => ({
      id: uuid(),
      sale_id: saleId,
      shop_id: shop.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      purchase_price: item.purchase_price,
      discount_amount: item.discount,
      tax_amount: 0,
      total_price: item.total_price,
      sync_status: "pending",
      created_at: now,
      updated_at: now,
    }));

    let newCredit: LocalCredit | null = null;
    if (isCredit) {
      if (!params.customerId) throw new Error("Customer required for credit sales");
      newCredit = {
        id: uuid(),
        shop_id: shop.id,
        customer_id: params.customerId,
        sale_id: saleId,
        amount: params.total,
        original_amount: params.total,
        remaining_amount: params.total - paidAmount,
        status: "active",
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      };
    }

    // Atomic transaction for local DB
    await db.transaction("rw", [db.sales, db.saleItems, db.products, db.credits, db.customers, db.syncQueue], async () => {
      
      // Verification Credit Limit
      let customer = params.customerId ? await db.customers.get(params.customerId) : undefined;
      
      if (isCredit && customer) {
        const potentialDebt = customer.current_debt + (params.total - paidAmount);
        // If credit_limit is 0, we assume no credit allowed OR unlimited depending on logic?
        // Let's say if credit_limit is 0, credit is strictly forbidden.
        // If limit is > 0 and potentialDebt > limit, block if cashier.
        if (customer.credit_limit === 0) {
          throw new Error("Crédit non autorisé pour ce client (Limite = 0).");
        }
        if (potentialDebt > customer.credit_limit) {
          if (role === "cashier") {
            throw new Error(`Limite de crédit dépassée. Dette potentielle: ${potentialDebt}. Limite: ${customer.credit_limit}. L'intervention d'un superviseur est requise.`);
          }
          // If admin, it's a soft limit, we allow it.
        }
      }

      // Calculate points
      const pointsEarned = Math.floor(params.total / 100);

      // 1. Save Sale
      await db.sales.add(newSale);
      await enqueueSync("sales", newSale.id, "create", newSale);

      // 2. Save Sale Items
      for (const item of newSaleItems) {
        await db.saleItems.add(item);
        await enqueueSync("saleItems", item.id, "create", item);
        
        // 3. Decrement Stock
        if (item.product_id) {
          const product = await db.products.get(item.product_id);
          if (product && product.track_stock) {
            const newQty = product.stock_quantity - item.quantity;
            await db.products.update(product.id, { 
              stock_quantity: newQty,
              updated_at: now,
              sync_status: "pending" 
            });
            // We enqueue the product update to sync the new stock
            const updatedProduct = await db.products.get(product.id);
            if (updatedProduct) {
               await enqueueSync("products", product.id, "update", updatedProduct);
            }
          }
        }
      }

      // 4. Handle Credit & Customer
      if (customer) {
        if (newCredit) {
          await db.credits.add(newCredit);
          await enqueueSync("credits", newCredit.id, "create", newCredit);
          
          await db.customers.update(customer.id, {
            current_debt: customer.current_debt + newCredit.remaining_amount,
            total_purchases: customer.total_purchases + newCredit.original_amount,
            points: customer.points + pointsEarned,
            updated_at: now,
            sync_status: "pending"
          });
        } else {
          // Cash sale
          await db.customers.update(customer.id, {
            total_purchases: customer.total_purchases + params.total,
            points: customer.points + pointsEarned,
            updated_at: now,
            sync_status: "pending"
          });
        }
        const updatedCustomer = await db.customers.get(customer.id);
        if (updatedCustomer) {
          await enqueueSync("customers", customer.id, "update", updatedCustomer);
        }
      }
    });

    return newSale;
  }, [shop?.id, user?.id, generateSaleNumber]);

  return { processSale };
}

// src/lib/hooks/use-inventory.ts
"use client";

import { useCallback } from "react";
import { getDB, type LocalStockMovement } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";

export function useInventory() {
  const shop = useAuthStore((s) => s.currentShop);
  const user = useAuthStore((s) => s.user);

  /**
   * Adjust Stock (Theoretical vs Real)
   * Calculates the delta and updates the current stock.
   */
  const adjustStock = useCallback(async (params: {
    product_id: string;
    variant_id?: string;
    batch_id?: string;
    real_quantity: number;
    reason: string;
  }) => {
    if (!shop?.id || !user?.id) throw new Error("Missing context");
    
    const db = getDB();
    const now = new Date().toISOString();

    await db.transaction("rw", [db.products, db.productVariants, db.productBatches, db.stockMovements, db.syncQueue], async () => {
      // 1. Get current theoretical stock
      let currentStock = 0;
      if (params.variant_id) {
        const variant = await db.productVariants.get(params.variant_id);
        if (!variant) throw new Error("Variant not found");
        currentStock = variant.stock_quantity;
      } else if (params.batch_id) {
        const batch = await db.productBatches.get(params.batch_id);
        if (!batch) throw new Error("Batch not found");
        currentStock = batch.stock_quantity;
      } else {
        const product = await db.products.get(params.product_id);
        if (!product) throw new Error("Product not found");
        currentStock = product.stock_quantity;
      }

      // 2. Calculate Delta
      const delta = params.real_quantity - currentStock;
      if (delta === 0) return; // No adjustment needed

      // 3. Create Movement
      const movement: LocalStockMovement = {
        id: uuid(),
        shop_id: shop.id,
        product_id: params.product_id,
        variant_id: params.variant_id,
        batch_id: params.batch_id,
        user_id: user.id,
        type: "inventory_adjustment",
        quantity: delta,
        reason: params.reason,
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      };

      await db.stockMovements.add(movement);
      await enqueueSync("stockMovements", movement.id, "create", movement);

      // 4. Update Current Stock Cache
      if (params.variant_id) {
        await db.productVariants.update(params.variant_id, { stock_quantity: params.real_quantity, updated_at: now, sync_status: "pending" });
        const updated = await db.productVariants.get(params.variant_id);
        if (updated) await enqueueSync("productVariants", updated.id, "update", updated);
      } else if (params.batch_id) {
        await db.productBatches.update(params.batch_id, { stock_quantity: params.real_quantity, updated_at: now, sync_status: "pending" });
        const updated = await db.productBatches.get(params.batch_id);
        if (updated) await enqueueSync("productBatches", updated.id, "update", updated);
      } else {
        await db.products.update(params.product_id, { stock_quantity: params.real_quantity, updated_at: now, sync_status: "pending" });
        const updated = await db.products.get(params.product_id);
        if (updated) await enqueueSync("products", updated.id, "update", updated);
      }
    });

  }, [shop?.id, user?.id]);

  /**
   * Receive Stock (e.g., from a supplier)
   */
  const receiveStock = useCallback(async (params: {
    product_id: string;
    variant_id?: string;
    batch_id?: string;
    quantity: number;
    reference_doc?: string;
  }) => {
    if (!shop?.id || !user?.id) throw new Error("Missing context");
    
    const db = getDB();
    const now = new Date().toISOString();

    await db.transaction("rw", [db.products, db.productVariants, db.productBatches, db.stockMovements, db.syncQueue], async () => {
      
      const movement: LocalStockMovement = {
        id: uuid(),
        shop_id: shop.id,
        product_id: params.product_id,
        variant_id: params.variant_id,
        batch_id: params.batch_id,
        user_id: user.id,
        type: "purchase_receive",
        quantity: params.quantity, // Positive
        reference_doc: params.reference_doc,
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      };

      await db.stockMovements.add(movement);
      await enqueueSync("stockMovements", movement.id, "create", movement);

      // Update Stock Cache
      if (params.variant_id) {
        const variant = await db.productVariants.get(params.variant_id);
        if (variant) {
           await db.productVariants.update(params.variant_id, { stock_quantity: variant.stock_quantity + params.quantity, updated_at: now, sync_status: "pending" });
           const updated = await db.productVariants.get(params.variant_id);
           if (updated) await enqueueSync("productVariants", updated.id, "update", updated);
        }
      } else if (params.batch_id) {
        const batch = await db.productBatches.get(params.batch_id);
        if (batch) {
           await db.productBatches.update(params.batch_id, { stock_quantity: batch.stock_quantity + params.quantity, updated_at: now, sync_status: "pending" });
           const updated = await db.productBatches.get(params.batch_id);
           if (updated) await enqueueSync("productBatches", updated.id, "update", updated);
        }
      } else {
        const product = await db.products.get(params.product_id);
        if (product) {
           await db.products.update(params.product_id, { stock_quantity: product.stock_quantity + params.quantity, updated_at: now, sync_status: "pending" });
           const updated = await db.products.get(params.product_id);
           if (updated) await enqueueSync("products", updated.id, "update", updated);
        }
      }
    });

  }, [shop?.id, user?.id]);

  /**
   * Get Movement History for a specific product
   */
  const getProductHistory = useCallback(async (product_id: string) => {
    const db = getDB();
    return await db.stockMovements.where("product_id").equals(product_id).reverse().sortBy("created_at");
  }, []);

  return { adjustStock, receiveStock, getProductHistory };
}

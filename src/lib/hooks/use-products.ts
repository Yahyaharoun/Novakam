// src/lib/hooks/use-products.ts
// Offline-first CRUD pour les produits
"use client";
import { useCallback, useEffect, useState } from "react";
import { getDB, type LocalProduct } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuid } from "uuid";
import type { LocalProductVariant, LocalProductBatch } from "@/lib/db/schema";
import { useLiveQuery } from "dexie-react-hooks";

export type ProductFilter = {
  search?: string;
  category_id?: string;
  lowStock?: boolean;
  isActive?: boolean;
};

export function useProducts(filter?: ProductFilter) {
  const { currentShop: shop } = useAuthStore();

  const products = useLiveQuery(
    async () => {
      if (!shop?.id) return [];
      const db = getDB();
      let query = db.products.where("shop_id").equals(shop.id);
      let results = await query.toArray();

      if (filter?.search) {
        const s = filter.search.toLowerCase();
        results = results.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            p.sku?.toLowerCase().includes(s) ||
            p.barcode?.toLowerCase().includes(s) ||
            p.internal_reference?.toLowerCase().includes(s) ||
            p.qr_code?.toLowerCase().includes(s)
        );
      }
      if (filter?.category_id) {
        results = results.filter((p) => p.category_id === filter.category_id);
      }
      if (filter?.lowStock) {
        results = results.filter((p) => p.track_stock && p.stock_quantity <= p.min_stock);
      }
      if (filter?.isActive !== undefined) {
        results = results.filter((p) => p.is_active === filter.isActive);
      }

      results.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.name.localeCompare(b.name, "fr");
      });
      return results;
    },
    [shop?.id, filter?.search, filter?.category_id, filter?.lowStock, filter?.isActive]
  ) || [];

  const isLoading = useLiveQuery(() => false, []) ?? true; // Live query returns undefined while loading
  const load = useCallback(async () => { /* No-op for compatibility */ }, []);

  // ── GENERATOR ─────────────────────────────────────
  const generateInternalRef = useCallback(async (shopId: string) => {
    const db = getDB();
    const count = await db.products.where("shop_id").equals(shopId).count();
    return `REF-${(count + 1).toString().padStart(6, '0')}`;
  }, []);

  // ── CREATE ────────────────────────────────────────
  const createProduct = useCallback(
    async (
      data: Omit<LocalProduct, "id" | "created_at" | "updated_at" | "sync_status" | "internal_reference" | "qr_code">,
      variants?: any[],
      batches?: any[]
    ) => {
      const db = getDB();
      const now = new Date().toISOString();
      const newId = uuid();
      const ref = await generateInternalRef(data.shop_id);
      
      let totalStock = data.stock_quantity || 0;
      if (data.has_variants && variants?.length) {
        totalStock = variants.reduce((acc, v) => acc + (Number(v.stock_quantity) || 0), 0);
      } else if (data.has_batches && batches?.length) {
        totalStock = batches.reduce((acc, b) => acc + (Number(b.stock_quantity) || 0), 0);
      }

      const product: LocalProduct = {
        ...data,
        stock_quantity: totalStock,
        id: newId,
        internal_reference: ref,
        qr_code: newId, // The QR code content is simply the product ID
        is_weighable: data.is_weighable ?? false,
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      };
      // Begin Transaction to save product + variants + batches
      await db.transaction("rw", [db.products, db.productVariants, db.productBatches, db.syncQueue], async () => {
        await db.products.add(product);
        await enqueueSync("products", product.id, "create", product);

        if (data.has_variants && variants?.length) {
          for (const v of variants) {
            const variant: LocalProductVariant = {
              id: uuid(),
              shop_id: data.shop_id,
              product_id: product.id,
              name: v.name,
              sku: v.sku || undefined,
              barcode: v.barcode || undefined,
              purchase_price: v.purchase_price,
              selling_price: v.selling_price,
              stock_quantity: v.stock_quantity,
              is_active: true,
              sync_status: "pending",
              created_at: now,
              updated_at: now,
            };
            await db.productVariants.add(variant);
            await enqueueSync("product_variants", variant.id, "create", variant);
          }
        }

        if (data.has_batches && batches?.length && !data.has_variants) {
          for (const b of batches) {
            const batch: LocalProductBatch = {
              id: uuid(),
              shop_id: data.shop_id,
              product_id: product.id,
              batch_number: b.batch_number,
              expiry_date: b.expiry_date || undefined,
              stock_quantity: b.stock_quantity,
              is_active: true,
              sync_status: "pending",
              created_at: now,
              updated_at: now,
            };
            await db.productBatches.add(batch);
            await enqueueSync("product_batches", batch.id, "create", batch);
          }
        }
      });

      await load();
      return product;
    },
    [load]
  );

  // ── UPDATE ────────────────────────────────────────
  const updateProduct = useCallback(
    async (
      id: string,
      changes: Partial<LocalProduct>,
      variants?: any[],
      batches?: any[]
    ) => {
      const db = getDB();
      const now = new Date().toISOString();
      let totalStock = changes.stock_quantity;
      if (changes.has_variants !== false && variants !== undefined) {
        totalStock = variants.reduce((acc, v) => acc + (Number(v.stock_quantity) || 0), 0);
      } else if (changes.has_batches !== false && batches !== undefined) {
        totalStock = batches.reduce((acc, b) => acc + (Number(b.stock_quantity) || 0), 0);
      }

      const updated = { ...changes, updated_at: now, sync_status: "pending" as const };
      if (totalStock !== undefined) {
        updated.stock_quantity = totalStock;
      }
      
      await db.transaction("rw", [db.products, db.productVariants, db.productBatches, db.syncQueue], async () => {
        await db.products.update(id, updated);
        const full = await db.products.get(id);
        if (full) await enqueueSync("products", id, "update", full);

        // Update variants
        if (variants !== undefined) {
          const existingVariants = await db.productVariants.where("product_id").equals(id).toArray();
          const incomingIds = variants.map(v => v.id).filter(Boolean);
          
          // Mark deleted variants as is_active=false (soft delete)
          for (const ev of existingVariants) {
            if (!incomingIds.includes(ev.id)) {
              await db.productVariants.update(ev.id, { is_active: false, updated_at: now, sync_status: "pending" });
              const fullV = await db.productVariants.get(ev.id);
              if (fullV) await enqueueSync("product_variants", ev.id, "update", fullV);
            }
          }

          // Insert or update incoming variants
          if (updated.has_variants !== false) {
            for (const v of variants) {
              if (v.id) {
                await db.productVariants.update(v.id, {
                  name: v.name,
                  sku: v.sku || undefined,
                  barcode: v.barcode || undefined,
                  purchase_price: v.purchase_price,
                  selling_price: v.selling_price,
                  stock_quantity: v.stock_quantity,
                  updated_at: now,
                  sync_status: "pending"
                });
                const fullV = await db.productVariants.get(v.id);
                if (fullV) await enqueueSync("product_variants", v.id, "update", fullV);
              } else {
                const newVariant: LocalProductVariant = {
                  id: uuid(),
                  shop_id: full!.shop_id,
                  product_id: id,
                  name: v.name,
                  sku: v.sku || undefined,
                  barcode: v.barcode || undefined,
                  purchase_price: v.purchase_price,
                  selling_price: v.selling_price,
                  stock_quantity: v.stock_quantity,
                  is_active: true,
                  sync_status: "pending",
                  created_at: now,
                  updated_at: now,
                };
                await db.productVariants.add(newVariant);
                await enqueueSync("product_variants", newVariant.id, "create", newVariant);
              }
            }
          }
        }

        // Update batches
        if (batches !== undefined) {
          const existingBatches = await db.productBatches.where("product_id").equals(id).toArray();
          const incomingIds = batches.map(b => b.id).filter(Boolean);
          
          // Soft delete missing batches
          for (const eb of existingBatches) {
            if (!incomingIds.includes(eb.id)) {
              await db.productBatches.update(eb.id, { is_active: false, updated_at: now, sync_status: "pending" });
              const fullB = await db.productBatches.get(eb.id);
              if (fullB) await enqueueSync("product_batches", eb.id, "update", fullB);
            }
          }

          // Insert or update incoming batches
          if (updated.has_batches !== false && updated.has_variants === false) {
            for (const b of batches) {
              if (b.id) {
                await db.productBatches.update(b.id, {
                  batch_number: b.batch_number,
                  expiry_date: b.expiry_date || undefined,
                  stock_quantity: b.stock_quantity,
                  updated_at: now,
                  sync_status: "pending"
                });
                const fullB = await db.productBatches.get(b.id);
                if (fullB) await enqueueSync("product_batches", b.id, "update", fullB);
              } else {
                const newBatch: LocalProductBatch = {
                  id: uuid(),
                  shop_id: full!.shop_id,
                  product_id: id,
                  batch_number: b.batch_number,
                  expiry_date: b.expiry_date || undefined,
                  stock_quantity: b.stock_quantity,
                  is_active: true,
                  sync_status: "pending",
                  created_at: now,
                  updated_at: now,
                };
                await db.productBatches.add(newBatch);
                await enqueueSync("product_batches", newBatch.id, "create", newBatch);
              }
            }
          }
        }
      });
      await load();
    },
    [load]
  );

  // ── DELETE (soft) ─────────────────────────────────
  const archiveProduct = useCallback(
    async (id: string) => {
      await updateProduct(id, { is_active: false });
    },
    [updateProduct]
  );

  // ── ADJUST STOCK ──────────────────────────────────
  const adjustStock = useCallback(
    async (id: string, delta: number, notes?: string) => {
      const db = getDB();
      const product = await db.products.get(id);
      if (!product) return;
      const newQty = Math.max(0, product.stock_quantity + delta);
      await updateProduct(id, { stock_quantity: newQty });
    },
    [updateProduct]
  );

  const lowStockCount = products.filter(
    (p) => p.is_active && p.track_stock && p.stock_quantity <= p.min_stock
  ).length;

  return {
    products,
    isLoading,
    lowStockCount,
    refresh: load,
    createProduct,
    updateProduct,
    archiveProduct,
    adjustStock,
  };
}

// Hook pour un seul produit (par id ou barcode)
export function useProduct(id?: string) {
  const [product, setProduct] = useState<LocalProduct & { variants?: LocalProductVariant[], batches?: LocalProductBatch[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }
    const db = getDB();
    Promise.all([
      db.products.get(id),
      db.productVariants.where("product_id").equals(id).toArray(),
      db.productBatches.where("product_id").equals(id).toArray()
    ]).then(([p, variants, batches]) => {
      if (p) {
        setProduct({ ...p, variants, batches });
      } else {
        setProduct(null);
      }
      setIsLoading(false);
    });
  }, [id]);

  return { product, isLoading };
}

// Hook recherche par scanner (pour POS)
export function useProductByScanner() {
  return useCallback(async (code: string): Promise<LocalProduct | null> => {
    const db = getDB();
    // Dexie doesn't have a simple OR on multiple fields without multiple queries or filtering
    // Let's do a fast collection filter
    const results = await db.products.filter(p => 
      p.barcode === code || 
      p.sku === code || 
      p.internal_reference === code || 
      p.qr_code === code
    ).toArray();
    return results[0] ?? null;
  }, []);
}

// src/lib/sync/engine.ts
// Moteur de synchronisation offline → Supabase

import { getDB, type SyncQueueItem } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";
import { useSyncStore } from "@/lib/store/sync.store";

const TABLE_MAP: Record<string, string> = {
  products:       "products",
  productVariants: "product_variants",
  productBatches:  "product_batches",
  categories:     "categories",
  customers:      "customers",
  suppliers:      "suppliers",
  sales:          "sales",
  saleItems:      "sale_items",
  expenses:       "expenses",
  credits:        "credits",
  debts:          "debts",
  employees:      "employees",
  warehouses:     "warehouses",
  cashRegisters:  "registers",
  subscriptions:  "subscriptions",
};

/**
 * Add an operation to the sync queue
 */
export async function enqueueSync(
  table_name: string,
  record_id: string,
  operation: SyncQueueItem["operation"],
  payload: object
) {
  const db = getDB();
  await db.syncQueue.add({
    table_name,
    record_id,
    operation,
    payload,
    retry_count: 0,
    created_at: new Date().toISOString(),
  });
  useSyncStore.getState().setPendingCount(await db.syncQueue.count());
}

/**
 * Process all pending sync operations
 */
export async function runSync(): Promise<void> {
  if (!navigator.onLine) return;

  const db = getDB();
  const syncStore = useSyncStore.getState();
  const supabase = createClient();

  const pending = await db.syncQueue.orderBy("created_at").toArray();
  if (pending.length === 0) return;

  syncStore.setStatus("syncing");

  let errorCount = 0;

  for (const item of pending) {
    // Exponential backoff: delay = 2^retry_count * 1000ms
    if (item.retry_count > 0 && item.last_error_at) {
      const delayMs = Math.pow(2, item.retry_count) * 1000;
      const lastErrorTime = new Date(item.last_error_at).getTime();
      if (Date.now() - lastErrorTime < delayMs) {
        continue; // Skip until backoff expires
      }
    }

    const serverTable = TABLE_MAP[item.table_name] ?? item.table_name;

      try {
      let payloadToSync: any = { ...item.payload };

      // Sanitization: Local IndexedDB models often have fields that Supabase doesn't have,
      // or map 'is_active' to 'is_deleted'.
      if (item.table_name === "categories") {
        const cat = item.payload as any;
        payloadToSync = {
          id: cat.id,
          shop_id: cat.shop_id,
          name: cat.name,
          color: cat.color,
          is_deleted: cat.is_active === false,
          created_at: cat.created_at,
          updated_at: cat.updated_at,
        };
      } else if (item.table_name === "products") {
        const prod = item.payload as any;
        payloadToSync = {
          id: prod.id,
          shop_id: prod.shop_id,
          category_id: prod.category_id,
          name: prod.name,
          barcode: prod.barcode,
          purchase_price: prod.purchase_price,
          selling_price: prod.selling_price,
          stock_quantity: prod.stock_quantity,
          min_stock: prod.min_stock,
          is_deleted: prod.is_active === false,
          created_at: prod.created_at,
          updated_at: prod.updated_at,
        };
      } else if (item.table_name === "customers") {
        const cust = item.payload as any;
        payloadToSync = {
          id: cust.id,
          shop_id: cust.shop_id,
          name: cust.name,
          phone: cust.phone,
          is_deleted: cust.status === 'inactive',
          created_at: cust.created_at,
          updated_at: cust.updated_at,
        };
      } else {
        // Supprimer les champs purement locaux qui ne sont pas dans Supabase
        delete payloadToSync.sync_status;
        delete payloadToSync.retry_count;
        if (payloadToSync.is_active !== undefined && payloadToSync.is_deleted === undefined) {
           payloadToSync.is_deleted = !payloadToSync.is_active;
           delete payloadToSync.is_active;
        }
      }

      if (item.operation === "create" || item.operation === "update") {
        if (item.table_name === "sales") {
           // Skip direct sale insertion here, it should be done via RPC
           // or we map it to RPC call if it's a queued sale!
           // Since sales in offline mode enqueue everything, let's process it safely.
           const { error } = await supabase
            .from(serverTable as never)
            .upsert(payloadToSync as never, { onConflict: "id" });
           if (error) throw error;
        } else {
           const { error } = await supabase
             .from(serverTable as never)
             .upsert(payloadToSync as never, { onConflict: "id" });
           if (error) throw error;
        }
      } else if (item.operation === "delete") {
        const { error } = await supabase
          .from(serverTable as never)
          .delete()
          .eq("id", item.record_id);

        if (error) throw error;
      }

      // Remove from queue on success
      await db.syncQueue.delete(item.id!);
    } catch (err) {
      console.error(`[Sync] Failed for ${item.table_name}:${item.record_id}`, err);
      errorCount++;

      // Increment retry count (max 5)
      if (item.retry_count >= 5) {
        await db.syncQueue.delete(item.id!);
        console.error(`[Sync] Giving up on ${item.table_name}:${item.record_id}`);
      } else {
        await db.syncQueue.update(item.id!, { 
          retry_count: item.retry_count + 1,
          last_error_at: new Date().toISOString()
        });
      }
    }
  }

  const remaining = await db.syncQueue.count();
  syncStore.setPendingCount(remaining);
  syncStore.setLastSyncAt(new Date());

  if (errorCount > 0 && remaining > 0) {
    syncStore.setStatus("error");
  } else {
    syncStore.setStatus("idle");
  }
}

/**
 * Initialize sync engine — run on app load
 */
export function initSyncEngine() {
  if (typeof window === "undefined") return;

  // Sync on app load if online
  if (navigator.onLine) {
    runSync();
  }

  // Sync when coming back online
  window.addEventListener("online", () => {
    console.log("[Sync] Back online — starting sync");
    runSync();
  });

  // Periodic sync every 30s when online
  setInterval(() => {
    if (navigator.onLine) {
      runSync();
    }
  }, 30_000);
}

// src/lib/db/schema.ts
// IndexedDB schema using Dexie.js for offline-first storage

import Dexie, { type Table } from "dexie";
import type {
  SyncStatus,
  SaleStatus,
  PaymentMethod,
  CreditStatus,
  StockMovementType,
  ExpenseCategory,
} from "@/lib/supabase/database.types";

// ---- Local types (IndexedDB) ----

export interface LocalSupplier {
  id: string;
  shop_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  sync_status: SyncStatus;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalEmployee {
  id: string;
  shop_id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  pin?: string;
  status: "active" | "inactive" | "suspended";
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface LocalWarehouse {
  id: string;
  shop_id: string;
  name: string;
  code: string;
  address?: string;
  status: "active" | "inactive";
  is_default: boolean;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface LocalCashRegister {
  id: string;
  shop_id: string;
  name: string;
  code: string;
  status: "active" | "inactive" | "maintenance";
  assigned_employee_id?: string;
  location?: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface LocalSubscription {
  id: string;
  shop_id: string;
  plan: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "paused";
  current_period_end: string;
  sync_status: SyncStatus;
  updated_at: string;
}

export interface LocalProduct {
  id: string;
  shop_id: string;
  category_id?: string;
  name: string;
  internal_reference?: string;
  qr_code?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  purchase_price: number;
  selling_price: number;
  min_price?: number;
  stock_quantity: number;
  min_stock: number;
  unit: string;
  is_weighable: boolean;
  image_url?: string;
  is_active: boolean;
  track_stock: boolean;
  allow_negative: boolean;
  has_variants: boolean;
  has_batches: boolean;
  sync_status: "pending" | "synced" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface LocalProductVariant {
  id: string;
  shop_id: string;
  product_id: string;
  name: string;
  internal_reference?: string;
  qr_code?: string;
  sku?: string;
  barcode?: string;
  purchase_price?: number;
  selling_price?: number;
  stock_quantity: number;
  is_active: boolean;
  sync_status: "pending" | "synced" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface LocalProductBatch {
  id: string;
  shop_id: string;
  product_id: string;
  variant_id?: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date?: string;
  stock_quantity: number;
  is_active: boolean;
  sync_status: "pending" | "synced" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface LocalStockMovement {
  id: string;
  shop_id: string;
  product_id: string;
  variant_id?: string;
  batch_id?: string;
  user_id?: string;
  type: StockMovementType | "purchase_receive" | "inventory_adjustment" | "transfer_out" | "transfer_in" | "expired_loss";
  quantity: number;
  reason?: string;
  reference_doc?: string;
  from_shop_id?: string;
  to_shop_id?: string;
  sync_status: "pending" | "synced" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface LocalCategory {
  id: string;
  shop_id: string;
  name: string;
  color: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  sync_status: SyncStatus;
  local_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalCustomer {
  id: string;
  shop_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  total_purchases: number;
  current_debt: number;
  points: number;
  status: "active" | "inactive";
  is_active: boolean;
  sync_status: "pending" | "synced" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface LocalSale {
  id: string;
  shop_id: string;
  customer_id?: string;
  user_id?: string;
  employee_id?: string;
  session_id?: string;
  sale_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  status: SaleStatus;
  payment_status: "paid" | "partial" | "unpaid";
  sold_at: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface LocalSaleItem {
  id: string;
  shop_id: string;
  sale_id: string;
  product_id: string;
  variant_id?: string;
  batch_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  discount_amount: number;
  tax_amount: number;
  total_price: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface LocalExpense {
  id: string;
  shop_id: string;
  user_id?: string;
  session_id?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  payment_method: PaymentMethod;
  beneficiary?: string;
  spent_at: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface LocalCredit {
  id: string;
  shop_id: string;
  customer_id: string;
  sale_id: string;
  original_amount: number;
  amount: number;
  remaining_amount: number;
  due_date?: string;
  status: CreditStatus;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface LocalDebt {
  id: string;
  shop_id: string;
  supplier_id: string;
  amount: number;
  remaining_amount: number;
  status: "active" | "paid" | "overdue";
  sync_status: "pending" | "synced" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface LocalCashRegisterSession {
  id: string;
  shop_id: string;
  user_id?: string;
  opened_by?: string;
  closed_by?: string;
  cash_register_id?: string;
  opened_at: string;
  closed_at?: string;
  opening_balance: number;
  closing_balance?: number;
  expected_balance?: number;
  status: "open" | "closed";
  notes?: string;
  sync_status: "pending" | "synced" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface LocalCashMovement {
  id: string;
  shop_id: string;
  session_id: string;
  user_id?: string;
  type: "sale_income" | "credit_payment" | "expense" | "deposit" | "withdrawal" | "supplier_payment" | "debt_payment";
  amount: number;
  reason: string;
  payment_method?: PaymentMethod;
  reference_id?: string; // e.g. sale_id or expense_id
  sync_status: "pending" | "synced" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id?: number;
  table_name: string;
  record_id: string;
  operation: "create" | "update" | "delete";
  payload: object;
  retry_count: number;
  last_error_at?: string;
  created_at: string;
}

export interface LocalPosSettings {
  id: string;
  shop_id: string;
  enable_barcode: boolean;
  enable_qrcode: boolean;
  enable_search: boolean;
  print_receipt: boolean;
  sync_status: "pending" | "synced" | "conflict";
  updated_at: string;
}

// ---- Dexie Database ----

export class NovakamDB extends Dexie {
  products!: Dexie.Table<LocalProduct, string>;
  productVariants!: Dexie.Table<LocalProductVariant, string>;
  productBatches!: Dexie.Table<LocalProductBatch, string>;
  categories!: Table<LocalCategory>;
  customers!: Dexie.Table<LocalCustomer, string>;
  sales!: Table<LocalSale>;
  saleItems!: Table<LocalSaleItem>;
  expenses!: Table<LocalExpense>;
  credits!: Table<LocalCredit>;
  debts!: Table<LocalDebt>;
  stockMovements!: Table<LocalStockMovement>;
  cashRegisterSessions!: Table<LocalCashRegisterSession>;
  cashMovements!: Table<LocalCashMovement>;
  posSettings!: Table<LocalPosSettings>;
  suppliers!: Table<LocalSupplier>;
  employees!: Table<LocalEmployee>;
  warehouses!: Table<LocalWarehouse>;
  cashRegisters!: Table<LocalCashRegister>;
  subscriptions!: Table<LocalSubscription>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super("NovakamDB");

    this.version(1).stores({
      products: "id, shop_id, category_id, name, barcode, sku, sync_status, has_variants, has_batches",
      productVariants: "id, shop_id, product_id, barcode, sku, sync_status",
      productBatches: "id, shop_id, product_id, variant_id, batch_number, expiry_date, sync_status",
      categories: "id, shop_id, name, sync_status",
      customers: "id, shop_id, name, phone, sync_status",
      sales: "id, shop_id, customer_id, sale_number, status, sync_status, created_at",
      saleItems: "id, shop_id, sale_id, product_id, sync_status",
      expenses:   "id, shop_id, category, spent_at, sync_status",
      credits:    "id, shop_id, customer_id, status, sync_status",
      stockMovements: "id, shop_id, product_id, variant_id, batch_id, type, sync_status",
      cashRegisterSessions: "id, shop_id, cash_register_id, status, sync_status",
      cashMovements: "id, shop_id, session_id, type, sync_status",
      syncQueue:  "++id, table_name, record_id, operation, created_at",
    });

    this.version(2).stores({
      products: "id, shop_id, category_id, name, barcode, sku, sync_status, has_variants, has_batches",
      productVariants: "id, shop_id, product_id, barcode, sku, sync_status",
      productBatches: "id, shop_id, product_id, variant_id, batch_number, expiry_date, sync_status",
      categories: "id, shop_id, name, sync_status",
      customers: "id, shop_id, name, phone, sync_status",
      sales: "id, shop_id, customer_id, sale_number, status, sync_status, created_at",
      saleItems: "id, shop_id, sale_id, product_id, sync_status",
      expenses:   "id, shop_id, category, spent_at, sync_status",
      credits:    "id, shop_id, customer_id, status, sync_status",
      debts:      "id, shop_id, supplier_id, status, sync_status",
      stockMovements: "id, shop_id, product_id, variant_id, batch_id, type, sync_status",
      cashRegisterSessions: "id, shop_id, cash_register_id, status, sync_status",
      cashMovements: "id, shop_id, session_id, type, sync_status",
      syncQueue:  "++id, table_name, record_id, operation, created_at",
    });

    this.version(3).stores({
      products: "id, shop_id, category_id, name, internal_reference, qr_code, barcode, sku, sync_status, has_variants, has_batches",
      productVariants: "id, shop_id, product_id, internal_reference, qr_code, barcode, sku, sync_status",
      productBatches: "id, shop_id, product_id, variant_id, batch_number, expiry_date, sync_status",
      categories: "id, shop_id, name, sync_status",
      customers: "id, shop_id, name, phone, sync_status",
      sales: "id, shop_id, customer_id, sale_number, status, sync_status, created_at",
      saleItems: "id, shop_id, sale_id, product_id, sync_status",
      expenses:   "id, shop_id, category, spent_at, sync_status",
      credits:    "id, shop_id, customer_id, status, sync_status",
      debts:      "id, shop_id, supplier_id, status, sync_status",
      stockMovements: "id, shop_id, product_id, variant_id, batch_id, type, sync_status",
      cashRegisterSessions: "id, shop_id, cash_register_id, status, sync_status",
      cashMovements: "id, shop_id, session_id, type, sync_status",
      posSettings: "id, shop_id",
      syncQueue:  "++id, table_name, record_id, operation, created_at",
    }).upgrade(tx => {
      // Automatic migration: add internal references to existing products
      return tx.table("products").toCollection().modify((product) => {
        if (!product.internal_reference) {
          // Keep it simple for existing items during migration
          product.internal_reference = 'REF-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
          product.qr_code = product.id;
          product.is_weighable = false;
        }
      });
    });

    this.version(4).stores({
      products: "id, shop_id, category_id, name, internal_reference, qr_code, barcode, sku, sync_status, has_variants, has_batches",
      productVariants: "id, shop_id, product_id, internal_reference, qr_code, barcode, sku, sync_status",
      productBatches: "id, shop_id, product_id, variant_id, batch_number, expiry_date, sync_status",
      categories: "id, shop_id, name, sync_status",
      customers: "id, shop_id, name, phone, sync_status",
      sales: "id, shop_id, customer_id, sale_number, status, sync_status, created_at",
      saleItems: "id, shop_id, sale_id, product_id, sync_status",
      expenses:   "id, shop_id, category, spent_at, sync_status",
      credits:    "id, shop_id, customer_id, status, sync_status",
      debts:      "id, shop_id, supplier_id, status, sync_status",
      stockMovements: "id, shop_id, product_id, variant_id, batch_id, type, sync_status",
      cashRegisterSessions: "id, shop_id, cash_register_id, status, sync_status",
      cashMovements: "id, shop_id, session_id, type, sync_status",
      posSettings: "id, shop_id",
      suppliers: "id, shop_id, name, sync_status",
      employees: "id, shop_id, user_id, status, sync_status",
      warehouses: "id, shop_id, status, sync_status",
      cashRegisters: "id, shop_id, status, sync_status",
      subscriptions: "id, shop_id, sync_status",
      syncQueue:  "++id, table_name, record_id, operation, created_at",
    });
  }
}

// Singleton instance
let db: NovakamDB | null = null;

export function getDB(): NovakamDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!db) {
    db = new NovakamDB();
  }
  return db;
}

// src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums ──────────────────────────────────────────────────────────────────────
export type UserRole =
  | "owner"
  | "manager"
  | "cashier"
  | "warehouse"
  | "accountant"
  | "support";

export type Plan =
  | "free"
  | "starter"
  | "business"
  | "pro"
  | "enterprise";

export type ActivationCodeStatus =
  | "active"
  | "exhausted"
  | "suspended"
  | "revoked";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "paused";

export type RegisterStatus = "active" | "inactive" | "maintenance";
export type WarehouseStatus = "active" | "inactive";
export type EmployeeStatus = "active" | "inactive" | "suspended";

export type SyncStatus = "pending" | "syncing" | "synced" | "conflict";
export type SaleStatus = "completed" | "cancelled" | "refunded";
export type PaymentMethod = "cash" | "mobile_money" | "card" | "credit" | "bank_transfer";
export type CreditStatus = "active" | "paid" | "overdue" | "cancelled";
export type StockMovementType = "in" | "out" | "adjustment" | "loss" | "return";
export type ExpenseCategory = "rent" | "salary" | "utilities" | "supplies" | "transport" | "other";
export type TreasuryEntryType = "income" | "expense" | "transfer";

// ── Subscription Limits ────────────────────────────────────────────────────────
export interface SubscriptionLimits {
  max_shops: number;           // -1 = unlimited
  max_registers_per_shop: number;
  max_employees: number;
  max_products: number;
  max_warehouses_per_shop: number;
  has_advanced_reports: boolean;
  has_api_access: boolean;
  has_export: boolean;
  has_credits: boolean;
  has_suppliers: boolean;
  has_priority_support: boolean;
  has_custom_branding: boolean;
  has_sla: boolean;
}

// ── Database Schema ────────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      // ── Shops ──────────────────────────────────────────────────────────────
      shops: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          country: string;
          currency: string;
          logo_url: string | null;
          tax_rate: number;
          receipt_footer: string | null;
          language: string;
          timezone: string;
          plan: Plan;
          trial_ends_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shops"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["shops"]["Insert"]>;
      };

      // ── Subscriptions ───────────────────────────────────────────────────────
      subscriptions: {
        Row: {
          id: string;
          shop_id: string;
          plan: Plan;
          status: SubscriptionStatus;
          current_period_start: string;
          current_period_end: string;
          trial_ends_at: string | null;
          canceled_at: string | null;
          monthly_price: number;
          currency: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["subscriptions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };

      // ── Activation Codes (Licensing) ────────────────────────────────────────
      activation_codes: {
        Row: {
          id: string;
          code: string;
          plan: Plan;
          duration_months: number;
          max_activations: number;
          remaining_activations: number;
          shop_id: string | null;
          status: ActivationCodeStatus;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activation_codes"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["activation_codes"]["Insert"]>;
      };

      // ── License History ─────────────────────────────────────────────────────
      license_history: {
        Row: {
          id: string;
          code_id: string;
          shop_id: string;
          activated_by: string | null;
          plan_granted: Plan;
          duration_granted_months: number;
          valid_until: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["license_history"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["license_history"]["Insert"]>;
      };

      // ── User Shops (RBAC) ───────────────────────────────────────────────────
      user_shops: {
        Row: {
          id: string;
          user_id: string;
          shop_id: string;
          role: UserRole;
          is_active: boolean;
          invited_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_shops"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["user_shops"]["Insert"]>;
      };

      // ── Employees ───────────────────────────────────────────────────────────
      employees: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          role: UserRole;
          pin: string | null;
          status: EmployeeStatus;
          hired_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["employees"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
      };

      // ── Registers (Caisses) ─────────────────────────────────────────────────
      registers: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          code: string;
          status: RegisterStatus;
          assigned_employee_id: string | null;
          location: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["registers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["registers"]["Insert"]>;
      };

      // ── Warehouses (Magasins) ───────────────────────────────────────────────
      warehouses: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          code: string;
          address: string | null;
          status: WarehouseStatus;
          is_default: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["warehouses"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["warehouses"]["Insert"]>;
      };

      // ── Products ────────────────────────────────────────────────────────────
      products: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string | null;
          sku: string | null;
          barcode: string | null;
          name: string;
          description: string | null;
          purchase_price: number;
          selling_price: number;
          min_price: number | null;
          stock_quantity: number;
          min_stock: number;
          unit: string;
          image_url: string | null;
          is_active: boolean;
          track_stock: boolean;
          allow_negative: boolean;
          sync_status: SyncStatus;
          local_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };

      // ── Customers ───────────────────────────────────────────────────────────
      customers: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          credit_limit: number;
          current_debt: number;
          total_purchases: number;
          points: number;
          is_active: boolean;
          sync_status: SyncStatus;
          local_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };

      // ── Sales ───────────────────────────────────────────────────────────────
      sales: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string | null;
          employee_id: string | null;
          sale_number: string;
          subtotal: number;
          discount_amount: number;
          tax_amount: number;
          total_amount: number;
          paid_amount: number;
          change_amount: number;
          payment_method: PaymentMethod;
          status: SaleStatus;
          notes: string | null;
          sync_status: SyncStatus;
          local_id: string | null;
          sold_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sales"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["sales"]["Insert"]>;
      };

      // ── Sale Items ──────────────────────────────────────────────────────────
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          shop_id: string;
          product_id: string | null;
          product_name: string;
          product_sku: string | null;
          quantity: number;
          unit_price: number;
          purchase_price: number;
          discount: number;
          total_price: number;
          sync_status: SyncStatus;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sale_items"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sale_items"]["Insert"]>;
      };

      // ── Expenses ────────────────────────────────────────────────────────────
      expenses: {
        Row: {
          id: string;
          shop_id: string;
          category: ExpenseCategory;
          description: string;
          amount: number;
          payment_method: PaymentMethod;
          beneficiary: string | null;
          receipt_url: string | null;
          employee_id: string | null;
          notes: string | null;
          sync_status: SyncStatus;
          local_id: string | null;
          spent_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };
    };

    Views: Record<string, never>;

    Functions: {
      get_user_shop_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      generate_sale_number: {
        Args: { p_shop_id: string };
        Returns: string;
      };
      check_subscription_limit: {
        Args: { p_shop_id: string; p_resource: string };
        Returns: { allowed: boolean; current_count: number; max_allowed: number; plan: string };
      };
      get_shop_plan: {
        Args: { p_shop_id: string };
        Returns: Plan;
      };
    };

    Enums: {
      user_role: UserRole;
      plan: Plan;
      subscription_status: SubscriptionStatus;
      sync_status: SyncStatus;
      sale_status: SaleStatus;
      payment_method: PaymentMethod;
      credit_status: CreditStatus;
      stock_movement_type: StockMovementType;
      expense_category: ExpenseCategory;
      treasury_entry_type: TreasuryEntryType;
      register_status: RegisterStatus;
      warehouse_status: WarehouseStatus;
      employee_status: EmployeeStatus;
    };
  };
}

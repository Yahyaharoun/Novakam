import { Plan } from "@/lib/supabase/database.types";

export type FeatureKey =
  | "reports_basic"
  | "reports_advanced"
  | "dashboard_basic"
  | "dashboard_advanced"
  | "sales_management"
  | "purchases_management"
  | "inventory_management"
  | "credit_management"
  | "expense_management"
  | "accounting"
  | "multi_employee"
  | "multi_branch"
  | "export_pdf"
  | "export_excel"
  | "export_csv"
  | "api_access"
  | "audit_log"
  | "advanced_permissions"
  | "advanced_notifications"
  | "offline_sync"
  | "custom_integrations"
  | "email_support"
  | "priority_support"
  | "phone_support"
  | "dedicated_support"
  | "sla_guarantee"
  | "training_included";

export interface PlanLimits {
  maxShops: integer | -1; // -1 means unlimited
  maxProducts: integer | -1;
  maxRegistersPerShop: integer | -1;
  maxWarehousesPerShop: integer | -1;
  maxEmployeesPerShop: integer | -1;
}

export interface PlanDefinition {
  id: Plan;
  name: string;
  price: number;
  features: FeatureKey[];
  limits: PlanLimits;
}

type integer = number;

import { Plan } from "@/lib/supabase/database.types";
import { FeatureKey, PlanDefinition } from "../types";

export const FREE_FEATURES: FeatureKey[] = [
  "dashboard_basic",
  "sales_management",
  "inventory_management",
];

export const STARTER_FEATURES: FeatureKey[] = [
  ...FREE_FEATURES,
  "reports_basic",
  "purchases_management",
  "email_support",
  "offline_sync",
];

export const BUSINESS_FEATURES: FeatureKey[] = [
  ...STARTER_FEATURES,
  "reports_advanced",
  "dashboard_advanced",
  "credit_management",
  "expense_management",
  "multi_employee",
];

export const PRO_FEATURES: FeatureKey[] = [
  ...BUSINESS_FEATURES,
  "accounting",
  "export_pdf",
  "export_excel",
  "export_csv",
  "audit_log",
  "advanced_permissions",
  "advanced_notifications",
  "multi_branch",
  "api_access",
];

export const ENTERPRISE_FEATURES: FeatureKey[] = [
  ...PRO_FEATURES,
  "custom_integrations",
  "sla_guarantee",
  "dedicated_support",
  "training_included",
  "phone_support",
];

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    features: FREE_FEATURES,
    limits: {
      maxShops: 1,
      maxProducts: 100,
      maxRegistersPerShop: 1,
      maxWarehousesPerShop: 1,
      maxEmployeesPerShop: 1, // 1 owner + 1 employee technically means 2 in DB if owner counts
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 3000,
    features: STARTER_FEATURES,
    limits: {
      maxShops: 1,
      maxProducts: 500,
      maxRegistersPerShop: 2,
      maxWarehousesPerShop: 3,
      maxEmployeesPerShop: 3,
    },
  },
  business: {
    id: "business",
    name: "Business",
    price: 7000,
    features: BUSINESS_FEATURES,
    limits: {
      maxShops: 2,
      maxProducts: -1,
      maxRegistersPerShop: 5,
      maxWarehousesPerShop: 5,
      maxEmployeesPerShop: 10,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 15000,
    features: PRO_FEATURES,
    limits: {
      maxShops: 5,
      maxProducts: -1,
      maxRegistersPerShop: -1,
      maxWarehousesPerShop: -1,
      maxEmployeesPerShop: -1,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 45000,
    features: ENTERPRISE_FEATURES,
    limits: {
      maxShops: -1,
      maxProducts: -1,
      maxRegistersPerShop: -1,
      maxWarehousesPerShop: -1,
      maxEmployeesPerShop: -1,
    },
  },
};

export const ROUTES_PER_FEATURE: Record<string, FeatureKey[]> = {
  "/reports": ["reports_basic", "reports_advanced"],
  "/reports/advanced": ["reports_advanced"],
  "/settings/api": ["api_access"],
  "/settings/audit": ["audit_log"],
  "/finance/expenses": ["expense_management"],
  "/finance/credits": ["credit_management"],
  "/finance/accounting": ["accounting"],
};

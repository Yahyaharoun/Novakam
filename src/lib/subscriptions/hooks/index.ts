import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Plan } from "@/lib/supabase/database.types";
import { PLANS } from "../constants";
import { FeatureKey, PlanDefinition } from "../types";

interface SubscriptionState {
  plan: Plan;
  status: "active" | "expired" | "canceled" | "past_due";
  expiresAt: string | null;
  setSubscription: (plan: Plan, status: SubscriptionState["status"], expiresAt: string | null) => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      plan: "free",
      status: "active",
      expiresAt: null,
      setSubscription: (plan, status, expiresAt) => set({ plan, status, expiresAt }),
    }),
    {
      name: "novakam-subscription",
    }
  )
);

export function useCurrentPlan(): PlanDefinition {
  const { plan } = useSubscriptionStore();
  return PLANS[plan] || PLANS.free;
}

export function useFeature(feature: FeatureKey): boolean {
  const currentPlan = useCurrentPlan();
  const { status } = useSubscriptionStore();
  
  // If subscription is not active, downgrade access or lock features
  if (status !== "active" && currentPlan.id !== "free") {
    // Basic fallback behavior if expired: act as free plan for features
    return PLANS.free.features.includes(feature);
  }
  
  return currentPlan.features.includes(feature);
}

export function useCanCreate(resource: "shops" | "products" | "registers" | "warehouses" | "employees", currentCount: number): boolean {
  const currentPlan = useCurrentPlan();
  let limit: number;

  switch (resource) {
    case "shops": limit = currentPlan.limits.maxShops; break;
    case "products": limit = currentPlan.limits.maxProducts; break;
    case "registers": limit = currentPlan.limits.maxRegistersPerShop; break;
    case "warehouses": limit = currentPlan.limits.maxWarehousesPerShop; break;
    case "employees": limit = currentPlan.limits.maxEmployeesPerShop; break;
    default: return false;
  }

  if (limit === -1) return true; // unlimited
  return currentCount < limit;
}

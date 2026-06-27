"use client";
// src/lib/rbac/hooks.ts
// Hooks React pour le système RBAC NOVAKAM

import { useAuthStore } from "@/lib/store/auth.store";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "./permissions";
import { canCreateResource, PLAN_LIMITS } from "./subscription-limits";
import type { Permission } from "./permissions";
import type { Plan, SubscriptionLimits } from "@/lib/supabase/database.types";

// ── Hook principal de permission ──────────────────────────────────────────────
/**
 * Vérifie si l'utilisateur courant a une permission spécifique.
 */
export function usePermission(permission: Permission): boolean {
  const role = useAuthStore((s) => s.currentRole);
  return hasPermission(role, permission);
}

/**
 * Vérifie si l'utilisateur courant a AU MOINS UNE des permissions.
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const role = useAuthStore((s) => s.currentRole);
  return hasAnyPermission(role, permissions);
}

/**
 * Vérifie si l'utilisateur courant a TOUTES les permissions.
 */
export function useAllPermissions(permissions: Permission[]): boolean {
  const role = useAuthStore((s) => s.currentRole);
  return hasAllPermissions(role, permissions);
}

// ── Hook d'abonnement ─────────────────────────────────────────────────────────
/**
 * Retourne les limites du plan actuel de la boutique.
 */
export function useSubscriptionLimits(): SubscriptionLimits {
  const shop = useAuthStore((s) => s.currentShop);
  const plan = (shop?.plan as Plan) ?? "free";
  return PLAN_LIMITS[plan];
}

/**
 * Vérifie si une ressource peut être créée selon le plan actuel.
 */
export function useCanCreate(
  resource: keyof Pick<
    SubscriptionLimits,
    | "max_shops"
    | "max_registers_per_shop"
    | "max_employees"
    | "max_products"
    | "max_warehouses_per_shop"
  >,
  currentCount: number
): { allowed: boolean; limit: number } {
  const shop = useAuthStore((s) => s.currentShop);
  const plan = (shop?.plan as Plan) ?? "free";
  return canCreateResource(plan, resource, currentCount);
}

/**
 * Retourne le plan actuel de la boutique.
 */
export function useCurrentPlan(): Plan {
  const shop = useAuthStore((s) => s.currentShop);
  return (shop?.plan as Plan) ?? "free";
}

/**
 * Retourne le rôle actuel et les helpers de permission.
 */
export function useRBAC() {
  const role = useAuthStore((s) => s.currentRole);
  const shop = useAuthStore((s) => s.currentShop);
  const plan = (shop?.plan as Plan) ?? "free";
  const limits = PLAN_LIMITS[plan];

  return {
    role,
    plan,
    limits,
    can: (permission: Permission) => hasPermission(role, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
    canCreate: (
      resource: keyof Pick<
        SubscriptionLimits,
        | "max_shops"
        | "max_registers_per_shop"
        | "max_employees"
        | "max_products"
        | "max_warehouses_per_shop"
      >,
      currentCount: number
    ) => canCreateResource(plan, resource, currentCount),
    isOwner: role === "owner",
    isManager: role === "manager",
    isOwnerOrManager: role === "owner" || role === "manager",
  };
}

// src/lib/rbac/permissions.ts
// Matrice RBAC complète pour NOVAKAM

import type { UserRole } from "@/lib/supabase/database.types";

// ── Toutes les permissions disponibles ────────────────────────────────────────
export type Permission =
  | "manage:subscription"
  | "manage:shop"
  | "delete:shop"
  | "manage:employees"
  | "manage:registers"
  | "manage:warehouses"
  | "manage:products"
  | "manage:inventory"
  | "create:sales"
  | "view:sales"
  | "view:profits"
  | "manage:expenses"
  | "view:reports"
  | "view:financial_reports"
  | "manage:customers"
  | "manage:suppliers"
  | "manage:credits"
  | "manage:debts"
  | "suspend:users"
  | "view:dashboard"
  | "access:pos"
  | "print:receipts"
  | "export:data"
  | "access:api";

// ── Matrice des permissions par rôle ──────────────────────────────────────────
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    "manage:subscription",
    "manage:shop",
    "delete:shop",
    "manage:employees",
    "manage:registers",
    "manage:warehouses",
    "manage:products",
    "manage:inventory",
    "create:sales",
    "view:sales",
    "view:profits",
    "manage:expenses",
    "view:reports",
    "view:financial_reports",
    "manage:customers",
    "manage:suppliers",
    "manage:credits",
    "manage:debts",
    "suspend:users",
    "view:dashboard",
    "access:pos",
    "print:receipts",
    "export:data",
    "access:api",
  ],

  manager: [
    "manage:shop",
    "manage:employees",
    "manage:registers",
    "manage:warehouses",
    "manage:products",
    "manage:inventory",
    "create:sales",
    "view:sales",
    "view:profits",
    "manage:expenses",
    "view:reports",
    "view:financial_reports",
    "manage:customers",
    "manage:suppliers",
    "manage:credits",
    "manage:debts",
    "suspend:users",
    "view:dashboard",
    "access:pos",
    "print:receipts",
    "export:data",
  ],

  cashier: [
    "create:sales",
    "view:dashboard",
    "access:pos",
    "print:receipts",
    "manage:customers",
  ],

  warehouse: [
    "manage:inventory",
    "manage:products",
    "manage:suppliers",
    "view:dashboard",
  ],

  accountant: [
    "view:sales",
    "view:profits",
    "manage:expenses",
    "view:reports",
    "view:financial_reports",
    "manage:credits",
    "manage:debts",
    "export:data",
    "view:dashboard",
  ],
  
  support: [
    "view:dashboard",
    "view:reports",
    "view:sales"
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Vérifie si un rôle possède une permission spécifique.
 */
export function hasPermission(
  role: UserRole | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Vérifie si un rôle possède TOUTES les permissions listées.
 */
export function hasAllPermissions(
  role: UserRole | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Vérifie si un rôle possède AU MOINS UNE des permissions listées.
 */
export function hasAnyPermission(
  role: UserRole | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Retourne toutes les permissions d'un rôle.
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Vérifie si le rôle est Owner ou Manager (gestion quotidienne complète).
 */
export function isOwnerOrManager(role: UserRole | null | undefined): boolean {
  return role === "owner" || role === "manager";
}

/**
 * Hiérarchie des rôles pour affichage.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 6,
  manager: 5,
  accountant: 4,
  warehouse: 3,
  support: 2,
  cashier: 1,
};

/**
 * Labels des rôles en FR/EN.
 */
export const ROLE_LABELS: Record<UserRole, { fr: string; en: string; color: string }> = {
  owner: { fr: "Propriétaire", en: "Owner", color: "purple" },
  manager: { fr: "Manager", en: "Manager", color: "indigo" },
  accountant: { fr: "Comptable", en: "Accountant", color: "blue" },
  warehouse: { fr: "Magasinier", en: "Warehouse", color: "orange" },
  support: { fr: "Support technique", en: "Support", color: "slate" },
  cashier: { fr: "Caissier", en: "Cashier", color: "green" },
};

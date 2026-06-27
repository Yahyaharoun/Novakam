"use client";
// src/lib/rbac/guard.tsx
// Composant PermissionGuard pour protéger les éléments UI

import React from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { hasPermission, hasAnyPermission } from "./permissions";
import { PLAN_LIMITS, getLimitBlockMessage, getNextPlan, PLAN_INFO } from "./subscription-limits";
import type { Permission } from "./permissions";
import type { Plan } from "@/lib/supabase/database.types";
import { Lock, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

// ── PermissionGuard ───────────────────────────────────────────────────────────
interface PermissionGuardProps {
  permission?: Permission;
  anyOf?: Permission[];
  allOf?: Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Affiche children si l'utilisateur a la permission requise, sinon le fallback.
 */
export function PermissionGuard({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const role = useAuthStore((s) => s.currentRole);

  let allowed = true;
  if (permission) allowed = hasPermission(role, permission);
  else if (anyOf) allowed = hasAnyPermission(role, anyOf);
  else if (allOf) allowed = allOf.every((p) => hasPermission(role, p));

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

// ── UpgradePrompt ─────────────────────────────────────────────────────────────
interface UpgradePromptProps {
  resource: string;
  lang?: "fr" | "en";
  compact?: boolean;
}

/**
 * Affiche un message d'upgrade lorsqu'une limite est atteinte.
 */
export function UpgradePrompt({ resource, lang = "fr", compact = false }: UpgradePromptProps) {
  const shop = useAuthStore((s) => s.currentShop);
  const plan = (shop?.plan as Plan) ?? "free";
  const nextPlan = getNextPlan(plan);
  const message = getLimitBlockMessage(resource, plan, lang);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-700 dark:text-amber-400">
        <Lock size={12} className="flex-shrink-0" />
        <span className="flex-1">{message}</span>
        {nextPlan && (
          <Link
            href="/subscription"
            className="font-bold hover:underline whitespace-nowrap flex items-center gap-1"
          >
            {lang === "fr" ? "Upgrader" : "Upgrade"}
            <ArrowRight size={10} />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl text-center">
      <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
        <Lock size={24} className="text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <p className="font-semibold text-slate-800 dark:text-white mb-1">
          {lang === "fr" ? "Limite atteinte" : "Limit reached"}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">{message}</p>
      </div>
      {nextPlan && (
        <Link
          href="/subscription"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          <TrendingUp size={16} />
          {lang === "fr"
            ? `Passer au plan ${PLAN_INFO[nextPlan].name}`
            : `Upgrade to ${PLAN_INFO[nextPlan].name}`}
        </Link>
      )}
    </div>
  );
}

// ── PlanFeatureGuard ──────────────────────────────────────────────────────────
interface PlanFeatureGuardProps {
  feature: keyof {
    has_advanced_reports: boolean;
    has_api_access: boolean;
    has_export: boolean;
    has_credits: boolean;
    has_suppliers: boolean;
    has_priority_support: boolean;
    has_custom_branding: boolean;
    has_sla: boolean;
  };
  fallback?: React.ReactNode;
  children: React.ReactNode;
  lang?: "fr" | "en";
}

/**
 * Protège les fonctionnalités liées au plan d'abonnement.
 */
export function PlanFeatureGuard({
  feature,
  fallback,
  children,
  lang = "fr",
}: PlanFeatureGuardProps) {
  const shop = useAuthStore((s) => s.currentShop);
  const plan = (shop?.plan as Plan) ?? "free";
  const limits = PLAN_LIMITS[plan];

  const allowed = limits[feature as keyof typeof limits] as boolean;

  if (!allowed) {
    return (
      <>
        {fallback ?? (
          <UpgradePrompt
            resource={lang === "fr" ? "cette fonctionnalité" : "this feature"}
            lang={lang}
            compact
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}

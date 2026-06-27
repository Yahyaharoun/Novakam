// src/lib/rbac/subscription-limits.ts
// Limites d'abonnement par plan pour NOVAKAM

import type { Plan, SubscriptionLimits } from "@/lib/supabase/database.types";

// ── Définition des limites par plan ───────────────────────────────────────────
export const PLAN_LIMITS: Record<Plan, SubscriptionLimits> = {
  free: {
    max_shops: 1,
    max_registers_per_shop: 1,
    max_employees: 2,
    max_products: 100,
    max_warehouses_per_shop: 1,
    has_advanced_reports: false,
    has_api_access: false,
    has_export: false,
    has_credits: true, // "dettes clients" activées dans le plan gratuit selon demande
    has_suppliers: false,
    has_priority_support: false,
    has_custom_branding: false,
    has_sla: false,
  },

  starter: {
    max_shops: 1,
    max_registers_per_shop: 2,
    max_employees: 5,
    max_products: 500,
    max_warehouses_per_shop: 2,
    has_advanced_reports: false,
    has_api_access: false,
    has_export: true,
    has_credits: false,
    has_suppliers: false,
    has_priority_support: false,
    has_custom_branding: false,
    has_sla: false,
  },

  business: {
    max_shops: 2,
    max_registers_per_shop: 5,
    max_employees: 15,
    max_products: -1, // illimité
    max_warehouses_per_shop: 5,
    has_advanced_reports: true,
    has_api_access: false,
    has_export: true,
    has_credits: true,
    has_suppliers: true,
    has_priority_support: true,
    has_custom_branding: false,
    has_sla: false,
  },

  pro: {
    max_shops: 5,
    max_registers_per_shop: 10,
    max_employees: 50,
    max_products: -1,
    max_warehouses_per_shop: 10,
    has_advanced_reports: true,
    has_api_access: true,
    has_export: true,
    has_credits: true,
    has_suppliers: true,
    has_priority_support: true,
    has_custom_branding: true,
    has_sla: false,
  },

  enterprise: {
    max_shops: -1,
    max_registers_per_shop: -1,
    max_employees: -1,
    max_products: -1,
    max_warehouses_per_shop: -1,
    has_advanced_reports: true,
    has_api_access: true,
    has_export: true,
    has_credits: true,
    has_suppliers: true,
    has_priority_support: true,
    has_custom_branding: true,
    has_sla: true,
  },
};

// ── Informations marketing des plans ──────────────────────────────────────────
export const PLAN_INFO: Record<
  Plan,
  {
    name: string;
    price: number;
    priceLabel: string;
    color: string;
    badge: string | null;
    description: { fr: string; en: string };
    features: { fr: string[]; en: string[] };
  }
> = {
  free: {
    name: "FREE",
    price: 0,
    priceLabel: "0 FCFA/mois",
    color: "gray",
    badge: null,
    description: {
      fr: "Pour démarrer votre activité",
      en: "To get your business started",
    },
    features: {
      fr: ["1 boutique", "1 caisse", "2 employés", "100 produits", "Caisse POS", "Gestion stocks"],
      en: ["1 shop", "1 register", "2 employees", "100 products", "POS", "Stock management"],
    },
  },

  starter: {
    name: "STARTER",
    price: 3000,
    priceLabel: "3 000 FCFA/mois",
    color: "blue",
    badge: null,
    description: {
      fr: "Pour les commerçants en croissance",
      en: "For growing merchants",
    },
    features: {
      fr: ["1 boutique", "2 caisses", "5 employés", "500 produits", "Rapports basiques", "Support email"],
      en: ["1 shop", "2 registers", "5 employees", "500 products", "Basic reports", "Email support"],
    },
  },

  business: {
    name: "BUSINESS",
    price: 7000,
    priceLabel: "7 000 FCFA/mois",
    color: "indigo",
    badge: "Populaire",
    description: {
      fr: "Pour les boutiques multi-sites",
      en: "For multi-location shops",
    },
    features: {
      fr: ["2 boutiques", "5 caisses/boutique", "15 employés", "Produits illimités", "Rapports complets", "Crédits clients", "Fournisseurs", "Support prioritaire"],
      en: ["2 shops", "5 registers/shop", "15 employees", "Unlimited products", "Full reports", "Customer credits", "Suppliers", "Priority support"],
    },
  },

  pro: {
    name: "PRO",
    price: 15000,
    priceLabel: "15 000 FCFA/mois",
    color: "violet",
    badge: "Recommandé",
    description: {
      fr: "Pour les entreprises sérieuses",
      en: "For serious businesses",
    },
    features: {
      fr: ["5 boutiques", "10 caisses/boutique", "50 employés", "Accès API", "Exports avancés", "Rapports avancés", "Marque personnalisée", "Support prioritaire"],
      en: ["5 shops", "10 registers/shop", "50 employees", "API access", "Advanced exports", "Advanced reports", "Custom branding", "Priority support"],
    },
  },

  enterprise: {
    name: "ENTERPRISE",
    price: 45000,
    priceLabel: "40 000 – 50 000 FCFA/mois",
    color: "amber",
    badge: "Sur mesure",
    description: {
      fr: "Pour les grandes enseignes",
      en: "For large chains",
    },
    features: {
      fr: ["Boutiques illimitées", "Caisses illimitées", "Employés illimités", "Magasins illimités", "Support dédié", "Personnalisation complète", "SLA garanti"],
      en: ["Unlimited shops", "Unlimited registers", "Unlimited employees", "Unlimited warehouses", "Dedicated support", "Full customization", "Guaranteed SLA"],
    },
  },
};

// ── Utilitaires ────────────────────────────────────────────────────────────────

/**
 * Vérifie si une ressource peut encore être créée selon le plan.
 * @param plan Le plan de la boutique
 * @param resource La ressource à vérifier
 * @param currentCount Le nombre actuel de ressources
 */
export function canCreateResource(
  plan: Plan,
  resource: keyof Pick<
    SubscriptionLimits,
    "max_shops" | "max_registers_per_shop" | "max_employees" | "max_products" | "max_warehouses_per_shop"
  >,
  currentCount: number
): { allowed: boolean; limit: number } {
  const limits = PLAN_LIMITS[plan];
  const limit = limits[resource];

  if (limit === -1) return { allowed: true, limit: -1 }; // illimité
  return { allowed: currentCount < limit, limit };
}

/**
 * Retourne le label de limite pour affichage.
 */
export function getLimitLabel(limit: number, lang: "fr" | "en" = "fr"): string {
  if (limit === -1) return lang === "fr" ? "Illimité" : "Unlimited";
  return limit.toString();
}

/**
 * Retourne le message de blocage lors d'une limite atteinte.
 */
export function getLimitBlockMessage(
  resource: string,
  plan: Plan,
  lang: "fr" | "en" = "fr"
): string {
  const upgrade = lang === "fr" ? "Passez à une offre supérieure pour" : "Upgrade your plan to";
  const add = lang === "fr" ? "ajouter davantage de" : "add more";
  const blocked =
    lang === "fr"
      ? `Vous avez atteint la limite de votre abonnement ${PLAN_INFO[plan].name}.`
      : `You have reached the limit of your ${PLAN_INFO[plan].name} subscription.`;

  return `${blocked} ${upgrade} ${add} ${resource}.`;
}

/**
 * Calcule le prochain plan supérieur.
 */
export function getNextPlan(current: Plan): Plan | null {
  const order: Plan[] = ["free", "starter", "business", "pro", "enterprise"];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

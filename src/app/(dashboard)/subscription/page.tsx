"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Check, Star, Zap, TrendingUp, Crown, Building2,
  Users, ShoppingBag, Package, Store, BarChart2, ArrowRight,
  Calendar, AlertCircle, CheckCircle2, Loader2
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useI18nStore } from "@/lib/store/i18n.store";
import { createClient } from "@/lib/supabase/client";
import { PLAN_INFO, PLAN_LIMITS, getNextPlan } from "@/lib/rbac/subscription-limits";
import { useRBAC } from "@/lib/rbac/hooks";
import { getDB } from "@/lib/db/schema";
import type { Plan, UserRole } from "@/lib/supabase/database.types";
import toast from "react-hot-toast";

const PLAN_ORDER: Plan[] = ["free", "starter", "business", "pro", "enterprise"];

const PLAN_ICONS: Record<Plan, React.ReactNode> = {
  free: <Package size={20} />,
  starter: <Zap size={20} />,
  business: <TrendingUp size={20} />,
  pro: <Star size={20} />,
  enterprise: <Crown size={20} />,
};

const PLAN_COLORS: Record<Plan, { bg: string; border: string; text: string; badge: string }> = {
  free:       { bg: "bg-slate-50 dark:bg-slate-800/50",   border: "border-slate-200 dark:border-slate-700",   text: "text-slate-600 dark:text-slate-400",   badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  starter:    { bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-200 dark:border-blue-800/50",  text: "text-blue-600 dark:text-blue-400",     badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  business:   { bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-700", text: "text-indigo-600 dark:text-indigo-400", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400" },
  pro:        { bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-700", text: "text-violet-600 dark:text-violet-400", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400" },
  enterprise: { bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-700",   text: "text-amber-600 dark:text-amber-400",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
};

interface Subscription {
  id: string;
  plan: Plan;
  status: string;
  current_period_end: string;
  trial_ends_at: string | null;
}

interface UsageCounts {
  employees: number;
  registers: number;
  warehouses: number;
  products: number;
}

export default function SubscriptionPage() {
  const { t } = useI18nStore();
  const shop = useAuthStore((s) => s.currentShop);
  const { role, can } = useRBAC();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageCounts>({ employees: 0, registers: 0, warehouses: 0, products: 0 });
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<Plan | null>(null);
  const [activationCode, setActivationCode] = useState("");
  const [activatingCode, setActivatingCode] = useState(false);

  const currentPlan = (shop?.plan ?? "free") as Plan;
  const limits = PLAN_LIMITS[currentPlan];
  const nextPlan = getNextPlan(currentPlan);

  const loadData = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      if (shop.id.startsWith('mock-')) {
        const db = getDB();
        const prodCount = await db.products.where("shop_id").equals(shop.id).count();
        const empCount = JSON.parse(localStorage.getItem("novakam-mock-employees") || "[]").filter((e: any) => e.status === 'active').length;
        setSubscription({
          id: 'mock-sub',
          plan: shop.plan as Plan,
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: null
        });
        setUsage({
          employees: empCount,
          registers: 1,
          warehouses: 1,
          products: prodCount,
        });
      } else {
        const supabase = createClient();

        const [subResult, empResult, regResult, whResult, prodResult] = await Promise.all([
          supabase.from("subscriptions").select("*").eq("shop_id", shop.id).maybeSingle(),
          supabase.from("employees").select("*", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "active"),
          supabase.from("registers").select("*", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "active"),
          supabase.from("warehouses").select("*", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "active"),
          supabase.from("products").select("*", { count: "exact", head: true }).eq("shop_id", shop.id).eq("is_active", true),
        ]);

        setSubscription(subResult.data as unknown as Subscription);
        setUsage({
          employees: empResult.count ?? 0,
          registers: regResult.count ?? 0,
          warehouses: whResult.count ?? 0,
          products: prodResult.count ?? 0,
        });
      }
    } catch {
      toast.error("Erreur lors du chargement de l'abonnement");
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleUpgrade(targetPlan: Plan) {
    if (!can("manage:subscription")) {
      toast.error("Seul le propriétaire peut modifier l'abonnement.");
      return;
    }
    // Dans un vrai système : intégration paiement Orange Money / MTN MoMo
    // Pour l'instant : simulation de l'upgrade
    setUpgrading(targetPlan);
    try {
      if (shop!.id.startsWith('mock-')) {
        const authStore = useAuthStore.getState();
        authStore.setCurrentShop({ ...shop!, plan: targetPlan }, role as UserRole);
        toast.success(`Abonnement mis à jour vers ${PLAN_INFO[targetPlan].name} !`);
        await loadData();
      } else {
        const supabase = createClient() as any;
        const { error } = await supabase
          .from("subscriptions")
          .update({ plan: targetPlan, status: "active" })
          .eq("shop_id", shop!.id);

        if (error) throw error;

        await supabase.from("shops").update({ plan: targetPlan }).eq("id", shop!.id);

        toast.success(`Abonnement mis à jour vers ${PLAN_INFO[targetPlan].name} !`);
        await loadData();
      }
    } catch {
      toast.error("Erreur lors de la mise à niveau.");
    } finally {
      setUpgrading(null);
    }
  }

  async function handleActivateCode(e: React.FormEvent) {
    e.preventDefault();
    const code = activationCode.trim().toUpperCase();
    if (!code) return;
    
    if (!can("manage:subscription")) {
      toast.error("Seul le propriétaire peut activer une licence.");
      return;
    }

    setActivatingCode(true);
    try {
      if (shop!.id.startsWith('mock-')) {
        // Simulation en mode mock
        toast.success("Code activé en mode démo !");
        setActivationCode("");
      } else {
        const res = await fetch("/api/subscriptions/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, shop_id: shop!.id })
        });
        const data = await res.json();
        
        if (!res.ok || data.error) {
          toast.error(data.error || "Erreur lors de l'activation du code.");
        } else {
          toast.success(data.message || "Licence activée avec succès !");
          setActivationCode("");
          await loadData();
          
          // Force update shop plan in auth store
          useAuthStore.getState().setCurrentShop({
            ...shop!,
            plan: data.newPlan
          }, role as any);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'activation.");
    } finally {
      setActivatingCode(false);
    }
  }

  function usageBar(current: number, max: number) {
    if (max === -1) return { pct: 0, color: "bg-emerald-500" };
    const pct = Math.min(100, (current / max) * 100);
    const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
    return { pct, color };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Abonnement & Facturation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez votre plan et suivez votre utilisation
          </p>
        </div>
        {subscription && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            subscription.status === "active"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}>
            <CheckCircle2 size={12} />
            {subscription.status === "active" ? "Actif" : subscription.status}
          </div>
        )}
      </div>

      {/* Plan actuel + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan actuel */}
        <div className={`col-span-1 p-6 rounded-2xl border-2 ${PLAN_COLORS[currentPlan].bg} ${PLAN_COLORS[currentPlan].border}`}>
          <div className={`inline-flex items-center gap-2 text-sm font-bold mb-4 ${PLAN_COLORS[currentPlan].text}`}>
            {PLAN_ICONS[currentPlan]}
            Plan actuel
          </div>
          <div className="space-y-3">
            <div>
              <div className={`text-3xl font-black ${PLAN_COLORS[currentPlan].text}`}>
                {PLAN_INFO[currentPlan].name}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {PLAN_INFO[currentPlan].priceLabel}
              </div>
            </div>
            {subscription?.current_period_end && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar size={12} />
                Renouvellement : {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
              </div>
            )}
          </div>
        </div>

        {/* Utilisation */}
        <div className="col-span-1 lg:col-span-2 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Utilisation actuelle
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Employés", icon: <Users size={14}/>, current: usage.employees, max: limits.max_employees, key: "employees" },
              { label: "Caisses", icon: <ShoppingBag size={14}/>, current: usage.registers, max: limits.max_registers_per_shop, key: "registers" },
              { label: "Magasins", icon: <Store size={14}/>, current: usage.warehouses, max: limits.max_warehouses_per_shop, key: "warehouses" },
              { label: "Produits", icon: <Package size={14}/>, current: usage.products, max: limits.max_products, key: "products" },
            ].map(({ label, icon, current, max, key }) => {
              const { pct, color } = usageBar(current, max);
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">{icon}{label}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {current} / {max === -1 ? "∞" : max}
                    </span>
                  </div>
                  {max !== -1 && (
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {max === -1 && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Illimité</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Avertissement si proche de la limite */}
          {[usage.employees >= (limits.max_employees * 0.9) && limits.max_employees !== -1,
            usage.registers >= (limits.max_registers_per_shop * 0.9) && limits.max_registers_per_shop !== -1].some(Boolean) && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle size={14} className="flex-shrink-0" />
              Vous approchez de vos limites. Pensez à upgrader votre plan.
            </div>
          )}
        </div>
      </div>

      {/* Activation Code Bêta */}
      <div className="p-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap size={18} className="text-blue-600 dark:text-blue-400" />
              Activer une licence Bêta
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Vous avez reçu un code d'activation ? Entrez-le ici pour débloquer votre accès.
            </p>
          </div>
          <form onSubmit={handleActivateCode} className="w-full md:w-auto flex items-center gap-2">
            <input
              type="text"
              placeholder="NVK-XXXX-XXXX-XXXX"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
            />
            <button
              type="submit"
              disabled={activatingCode || !activationCode.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
            >
              {activatingCode ? <Loader2 size={16} className="animate-spin" /> : "Activer"}
            </button>
          </form>
        </div>
      </div>

      {/* Plans disponibles */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Changer de plan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {PLAN_ORDER.map((plan) => {
            const info = PLAN_INFO[plan];
            const colors = PLAN_COLORS[plan];
            const isCurrent = plan === currentPlan;
            const isDowngrade = PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(currentPlan);

            return (
              <div
                key={plan}
                className={`relative flex flex-col rounded-2xl border-2 p-5 transition-all ${
                  isCurrent
                    ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-current`
                    : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                {/* Badge */}
                {info.badge && !isCurrent && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>
                    {info.badge}
                  </div>
                )}
                {isCurrent && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>
                    Plan actuel
                  </div>
                )}

                {/* Icon + Nom */}
                <div className={`flex items-center gap-2 mb-3 ${colors.text}`}>
                  {PLAN_ICONS[plan]}
                  <span className="font-bold text-sm">{info.name}</span>
                </div>

                {/* Prix */}
                <div className="mb-4">
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {plan === "free" ? "Gratuit" : info.price.toLocaleString("fr-FR") + " FCFA"}
                  </div>
                  {plan !== "free" && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">/mois</div>
                  )}
                </div>

                {/* Features clés */}
                <ul className="space-y-1.5 mb-5 flex-1">
                  {info.features.fr.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Check size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {!isCurrent && (
                  <button
                    onClick={() => !isDowngrade && handleUpgrade(plan)}
                    disabled={!!upgrading || isDowngrade || !can("manage:subscription")}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      isDowngrade
                        ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                        : can("manage:subscription")
                        ? `bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md hover:shadow-blue-500/30 flex items-center justify-center gap-1`
                        : "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {upgrading === plan ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isDowngrade ? (
                      "Rétrograder"
                    ) : (
                      <>Choisir <ArrowRight size={12} /></>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {!can("manage:subscription") && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
            Seul le propriétaire (OWNER) peut modifier l'abonnement.
          </p>
        )}
      </div>

      {/* Fonctionnalités incluses */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Fonctionnalités incluses dans votre plan {PLAN_INFO[currentPlan].name}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Rapports avancés", key: "has_advanced_reports" },
            { label: "Accès API", key: "has_api_access" },
            { label: "Exports", key: "has_export" },
            { label: "Crédits clients", key: "has_credits" },
            { label: "Fournisseurs", key: "has_suppliers" },
            { label: "Support prioritaire", key: "has_priority_support" },
            { label: "Marque perso.", key: "has_custom_branding" },
            { label: "SLA garanti", key: "has_sla" },
          ].map(({ label, key }) => {
            const active = limits[key as keyof typeof limits] as boolean;
            return (
              <div key={key} className={`flex items-center gap-2 text-xs ${active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-600 line-through"}`}>
                <Check size={12} className={active ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"} />
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

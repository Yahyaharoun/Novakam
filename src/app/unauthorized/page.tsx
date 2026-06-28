"use client";

import { ShieldAlert, TrendingUp, ArrowLeft, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-gray-50 dark:bg-slate-950" />}>
      <UnauthorizedContent />
    </Suspense>
  );
}

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason"); // "plan" or undefined (role)
  const isPlanRestricted = reason === "plan";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 ${
          isPlanRestricted
            ? "bg-amber-100 dark:bg-amber-900/30"
            : "bg-red-100 dark:bg-red-900/30"
        }`}>
          {isPlanRestricted ? (
            <Lock size={44} className="text-amber-600 dark:text-amber-400" />
          ) : (
            <ShieldAlert size={44} className="text-red-500" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
          {isPlanRestricted ? "Fonctionnalité Verrouillée" : "Accès Refusé"}
        </h1>

        {/* Message */}
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
          {isPlanRestricted
            ? "Cette fonctionnalité n'est pas disponible dans votre forfait actuel. Mettez à niveau votre abonnement pour y accéder."
            : "Vous n'avez pas les permissions nécessaires pour accéder à cette section. Contactez l'administrateur de votre boutique si vous pensez qu'il s'agit d'une erreur."}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={18} />
            Retourner en arrière
          </button>

          {isPlanRestricted && (
            <Link
              href="/subscription"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5"
            >
              <TrendingUp size={18} />
              Voir les forfaits
            </Link>
          )}

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Tableau de bord
          </Link>
        </div>

        {/* Plan upgrade teaser */}
        {isPlanRestricted && (
          <div className="mt-10 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl text-left">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Débloquez avec BUSINESS ou PRO</p>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Rapports complets & statistiques</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Gestion des crédits clients</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Gestion des dépenses</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span> API & exports avancés (PRO)</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span> Journal d'audit (PRO)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

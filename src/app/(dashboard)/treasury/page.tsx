"use client";
import { useState } from "react";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter,
} from "lucide-react";
import { useI18nStore } from "@/lib/store/i18n.store";

const MOCK_MOVEMENTS = [
  {
    id: "1",
    type: "sale_income",
    label: "Vente #V-2025-0089",
    amount: 45000,
    method: "Espèces",
    direction: "in",
    date: "2025-06-23T09:15:00",
  },
  {
    id: "2",
    type: "expense",
    label: "Achat fournitures bureau",
    amount: 12500,
    method: "Espèces",
    direction: "out",
    date: "2025-06-23T10:30:00",
  },
  {
    id: "3",
    type: "sale_income",
    label: "Vente #V-2025-0090",
    amount: 78000,
    method: "Mobile Money",
    direction: "in",
    date: "2025-06-23T11:00:00",
  },
  {
    id: "4",
    type: "credit_payment",
    label: "Remboursement Mama Adjoua",
    amount: 25000,
    method: "Espèces",
    direction: "in",
    date: "2025-06-23T14:20:00",
  },
  {
    id: "5",
    type: "expense",
    label: "Loyer mensuel",
    amount: 80000,
    method: "Virement",
    direction: "out",
    date: "2025-06-23T15:00:00",
  },
];

const getTypeLabel = (t: any, type: string) => {
  switch (type) {
    case "sale_income": return t("treasury.type_sale");
    case "expense": return t("treasury.type_expense");
    case "credit_payment": return t("treasury.type_credit");
    case "debt_payment": return t("treasury.type_debt");
    case "withdrawal": return t("treasury.type_withdrawal");
    case "deposit": return t("treasury.type_deposit");
    default: return type;
  }
};

export default function TreasuryPage() {
  const { t } = useI18nStore();
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  const todayIn = MOCK_MOVEMENTS.filter((m) => m.direction === "in").reduce(
    (s, m) => s + m.amount,
    0
  );
  const todayOut = MOCK_MOVEMENTS.filter((m) => m.direction === "out").reduce(
    (s, m) => s + m.amount,
    0
  );
  const balance = 520000; // solde d'ouverture fictif + entrées - sorties
  const netToday = todayIn - todayOut;

  const filtered =
    filter === "all"
      ? MOCK_MOVEMENTS
      : MOCK_MOVEMENTS.filter((m) => m.direction === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("treasury.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("treasury.subtitle")}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors text-sm">
          <RefreshCw size={15} />
          {t("treasury.refresh")}
        </button>
      </div>

      {/* Solde principal */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm font-medium mb-2">
          {t("treasury.current_balance")}
        </p>
        <p className="text-4xl font-bold mb-1">
          {(balance + netToday).toLocaleString()} FCFA
        </p>
        <p className="text-blue-200 text-sm">
          {t("treasury.updated_on")} {new Date().toLocaleDateString()} {t("treasury.at")}{" "}
          {new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t("treasury.today_in")}
            </p>
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">
            +{todayIn.toLocaleString()} FCFA
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t("treasury.today_out")}
            </p>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-500">
            -{todayOut.toLocaleString()} FCFA
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t("treasury.net_today")}
            </p>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                netToday >= 0
                  ? "bg-blue-100 dark:bg-blue-900/40"
                  : "bg-orange-100 dark:bg-orange-900/40"
              }`}
            >
              <Landmark
                size={16}
                className={netToday >= 0 ? "text-blue-600" : "text-orange-500"}
              />
            </div>
          </div>
          <p
            className={`text-2xl font-bold ${
              netToday >= 0 ? "text-blue-600" : "text-orange-500"
            }`}
          >
            {netToday >= 0 ? "+" : ""}
            {netToday.toLocaleString()} FCFA
          </p>
        </div>
      </div>

      {/* Mouvements */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">
            {t("treasury.movements_title")}
          </h2>
          <div className="flex gap-2">
            {(["all", "in", "out"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {f === "all" ? t("treasury.filter_all") : f === "in" ? t("treasury.filter_in") : t("treasury.filter_out")}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    movement.direction === "in"
                      ? "bg-green-100 dark:bg-green-900/40"
                      : "bg-red-100 dark:bg-red-900/40"
                  }`}
                >
                  {movement.direction === "in" ? (
                    <ArrowDownRight size={16} className="text-green-600" />
                  ) : (
                    <ArrowUpRight size={16} className="text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {movement.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getTypeLabel(t, movement.type)} · {movement.method} ·{" "}
                    {new Date(movement.date).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <p
                className={`text-sm font-bold ${
                  movement.direction === "in" ? "text-green-600" : "text-red-500"
                }`}
              >
                {movement.direction === "in" ? "+" : "-"}
                {movement.amount.toLocaleString()} FCFA
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

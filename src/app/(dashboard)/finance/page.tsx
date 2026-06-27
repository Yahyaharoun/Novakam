"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Package, Activity } from "lucide-react";
import { useFinance } from "@/lib/hooks/use-finance";
import { formatCurrency } from "@/lib/utils/currency";

export default function FinanceDashboardPage() {
  const { getMetrics } = useFinance();
  const [metrics, setMetrics] = useState({
    revenue: 0,
    grossProfit: 0,
    netProfit: 0,
    totalExpenses: 0,
    stockValue: 0,
    salesCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await getMetrics();
      if (data) setMetrics(data);
      setIsLoading(false);
    }
    load();
  }, [getMetrics]);

  if (isLoading) {
    return (
      <div className="page-enter" style={{ padding: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "24px" }}>Tableau de bord financier</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: "120px", borderRadius: "12px" }} />)}
        </div>
      </div>
    );
  }

  const KpiCard = ({ title, amount, icon, color, trend }: any) => (
    <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", borderTop: `4px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </p>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
      </div>
      <div>
        <p style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em" }} className="currency-display">
          {formatCurrency(amount)}
        </p>
        {trend && (
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{trend}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-enter" style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
            Aperçu Financier
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Calculs automatiques basés sur vos ventes et dépenses.
          </p>
        </div>
        <select className="input" style={{ width: "200px" }} defaultValue="all">
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="all">Tout l'historique</option>
        </select>
      </div>

      {/* Primary Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <KpiCard 
          title="Chiffre d'Affaires (CA)" 
          amount={metrics.revenue} 
          color="#3b82f6" 
          icon={<DollarSign size={20} color="#3b82f6" />} 
          trend={`${metrics.salesCount} ventes réalisées`}
        />
        <KpiCard 
          title="Bénéfice Brut (Marge)" 
          amount={metrics.grossProfit} 
          color="#8b5cf6" 
          icon={<TrendingUp size={20} color="#8b5cf6" />} 
          trend="CA - Coût d'achat des produits vendus"
        />
        <KpiCard 
          title="Bénéfice Net" 
          amount={metrics.netProfit} 
          color={metrics.netProfit >= 0 ? "#10b981" : "#ef4444"} 
          icon={<Activity size={20} color={metrics.netProfit >= 0 ? "#10b981" : "#ef4444"} />} 
          trend="Bénéfice Brut - Dépenses"
        />
      </div>

      {/* Secondary Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
        <KpiCard 
          title="Total Dépenses" 
          amount={metrics.totalExpenses} 
          color="#f59e0b" 
          icon={<TrendingDown size={20} color="#f59e0b" />} 
          trend="Loyer, électricité, salaires, etc."
        />
        <KpiCard 
          title="Valeur du Stock Actuel" 
          amount={metrics.stockValue} 
          color="#64748b" 
          icon={<Package size={20} color="#64748b" />} 
          trend="Capital immobilisé en marchandises"
        />
      </div>
    </div>
  );
}

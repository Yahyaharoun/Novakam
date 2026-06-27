"use client";

import { useState } from "react";
import { useAnalytics } from "@/lib/hooks/use-analytics";
import { formatCurrency } from "@/lib/utils/currency";
import dynamic from "next/dynamic";

const BarChart = dynamic(() => import("recharts").then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(mod => mod.Bar), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import("recharts").then(mod => mod.Legend), { ssr: false });

import { TrendingUp, TrendingDown, DollarSign, Package, AlertCircle } from "lucide-react";
import { useI18nStore } from "@/lib/store/i18n.store";
import { useRBAC } from "@/lib/rbac/hooks";
import { PLAN_LIMITS } from "@/lib/rbac/subscription-limits";

export default function AnalyticsDashboardPage() {
  const { t } = useI18nStore();
  const [days, setDays] = useState(30);
  const { kpis, salesHistory, cashFlowHistory, topProducts, isLoading, refresh } = useAnalytics();
  const { plan } = useRBAC();
  const limits = PLAN_LIMITS[plan];

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDays = parseInt(e.target.value);
    setDays(newDays);
    refresh(newDays);
  };

  if (isLoading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>{t("dashboard.loading")}</div>;
  }

  return (
    <div className="page-enter" style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* Header & Period Selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
            {t("dashboard.title")}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            {t("dashboard.subtitle")}
          </p>
        </div>
        <select className="input" style={{ width: "200px" }} value={days} onChange={handlePeriodChange}>
          <option value="7">{t("dashboard.period_7")}</option>
          <option value="30">{t("dashboard.period_30")}</option>
          <option value="90">{t("dashboard.period_90")}</option>
          <option value="365">{t("dashboard.period_365")}</option>
        </select>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        
        <div className="card" style={{ padding: "20px", borderTop: "4px solid #3b82f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>{t("dashboard.net_sales")}</p>
            <DollarSign size={20} color="#3b82f6" />
          </div>
          <p style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }} className="currency-display">
            {formatCurrency(kpis.totalRevenue)}
          </p>
        </div>

        <div className="card" style={{ padding: "20px", borderTop: "4px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>{t("dashboard.gross_profit")}</p>
            <TrendingUp size={20} color="#10b981" />
          </div>
          <p style={{ fontSize: "28px", fontWeight: "800", color: "#10b981" }} className="currency-display">
            {formatCurrency(kpis.totalProfit)}
          </p>
        </div>

        {limits.has_credits && (
        <div className="card" style={{ padding: "20px", borderTop: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>{t("dashboard.customer_credits")}</p>
            <AlertCircle size={20} color="#f59e0b" />
          </div>
          <p style={{ fontSize: "28px", fontWeight: "800", color: "#f59e0b" }} className="currency-display">
            {formatCurrency(kpis.totalCredits)}
          </p>
        </div>
        )}

        {limits.has_suppliers && (
        <div className="card" style={{ padding: "20px", borderTop: "4px solid #ef4444" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>{t("dashboard.supplier_debts")}</p>
            <TrendingDown size={20} color="#ef4444" />
          </div>
          <p style={{ fontSize: "28px", fontWeight: "800", color: "#ef4444" }} className="currency-display">
            {formatCurrency(kpis.totalDebts)}
          </p>
        </div>
        )}

      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        
        {/* Sales Evolution Area Chart */}
        <div className="card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "24px" }}>{t("dashboard.chart_sales_profit")}</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value) || 0)}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                <Area type="monotone" name={t("dashboard.chart_sales")} dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" name={t("dashboard.chart_profit")} dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Flow Bar Chart */}
        <div className="card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "24px" }}>{t("dashboard.chart_cashflow")}</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  formatter={(value: any) => formatCurrency(Number(value) || 0)}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                <Bar name={t("dashboard.chart_in")} dataKey="inflow" fill="url(#colorIn)" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar name={t("dashboard.chart_out")} dataKey="outflow" fill="url(#colorOut)" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Products */}
      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <Package size={20} color="var(--color-primary-500)" />
          <h2 style={{ fontSize: "16px", fontWeight: "700" }}>{t("dashboard.top_products")}</h2>
        </div>
        
        {topProducts.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>{t("dashboard.no_sales")}</p>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {topProducts.map((p, index) => (
              <div key={p.product_id} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "24px", fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textAlign: "center" }}>
                  #{index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{p.name}</p>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-primary-600)" }} className="currency-display">
                      {formatCurrency(p.revenue)}
                    </p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, height: "6px", background: "var(--bg-muted)", borderRadius: "3px", overflow: "hidden", marginRight: "12px" }}>
                      <div style={{ 
                        height: "100%", background: "var(--color-primary-500)", borderRadius: "3px",
                        width: `${(p.revenue / topProducts[0].revenue) * 100}%` 
                      }} />
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{p.quantity} vendus</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

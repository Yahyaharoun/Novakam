"use client";

import { useEffect, useState } from "react";
import { Store, Users, CreditCard, Activity, TrendingUp, AlertCircle, Database } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

// Simulation des KPIs globaux pour le moment (Devrait être fetché depuis une API Admin)
const MOCK_KPIS = {
  totalShops: 124,
  activeShops: 110,
  totalUsers: 450,
  mrr: 1545000,
  activeSubscriptions: 89,
  systemHealth: "100%",
};

export default function AdminDashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="page-enter">
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
          Vue d'ensemble du Système
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Métriques globales et état de santé du SaaS NOVAKAM.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        
        {/* KPI: Boutiques */}
        <div className="card" style={{ padding: "24px", borderTop: "4px solid #3b82f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Boutiques</p>
            <div style={{ padding: "8px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px" }}>
              <Store size={20} color="#3b82f6" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <p style={{ fontSize: "36px", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1 }}>{MOCK_KPIS.totalShops}</p>
            <p style={{ fontSize: "14px", color: "#10b981", fontWeight: "600" }}>{MOCK_KPIS.activeShops} actives</p>
          </div>
        </div>

        {/* KPI: Revenu Mensuel Récurrent (MRR) */}
        <div className="card" style={{ padding: "24px", borderTop: "4px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>MRR Estimé</p>
            <div style={{ padding: "8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px" }}>
              <TrendingUp size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <p style={{ fontSize: "36px", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1 }} className="currency-display">
              {formatCurrency(MOCK_KPIS.mrr)}
            </p>
            <p style={{ fontSize: "14px", color: "#10b981", fontWeight: "600" }}>+12%</p>
          </div>
        </div>

        {/* KPI: Abonnements */}
        <div className="card" style={{ padding: "24px", borderTop: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Abonnements Pro</p>
            <div style={{ padding: "8px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px" }}>
              <CreditCard size={20} color="#f59e0b" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <p style={{ fontSize: "36px", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1 }}>{MOCK_KPIS.activeSubscriptions}</p>
          </div>
        </div>

        {/* KPI: Utilisateurs */}
        <div className="card" style={{ padding: "24px", borderTop: "4px solid #8b5cf6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Utilisateurs Totaux</p>
            <div style={{ padding: "8px", background: "rgba(139, 92, 246, 0.1)", borderRadius: "8px" }}>
              <Users size={20} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <p style={{ fontSize: "36px", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1 }}>{MOCK_KPIS.totalUsers}</p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* Graphique / Activité récente */}
        <div className="card" style={{ padding: "24px", minHeight: "400px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={20} color="var(--text-secondary)" />
            Activité Récente (Simulation)
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", background: "var(--bg-base)", borderRadius: "8px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: i % 2 === 0 ? "#10b981" : "#3b82f6" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                    {i % 2 === 0 ? "Nouvelle souscription (Plan Pro)" : "Nouvelle boutique créée (Boutique Mode VIP)"}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Il y a {i * 12} minutes</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* État du système */}
        <div className="card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={20} color="var(--text-secondary)" />
            État du Système
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Base de données (Supabase)</span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#10b981" }}>Opérationnel</span>
              </div>
              <div style={{ height: "6px", background: "var(--bg-base)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", background: "#10b981" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>API & Edge Functions</span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#10b981" }}>Opérationnel</span>
              </div>
              <div style={{ height: "6px", background: "var(--bg-base)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", background: "#10b981" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Synchronisation Offline</span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#10b981" }}>Opérationnel</span>
              </div>
              <div style={{ height: "6px", background: "var(--bg-base)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", background: "#10b981" }} />
              </div>
            </div>

            <div style={{ marginTop: "16px", padding: "16px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <AlertCircle size={20} color="#10b981" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#065f46", margin: "0 0 4px 0" }}>Aucun incident</p>
                <p style={{ fontSize: "13px", color: "#047857", margin: 0 }}>Tous les systèmes fonctionnent normalement.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

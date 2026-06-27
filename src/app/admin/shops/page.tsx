"use client";
import { Store, Search, Filter } from "lucide-react";

export default function AdminShopsPage() {
  return (
    <div className="page-enter">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
            Gestion des Boutiques
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Supervisez toutes les boutiques créées sur NOVAKAM.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: "20px", display: "flex", gap: "12px", marginBottom: "24px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input 
            type="text" 
            className="input" 
            placeholder="Rechercher une boutique par nom, ID ou email..." 
            style={{ paddingLeft: "42px", width: "100%" }}
          />
        </div>
        <button className="btn btn-outline" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Filter size={16} />
          Filtres
        </button>
      </div>

      <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        <Store size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
        <p style={{ fontSize: "16px", fontWeight: "600" }}>En construction</p>
        <p style={{ fontSize: "14px", marginTop: "8px" }}>La liste des boutiques sera intégrée ici (API Admin requise).</p>
      </div>
    </div>
  );
}

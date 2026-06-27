"use client";
import { Users, Search, Filter } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <div className="page-enter">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
            Gestion des Utilisateurs
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Gérez tous les utilisateurs, propriétaires et employés du SaaS.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        <Users size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
        <p style={{ fontSize: "16px", fontWeight: "600" }}>En construction</p>
        <p style={{ fontSize: "14px", marginTop: "8px" }}>La liste des utilisateurs sera intégrée ici.</p>
      </div>
    </div>
  );
}

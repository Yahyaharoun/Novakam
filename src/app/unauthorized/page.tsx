"use client";

import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-base)", padding: "24px", textAlign: "center" }}>
      <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
        <ShieldAlert size={40} color="#ef4444" />
      </div>
      
      <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
        Accès Refusé
      </h1>
      <p style={{ fontSize: "16px", color: "var(--text-secondary)", maxWidth: "400px", lineHeight: 1.5, marginBottom: "32px" }}>
        Vous n'avez pas les permissions nécessaires pour accéder à cette section de l'application. Veuillez contacter l'administrateur de la boutique si vous pensez qu'il s'agit d'une erreur.
      </p>

      <button onClick={() => router.back()} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px" }}>
        <ArrowLeft size={18} /> Retourner à la page précédente
      </button>
    </div>
  );
}

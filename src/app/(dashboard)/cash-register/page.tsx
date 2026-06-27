"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useFinance } from "@/lib/hooks/use-finance";
import { getDB, type LocalCashRegisterSession } from "@/lib/db/schema";
import { useAuthStore } from "@/lib/store/auth.store";
import { formatCurrency } from "@/lib/utils/currency";
import toast from "react-hot-toast";

export default function CashRegisterPage() {
  const shop = useAuthStore(s => s.currentShop);
  const { openCashRegister, closeCashRegister } = useFinance();
  
  const [session, setSession] = useState<LocalCashRegisterSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Inputs
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");

  useEffect(() => {
    async function checkActiveSession() {
      if (!shop?.id) return;
      const db = getDB();
      // Find active open session for this shop
      const active = await db.cashRegisterSessions
        .where("shop_id").equals(shop.id)
        .filter(s => s.status === "open")
        .first();
        
      setSession(active || null);
      setIsLoading(false);
    }
    checkActiveSession();
  }, [shop?.id]);

  const handleOpen = async () => {
    const amt = parseFloat(openingBalance);
    if (isNaN(amt) || amt < 0) {
      toast.error("Veuillez saisir un fond de caisse valide.");
      return;
    }
    try {
      // Fake cash register ID for now since we don't have a UI to manage registers
      const newSession = await openCashRegister("REG-001", amt);
      setSession(newSession);
      toast.success("Caisse ouverte avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'ouverture de la caisse");
    }
  };

  const handleClose = async () => {
    if (!session) return;
    const amt = parseFloat(closingBalance);
    if (isNaN(amt) || amt < 0) {
      toast.error("Veuillez saisir le solde réel de la caisse.");
      return;
    }
    try {
      await closeCashRegister(session.id, amt);
      setSession(null);
      setClosingBalance("");
      toast.success("Caisse fermée avec succès !");
    } catch (e) {
      toast.error("Erreur lors de la fermeture de la caisse");
    }
  };

  if (isLoading) return <div style={{ padding: "24px" }}>Chargement de l'état de la caisse...</div>;

  return (
    <div className="page-enter" style={{ padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "24px", textAlign: "center" }}>
        Gestion de la Caisse
      </h1>

      {session ? (
        // SESSION IS OPEN
        <div className="card" style={{ padding: "32px", borderTop: "4px solid #10b981", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Unlock size={32} color="#10b981" />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#10b981", marginBottom: "8px" }}>Caisse Ouverte</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
            La caisse est actuellement active. Les ventes sont autorisées.
          </p>

          <div style={{ background: "var(--bg-muted)", padding: "16px", borderRadius: "8px", textAlign: "left", marginBottom: "32px" }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Fond de caisse initial
            </p>
            <p style={{ fontSize: "24px", fontWeight: "700" }} className="currency-display">
              {formatCurrency(session.opening_balance)}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
              Ouverte le : {new Date(session.opened_at).toLocaleString("fr-CM")}
            </p>
          </div>

          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
              Clôture de la caisse (Solde réel compté)
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input 
                type="number" 
                className="input" 
                style={{ flex: 1, fontSize: "18px", fontWeight: "600" }} 
                placeholder="Montant total en espèces dans le tiroir"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
              />
              <button onClick={handleClose} className="btn btn-primary" style={{ background: "#ef4444" }}>
                Fermer la caisse
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
               <AlertTriangle size={14} color="#f59e0b" />
               <span>Le système calculera l'écart entre le solde théorique et votre comptage.</span>
            </div>
          </div>
        </div>
      ) : (
        // SESSION IS CLOSED
        <div className="card" style={{ padding: "32px", borderTop: "4px solid #ef4444", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Lock size={32} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ef4444", marginBottom: "8px" }}>Caisse Fermée</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "32px" }}>
            Vous devez ouvrir la caisse pour autoriser les encaissements en espèces.
          </p>

          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
              Fond de caisse (Espèces disponibles à l'ouverture)
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input 
                type="number" 
                className="input" 
                style={{ flex: 1, fontSize: "18px", fontWeight: "600" }} 
                placeholder="0 FCFA"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <button onClick={handleOpen} className="btn btn-primary" style={{ background: "#10b981" }}>
                Ouvrir la caisse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

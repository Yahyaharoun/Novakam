"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, ShoppingBag, Banknote, History } from "lucide-react";
import { getDB, type LocalCustomer, type LocalCredit } from "@/lib/db/schema";
import { useCustomers } from "@/lib/hooks/use-customers";
import { formatCurrency } from "@/lib/utils/currency";
import toast from "react-hot-toast";

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;
  
  const { payDebt } = useCustomers();
  
  const [customer, setCustomer] = useState<LocalCustomer | null>(null);
  const [unpaidCredits, setUnpaidCredits] = useState<LocalCredit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMethod, setPayMethod] = useState<"cash" | "mobile_money" | "bank_transfer">("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!customerId) return;
    const db = getDB();
    const c = await db.customers.get(customerId);
    setCustomer(c ?? null);

    if (c) {
      const credits = await db.credits
        .where("customer_id").equals(c.id)
        .filter(cred => cred.status === "active" || cred.status === "overdue")
        .toArray();
      setUnpaidCredits(credits);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [customerId]);

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !payAmount || Number(payAmount) <= 0) return;

    if (Number(payAmount) > customer.current_debt) {
      toast.error("Le montant dépasse la dette actuelle !");
      return;
    }

    setIsSubmitting(true);
    try {
      await payDebt(customer.id, Number(payAmount), payMethod);
      toast.success("Remboursement enregistré avec succès !");
      setIsPayModalOpen(false);
      setPayAmount("");
      await loadData(); // Reload stats
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div style={{ padding: "40px", textAlign: "center" }}>Chargement...</div>;
  if (!customer) return <div style={{ padding: "40px", textAlign: "center" }}>Client introuvable.</div>;

  return (
    <div className="page-enter" style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ padding: "8px" }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>
            {customer.name}
          </h1>
          <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            {customer.phone && <span>📞 {customer.phone}</span>}
            {customer.email && <span>✉️ {customer.email}</span>}
          </div>
        </div>
        <div>
          <button onClick={() => setIsPayModalOpen(true)} className="btn btn-primary btn-lg" disabled={customer.current_debt <= 0}>
            <Banknote size={18} /> Payer Dette
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "32px" }}>
        <div className="card" style={{ padding: "24px", borderTop: "4px solid #ef4444" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Dette en cours</p>
            <CreditCard size={20} color="#ef4444" />
          </div>
          <p style={{ fontSize: "32px", fontWeight: "800", color: customer.current_debt > 0 ? "#ef4444" : "var(--text-primary)" }} className="currency-display">
            {formatCurrency(customer.current_debt)}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
            Limite autorisée: {formatCurrency(customer.credit_limit)}
          </p>
        </div>

        <div className="card" style={{ padding: "24px", borderTop: "4px solid var(--color-primary-500)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Achats</p>
            <ShoppingBag size={20} color="var(--color-primary-500)" />
          </div>
          <p style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)" }} className="currency-display">
            {formatCurrency(customer.total_purchases)}
          </p>
        </div>

        <div className="card" style={{ padding: "24px", borderTop: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Points Fidélité</p>
            <History size={20} color="#f59e0b" />
          </div>
          <p style={{ fontSize: "32px", fontWeight: "800", color: "#f59e0b" }}>
            {customer.points}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
            (Ex: 100 FCFA = 1 pt)
          </p>
        </div>
      </div>

      {/* Unpaid Credits Table */}
      <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "var(--text-primary)" }}>
        Crédits non soldés ({unpaidCredits.length})
      </h2>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date d'emprunt</th>
              <th>Montant Initial</th>
              <th>Reste à Payer</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {unpaidCredits.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>Aucune dette en cours.</td></tr>
            ) : (
              unpaidCredits.map(credit => (
                <tr key={credit.id}>
                  <td>{new Date(credit.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="currency-display">{formatCurrency(credit.original_amount)}</td>
                  <td className="currency-display" style={{ fontWeight: "700", color: "#ef4444" }}>
                    {formatCurrency(credit.remaining_amount)}
                  </td>
                  <td>
                    <span className="badge badge-red">Non soldé</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pay Debt Modal */}
      {isPayModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)"
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "450px", padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>Encaisser un recouvrement</h2>
            
            <form onSubmit={handlePayDebt} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ padding: "12px", background: "#fee2e2", borderRadius: "8px", color: "#991b1b" }}>
                <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>Dette totale de {customer.name} :</p>
                <p style={{ fontSize: "20px", fontWeight: "800" }} className="currency-display">{formatCurrency(customer.current_debt)}</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Montant remboursé aujourd'hui *
                </label>
                <input 
                  required type="number" min="1" max={customer.current_debt} step="0.01" 
                  className="input" 
                  value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Moyen de paiement *
                </label>
                <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value as any)}>
                  <option value="cash">Espèces</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Virement Bancaire</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="btn btn-secondary">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? "Traitement..." : "Valider le paiement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useState } from "react";
import { UserCheck, Plus, Banknote, Smartphone, CreditCard, CheckCircle, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils/currency";
import { useCartStore } from "@/lib/store/cart.store";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useI18nStore } from "@/lib/store/i18n.store";
import type { PaymentMethod } from "@/lib/supabase/database.types";

export interface PaymentSplitExt {
  method: PaymentMethod;
  amount: number;
  provider?: string;
  reference?: string;
}

interface PosCheckoutColumnProps {
  onComplete: (payments: PaymentSplitExt[], customerId?: string) => Promise<void>;
  isSubmitting: boolean;
}

export function PosCheckoutColumn({ onComplete, isSubmitting }: PosCheckoutColumnProps) {
  const { t } = useI18nStore();
  const cart = useCartStore();
  const { customers } = useCustomers();
  
  const [currentMethod, setCurrentMethod] = useState<"cash" | "om" | "momo">("cash");
  const [amountInput, setAmountInput] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const selectedCustomer = customers.find(c => c.id === cart.customerId);

  // Mixed payments support (currently just one active for UI simplicity unless added)
  // For this v1 of redesign, if they type an amount, we use it. 
  // If they want mixed, they can add to cart.payments (we added it to store).
  const handleAddPayment = () => {
    const amt = parseFloat(amountInput);
    if (!isNaN(amt) && amt > 0) {
      cart.setPayments([...cart.payments, { method: currentMethod, amount: amt }]);
      setAmountInput("");
    }
  };

  const removePayment = (index: number) => {
    cart.setPayments(cart.payments.filter((_, i) => i !== index));
  };

  const totalPaid = cart.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, cart.total - totalPaid);
  const change = Math.max(0, totalPaid - cart.total);

  const handleValidate = () => {
    if ((currentMethod === "om" || currentMethod === "momo") && !transactionRef.trim()) {
      toast.error("Veuillez saisir le numéro de transaction avant de valider.");
      return;
    }

    let finalPayments: PaymentSplitExt[] = [...cart.payments as PaymentSplitExt[]];
    
    const methodStr = currentMethod === "cash" ? "cash" : "mobile_money";
    const providerStr = currentMethod === "om" ? "Orange Money" : currentMethod === "momo" ? "MTN MoMo" : undefined;
    
    // Auto-add pending input or full amount if nothing was added
    if (cart.payments.length === 0) {
      const amt = amountInput !== "" ? parseFloat(amountInput) : remaining;
      if (!isNaN(amt) && amt > 0) {
        finalPayments = [{ method: methodStr, amount: amt, provider: providerStr, reference: transactionRef }];
      }
      // If amt === 0 (user typed 0), we leave finalPayments empty to create a 100% credit.
    } else if (amountInput !== "") {
      const amt = parseFloat(amountInput);
      if (!isNaN(amt) && amt > 0) {
        finalPayments.push({ method: methodStr, amount: amt, provider: providerStr, reference: transactionRef });
      }
    }

    const currentTotalPaid = finalPayments.reduce((s, p) => s + p.amount, 0);

    if (currentTotalPaid < cart.total && !cart.customerId) {
      toast.error("Un client doit être sélectionné pour autoriser un crédit (paiement incomplet).");
      return;
    }
    
    onComplete(finalPayments, cart.customerId || undefined);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "16px" }}>
      
      {/* Customer Section */}
      <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-base)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
            <UserCheck size={16} /> Client
          </h3>
          <button className="btn btn-ghost btn-sm" style={{ width: "28px", height: "28px", padding: 0 }} title="Nouveau client">
            <Plus size={16} />
          </button>
        </div>
        
        <select 
          className="input" 
          style={{ width: "100%", fontSize: "14px" }}
          value={cart.customerId || ""}
          onChange={(e) => cart.setCustomer(e.target.value || null)}
        >
          <option value="">{t("pos.walkin_customer") || "Client de passage"}</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
          ))}
        </select>
        {selectedCustomer && (
          <p style={{ fontSize: "12px", color: "var(--color-primary-600)", fontWeight: "500" }}>
            {t("pos.credit_authorized") || "Crédit autorisé pour ce client."}
          </p>
        )}
      </div>

      {/* Payment Section */}
      <div className="card" style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "16px", background: "var(--bg-base)", overflowY: "auto" }}>
        <h3 style={{ fontSize: "15px", fontWeight: "600" }}>{t("pos.payment_method_title") || "Mode de paiement"}</h3>
        
        {/* Payment Methods Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button 
            onClick={() => setCurrentMethod("cash")} 
            style={{ padding: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", borderRadius: "8px", border: `2px solid ${currentMethod === "cash" ? "#10b981" : "var(--border-color)"}`, background: currentMethod === "cash" ? "rgba(16, 185, 129, 0.05)" : "transparent", cursor: "pointer", transition: "all 0.2s" }}
          >
            <Banknote size={24} color={currentMethod === "cash" ? "#10b981" : "var(--text-secondary)"} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: currentMethod === "cash" ? "#10b981" : "var(--text-primary)" }}>{t("pos.payment_cash") || "Espèces"}</span>
          </button>
          <button 
            onClick={() => setCurrentMethod("om")} 
            style={{ padding: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", borderRadius: "8px", border: `2px solid ${currentMethod === "om" ? "#f97316" : "var(--border-color)"}`, background: currentMethod === "om" ? "rgba(249, 115, 22, 0.05)" : "transparent", cursor: "pointer", transition: "all 0.2s" }}
          >
            <Smartphone size={24} color={currentMethod === "om" ? "#f97316" : "var(--text-secondary)"} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: currentMethod === "om" ? "#f97316" : "var(--text-primary)" }}>{t("pos.payment_om") || "Orange Money"}</span>
          </button>
          <button 
            onClick={() => setCurrentMethod("momo")} 
            style={{ padding: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", borderRadius: "8px", border: `2px solid ${currentMethod === "momo" ? "#eab308" : "var(--border-color)"}`, background: currentMethod === "momo" ? "rgba(234, 179, 8, 0.05)" : "transparent", cursor: "pointer", transition: "all 0.2s" }}
          >
            <Smartphone size={24} color={currentMethod === "momo" ? "#eab308" : "var(--text-secondary)"} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: currentMethod === "momo" ? "#eab308" : "var(--text-primary)" }}>{t("pos.payment_momo") || "MTN MoMo"}</span>
          </button>
        </div>

        {(currentMethod === "om" || currentMethod === "momo") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            <label style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {t("pos.transaction_ref") || "Numéro de transaction"} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input 
              type="text" 
              className="input" 
              style={{ fontSize: "14px", padding: "10px" }} 
              value={transactionRef} 
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="Ex: MP250608.1402..."
              required
            />
          </div>
        )}

        {/* Input Amount */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{t("pos.amount_received") || "Montant reçu (FCFA)"}</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input 
              type="number" 
              className="input" 
              style={{ flex: 1, fontSize: "18px", fontWeight: "600", padding: "12px" }} 
              value={amountInput} 
              onChange={(e) => setAmountInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleValidate();
              }}
              placeholder={`${remaining}`}
            />
            {amountInput && parseFloat(amountInput) < remaining && (
              <button onClick={handleAddPayment} className="btn btn-secondary">Ajouter</button>
            )}
          </div>
        </div>

        {/* Payments List (if mixed) */}
        {cart.payments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Paiements enregistrés :</p>
            {cart.payments.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-muted)", padding: "8px", borderRadius: "6px" }}>
                <span style={{ fontSize: "13px", textTransform: "capitalize" }}>{p.method.replace('_', ' ')}</span>
                <span style={{ fontSize: "13px", fontWeight: "600" }} className="currency-display">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Change Display */}
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", background: change > 0 ? "rgba(16, 185, 129, 0.1)" : "var(--bg-muted)", padding: "16px", borderRadius: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: change > 0 ? "#10b981" : "var(--text-secondary)" }}>{t("pos.change_due") || "Monnaie à rendre"}</span>
          <span style={{ fontSize: "20px", fontWeight: "800", color: change > 0 ? "#10b981" : "var(--text-primary)" }} className="currency-display">
            {formatCurrency(change)}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button 
            className="btn btn-primary btn-lg" 
            onClick={handleValidate} 
            disabled={isSubmitting || cart.items.length === 0}
            style={{ width: "100%", fontSize: "16px", display: "flex", gap: "8px" }}
          >
            <CheckCircle size={20} />
            {isSubmitting ? "Validation..." : (t("pos.checkout_btn") || "Encaisser le paiement")}
          </button>
          
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-secondary" style={{ flex: 1, display: "flex", gap: "6px" }} onClick={() => setShowCancelConfirm(true)}>
              {t("common.cancel")}
            </button>
          </div>
        </div>

      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div className="card" style={{ padding: "24px", maxWidth: "400px", width: "100%", background: "var(--bg-base)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Annuler la vente</h3>
            <p style={{ marginBottom: "24px", color: "var(--text-secondary)" }}>Êtes-vous sûr de vouloir vider le panier et annuler cette vente ?</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowCancelConfirm(false)}>Annuler</button>
              <button className="btn btn-primary" style={{ background: "#ef4444" }} onClick={() => { cart.clear(); setShowCancelConfirm(false); }}>Valider</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

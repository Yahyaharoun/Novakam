"use client";

import { useState } from "react";
import { useDebts } from "@/lib/hooks/use-debts";
import { useCustomers } from "@/lib/hooks/use-customers";
import { formatCurrency } from "@/lib/utils/currency";
import { CreditCard, Banknote, Smartphone, HandCoins, AlertCircle } from "lucide-react";
import type { PaymentMethod } from "@/lib/supabase/database.types";
import toast from "react-hot-toast";

import { useI18nStore } from "@/lib/store/i18n.store";

export default function DebtsPage() {
  const { t } = useI18nStore();
  const { debts, isLoading, repayDebt, createDebt, deleteDebt } = useDebts();
  
  const [suppliers, setSuppliers] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("novakam-mock-suppliers");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  
  const [selectedCredit, setSelectedCredit] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDebt, setNewDebt] = useState({ supplier_id: "", amount: 0 });
  const [debtToDelete, setDebtToDelete] = useState<string | null>(null);

  const totalUnpaid = debts.reduce((sum, d) => sum + d.remaining_amount, 0);

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredit) return;
    
    const amt = parseFloat(repayAmount);
    const debt = debts.find(d => d.id === selectedCredit);
    
    if (isNaN(amt) || amt <= 0) return toast.error(t("common.error"));
    if (debt && amt > debt.remaining_amount) return toast.error(t("common.error"));

    setIsSubmitting(true);
    try {
      await repayDebt({
        debt_id: selectedCredit,
        amount: amt,
        payment_method: paymentMethod
      });
      toast.success(t("common.success"));
      setSelectedCredit(null);
      setRepayAmount("");
    } catch (e) {
      toast.error(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSupplierName = (id: string) => {
    const s = suppliers.find(sup => sup.id === id);
    return s ? s.name : "Unknown Supplier";
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebt.supplier_id || newDebt.amount <= 0) return;
    try {
      await createDebt({ supplier_id: newDebt.supplier_id, amount: newDebt.amount });
      setShowAddForm(false);
      setNewDebt({ supplier_id: "", amount: 0 });
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteDebt = async () => {
    if (!debtToDelete) return;
    try {
      await deleteDebt(debtToDelete);
      setDebtToDelete(null);
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  return (
    <div className="page-enter" style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
            {t("debts.title")}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            {t("debts.total_unpaid")} <span style={{ fontWeight: "700", color: "#ef4444" }}>{formatCurrency(totalUnpaid)}</span>
          </p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
          Nouvelle Dette
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        
        {/* Liste des crédits */}
        <div className="card" style={{ flex: 2, padding: 0, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: "24px" }} className="animate-pulse">
              <div style={{ height: "40px", background: "var(--border-color)", borderRadius: "8px", marginBottom: "16px" }} />
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                  <div style={{ height: "24px", width: "15%", background: "var(--border-color)", borderRadius: "4px" }} />
                  <div style={{ height: "24px", width: "35%", background: "var(--border-color)", borderRadius: "4px" }} />
                  <div style={{ height: "24px", width: "25%", background: "var(--border-color)", borderRadius: "4px" }} />
                  <div style={{ height: "24px", width: "25%", background: "var(--border-color)", borderRadius: "4px" }} />
                </div>
              ))}
            </div>
          ) : debts.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              <HandCoins size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
              <p>{t("debts.no_debts")}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("common.date")}</th>
                  <th>{t("debts.table_supplier")}</th>
                  <th style={{ textAlign: "right" }}>{t("debts.table_original")}</th>
                  <th style={{ textAlign: "right" }}>{t("debts.table_remaining")}</th>
                  <th style={{ textAlign: "center" }}>Statut</th>
                  <th style={{ textAlign: "center" }}>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((debt) => (
                  <tr key={debt.id} style={{ background: selectedCredit === debt.id ? "var(--bg-muted)" : "transparent" }}>
                    <td style={{ fontSize: "13px" }}>{new Date(debt.created_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: "600", fontSize: "14px" }}>{getSupplierName(debt.supplier_id)}</td>
                    <td style={{ textAlign: "right", color: "var(--text-secondary)" }} className="currency-display">
                      {formatCurrency(debt.amount)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "700", color: "#ef4444" }} className="currency-display">
                      {formatCurrency(debt.remaining_amount)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {debt.status === "paid" ? (
                        <span style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                          Payé
                        </span>
                      ) : (
                        <span style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                          Actif
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div className="flex items-center gap-2 justify-center">
                        {debt.status !== "paid" && (
                          <button 
                            onClick={() => setSelectedCredit(debt.id)}
                            className={`btn btn-sm ${selectedCredit === debt.id ? "btn-primary" : "btn-secondary"}`}
                          >
                            {t("debts.action_pay")}
                          </button>
                        )}
                        <button onClick={() => setDebtToDelete(debt.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Supprimer">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 hover:text-red-500"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Panneau de remboursement */}
        {selectedCredit && (
          <div className="card" style={{ flex: 1, padding: "20px", borderTop: "4px solid var(--color-primary-500)", position: "sticky", top: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>{t("debts.payment_panel_title")}</h2>
            
            {(() => {
              const d = debts.find(db => db.id === selectedCredit);
              if (!d) return null;
              
              return (
                <form onSubmit={handleRepay} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  
                  <div style={{ background: "rgba(239, 68, 68, 0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>{t("debts.table_remaining")}</p>
                    <p style={{ fontSize: "20px", fontWeight: "800", color: "#ef4444" }} className="currency-display">
                      {formatCurrency(d.remaining_amount)}
                    </p>
                  </div>

                  <div>
                    <label style={labelStyle}>{t("debts.amount_paid")}</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input 
                        required type="number" min="1" max={d.remaining_amount} className="input" style={{ flex: 1 }}
                        value={repayAmount} onChange={e => setRepayAmount(e.target.value)}
                        placeholder="Ex: 5000"
                      />
                      <button type="button" onClick={() => setRepayAmount(d.remaining_amount.toString())} className="btn btn-secondary">Max</button>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>{t("debts.payment_method")}</label>
                    <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                    {paymentMethod === "cash" && (
                      <p style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#10b981", marginTop: "6px" }}>
                        <AlertCircle size={12} /> {t("debts.cash_impact")}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                    <button type="button" onClick={() => setSelectedCredit(null)} className="btn btn-secondary" style={{ flex: 1 }}>{t("common.cancel")}</button>
                    <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 2 }}>
                      {isSubmitting ? t("common.loading") : t("common.save")}
                    </button>
                  </div>

                </form>
              );
            })()}
          </div>
        )}

      </div>

      {/* Add Debt Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nouvelle Dette Fournisseur</h2>
              <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <form onSubmit={handleAddDebt}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Fournisseur *</label>
                  <select required className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newDebt.supplier_id} onChange={e => setNewDebt(p => ({ ...p, supplier_id: e.target.value }))}>
                    <option value="">Sélectionner un fournisseur</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Montant de la dette (FCFA) *</label>
                  <input
                    required type="number" min="1"
                    value={newDebt.amount || ""}
                    onChange={e => setNewDebt(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {debtToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t("debts.delete_confirm_title")}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{t("debts.delete_confirm_desc")}</p>
            <div className="flex gap-3">
              <button onClick={() => setDebtToDelete(null)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
                {t("common.cancel")}
              </button>
              <button onClick={handleDeleteDebt} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "var(--text-secondary)",
  marginBottom: "5px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

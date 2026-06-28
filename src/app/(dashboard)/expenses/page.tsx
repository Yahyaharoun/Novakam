"use client";
import { PlanFeatureGuard } from "@/lib/rbac/guard";

import { useState } from "react";
import { Plus, Receipt, Banknote, CreditCard, Smartphone } from "lucide-react";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { formatCurrency } from "@/lib/utils/currency";
import type { ExpenseCategory, PaymentMethod } from "@/lib/supabase/database.types";
import toast from "react-hot-toast";
import { useI18nStore } from "@/lib/store/i18n.store";

const getCategoryLabel = (t: any, value: ExpenseCategory): string => {
  switch (value) {
    case "rent": return t("expenses.cat_rent");
    case "salary": return t("expenses.cat_salary");
    case "utilities": return t("expenses.cat_utilities");
    case "transport": return t("expenses.cat_transport");
    case "supplies": return t("expenses.cat_supplies");
    case "other": return t("expenses.cat_other");
    default: return value;
  }
};

export default function ExpensesPage() {
  const { t } = useI18nStore();
  const { expenses, isLoading, addExpense } = useExpenses();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category: "other" as ExpenseCategory,
    payment_method: "cash" as PaymentMethod,
    beneficiary: "",
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) return toast.error(t("common.error"));
    if (!formData.description.trim()) return toast.error(t("common.error"));

    setIsSubmitting(true);
    try {
      await addExpense({
        amount: amt,
        description: formData.description.trim(),
        category: formData.category,
        payment_method: formData.payment_method,
        beneficiary: formData.beneficiary.trim() || undefined,
      });
      toast.success(t("common.success"));
      setIsFormOpen(false);
      setFormData({ amount: "", description: "", category: "other", payment_method: "cash", beneficiary: "" });
    } catch (err) {
      toast.error(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "cash": return <Banknote size={14} />;
      case "mobile_money": return <Smartphone size={14} />;
      case "card": return <CreditCard size={14} />;
      default: return <Receipt size={14} />;
    }
  };

  return (
    <PlanFeatureGuard feature="has_credits">
    <div className="page-enter" style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
            {t("expenses.title")}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            {t("expenses.total")} <span style={{ fontWeight: "700" }}>{formatCurrency(totalExpenses)}</span>
          </p>
        </div>
        <button onClick={() => setIsFormOpen(!isFormOpen)} className="btn btn-primary">
          <Plus size={16} /> {t("expenses.new")}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="card" style={{ padding: "20px", marginBottom: "24px", borderTop: "4px solid var(--color-primary-500)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>{t("expenses.form_title")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>{t("expenses.desc")}</label>
              <input 
                required type="text" className="input" placeholder={t("expenses.desc_placeholder")}
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div>
              <label style={labelStyle}>{t("expenses.amount")}</label>
              <input 
                required type="number" min="0" className="input" placeholder="0"
                value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>

            <div>
              <label style={labelStyle}>{t("expenses.category")}</label>
              <select className="input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as ExpenseCategory})}>
                {(["rent", "salary", "utilities", "transport", "supplies", "other"] as ExpenseCategory[]).map(c => (
                  <option key={c} value={c}>{getCategoryLabel(t, c)}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t("expenses.payment_method")}</label>
              <select className="input" value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value as PaymentMethod})}>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
              {formData.payment_method === "cash" && (
                <p style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>
                  {t("expenses.cash_impact")}
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>{t("expenses.beneficiary")}</label>
              <input 
                type="text" className="input" placeholder={t("expenses.beneficiary_placeholder")}
                value={formData.beneficiary} onChange={e => setFormData({...formData, beneficiary: e.target.value})}
              />
            </div>

          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary">{t("common.cancel")}</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? t("common.loading") : t("expenses.submit")}
            </button>
          </div>
        </form>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
        ) : expenses.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <Receipt size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <p>{t("expenses.no_expenses")}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("expenses.table_date")}</th>
                <th>{t("expenses.table_desc")}</th>
                <th>{t("expenses.table_category")}</th>
                <th>{t("expenses.table_payment")}</th>
                <th style={{ textAlign: "right" }}>{t("expenses.table_amount")}</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ fontSize: "13px" }}>{new Date(exp.spent_at).toLocaleDateString()}</td>
                  <td>
                    <p style={{ fontWeight: "500", fontSize: "14px" }}>{exp.description}</p>
                    {exp.beneficiary && <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{exp.beneficiary}</p>}
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", padding: "4px 8px", background: "var(--bg-muted)", borderRadius: "10px" }}>
                      {getCategoryLabel(t, exp.category)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)", textTransform: "capitalize" }}>
                      {getMethodIcon(exp.payment_method)}
                      {exp.payment_method.replace('_', ' ')}
                    </div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "600", color: "#ef4444" }} className="currency-display">
                    - {formatCurrency(exp.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </PlanFeatureGuard>
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

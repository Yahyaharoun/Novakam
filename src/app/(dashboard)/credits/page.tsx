"use client";
import { useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  Users,
  DollarSign,
} from "lucide-react";
import { useI18nStore } from "@/lib/store/i18n.store";

const getStatusConfig = (t: any) => ({
  active: { label: t("credits.status_active"), color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: Clock },
  overdue: { label: t("credits.status_overdue"), color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: AlertTriangle },
  paid: { label: t("credits.status_paid"), color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: CheckCircle },
});
import { useCredits } from "@/lib/hooks/use-credits";

export default function CreditsPage() {
  const { t } = useI18nStore();
  const [search, setSearch] = useState("");
  const STATUS_CONFIG = getStatusConfig(t);
  const { credits, createCredit, deleteCredit, markAsPaid } = useCredits();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCredit, setNewCredit] = useState({ customer: '', phone: '', amount: 0, due_date: '' });
  const [creditToDelete, setCreditToDelete] = useState<string | null>(null);
  const [paymentToRecord, setPaymentToRecord] = useState<string | null>(null);

  const filtered = credits.filter(
    (c) =>
      c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.customerPhone?.includes(search)
  );

  const totalCredit = credits.filter((c) => c.status !== "paid").reduce(
    (s, c) => s + c.remaining_amount,
    0
  );
  const overdueCount = credits.filter((c) => c.status === "overdue").length;
  const recoveredThisMonth = 55000; // mock

  const handleDelete = async () => {
    if (!creditToDelete) return;
    await deleteCredit(creditToDelete);
    setCreditToDelete(null);
  };

  const handleSave = async () => {
    if (!newCredit.customer || newCredit.amount <= 0) return;

    if (!editingId) {
       await createCredit({
         customerName: newCredit.customer,
         phone: newCredit.phone,
         amount: newCredit.amount,
         dueDate: newCredit.due_date || new Date().toISOString().split('T')[0]
       });
    }

    setNewCredit({ customer: '', phone: '', amount: 0, due_date: '' });
    setEditingId(null);
    setShowModal(false);
  };

  const handleEditClick = (credit: any) => {
    setEditingId(credit.id);
    setNewCredit({ customer: credit.customerName, phone: credit.customerPhone || '', amount: credit.original_amount, due_date: credit.due_date || '' });
    setShowModal(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentToRecord) return;
    await markAsPaid(paymentToRecord);
    setPaymentToRecord(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("credits.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("credits.subtitle")}
          </p>
        </div>
        <button onClick={() => { setEditingId(null); setNewCredit({ customer: '', phone: '', amount: 0, due_date: '' }); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
          <Plus size={16} />
          {t("credits.new_credit")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t("credits.total_active")}
            </p>
            <CreditCard size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {totalCredit.toLocaleString()} FCFA
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t("credits.debtors")}
            </p>
            <Users size={18} className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {overdueCount}{" "}
            <span className="text-sm font-normal text-red-500">{t("credits.overdue_label")}</span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t("credits.recovered_month")}
            </p>
            <TrendingDown size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {recoveredThisMonth.toLocaleString()} FCFA
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder={t("credits.search_placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("credits.table_customer")}
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("credits.table_original")}
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("credits.table_remaining")}
              </th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("credits.table_due")}
              </th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("credits.table_status")}
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((credit) => {
              const cfg = STATUS_CONFIG[credit.status as keyof typeof STATUS_CONFIG];
              const StatusIcon = cfg.icon;
              return (
                <tr
                  key={credit.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-semibold">
                          {credit.customerName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {credit.customerName}
                        </p>
                        {credit.customerPhone && (
                          <p className="text-xs text-slate-500">{credit.customerPhone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-300">
                    {credit.original_amount.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`text-sm font-bold ${
                        credit.remaining_amount === 0
                          ? "text-green-600"
                          : credit.status === "overdue"
                          ? "text-red-600"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {credit.remaining_amount.toLocaleString()} FCFA
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-400">
                    {credit.due_date ? new Date(credit.due_date).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      <StatusIcon size={11} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {credit.status !== "paid" && (
                        <button onClick={() => setPaymentToRecord(credit.id)} className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                          Valider
                        </button>
                      )}
                      <button onClick={() => handleEditClick(credit)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Modifier">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      </button>
                      <button onClick={() => setCreditToDelete(credit.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Supprimer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 hover:text-red-500"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <CreditCard size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">{t("credits.no_credit")}</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? 'Modifier Crédit' : t('credits.new_credit')}</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); setNewCredit({ customer: '', phone: '', amount: 0, due_date: '' }); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Client *</label>
                <input
                  type="text"
                  value={newCredit.customer}
                  onChange={e => setNewCredit(p => ({ ...p, customer: e.target.value }))}
                  placeholder="Nom du client"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={newCredit.phone}
                  onChange={e => setNewCredit(p => ({ ...p, phone: e.target.value }))}
                  placeholder="Ex: 6 99 99 99 99"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Montant (FCFA) *</label>
                  <input
                    type="number"
                    value={newCredit.amount}
                    onChange={e => setNewCredit(p => ({ ...p, amount: Number(e.target.value) }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date d'échéance</label>
                  <input
                    type="date"
                    value={newCredit.due_date}
                    onChange={e => setNewCredit(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => { setShowModal(false); setEditingId(null); setNewCredit({ customer: '', phone: '', amount: 0, due_date: '' }); }} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                {editingId ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {creditToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Supprimer ce crédit ?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Cette action est irréversible. Les données de crédit seront perdues.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCreditToDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Confirmation Modal */}
      {paymentToRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Valider ce paiement ?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Confirmez-vous que ce client a réglé l'intégralité de sa dette ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentToRecord(null)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleRecordPayment}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

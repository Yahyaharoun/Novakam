'use client';

import { useState } from 'react';
import { Truck, Plus, Search, Trash2, Edit, X, Building2 } from 'lucide-react';
import { useI18nStore } from '@/lib/store/i18n.store';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useSuppliers, type SupplierWithStats } from '@/lib/hooks/use-suppliers';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const { t } = useI18nStore();
  const [search, setSearch] = useState('');
  
  const { suppliers, isLoading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers(search);

  const [showModal, setShowModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', address: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteSupplier(supplierToDelete);
      toast.success(t("common.delete_success") || "Fournisseur supprimé");
    } catch (e) {
      toast.error(t("common.error") || "Erreur");
    }
    setSupplierToDelete(null);
  };

  const handleSave = async () => {
    if (!newSupplier.name) return;
    
    try {
      if (editingId) {
        await updateSupplier(editingId, newSupplier);
        toast.success(t("common.update_success") || "Fournisseur mis à jour");
      } else {
        await createSupplier(newSupplier);
        toast.success(t("common.save_success") || "Fournisseur ajouté");
      }
    } catch (error) {
      toast.error(t("common.error") || "Erreur");
    }
    
    setNewSupplier({ name: '', email: '', phone: '', address: '' });
    setEditingId(null);
    setShowModal(false);
  };

  const handleEditClick = (s: SupplierWithStats) => {
    setNewSupplier({ name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '' });
    setEditingId(s.id);
    setShowModal(true);
  };

  const totalDebt = suppliers.reduce((sum, s) => sum + s.remaining_debt, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("suppliers.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("suppliers.subtitle").replace("{count}", suppliers.length.toString())}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          {t("suppliers.new")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("suppliers.total")}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{suppliers.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("suppliers.active")}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{suppliers.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("suppliers.debts")}</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{totalDebt.toLocaleString()} FCFA</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t("suppliers.search")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement...</div>
          ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_supplier")}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_phone")}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_orders")}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_debt")}</th>
                <th className="px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {suppliers.map(supplier => (
                <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Building2 size={16} className="text-slate-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{supplier.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{supplier.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{supplier.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900 dark:text-white">
                    {supplier.total_purchases.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">
                    {supplier.remaining_debt > 0 ? (
                      <span className="text-red-500">{supplier.remaining_debt.toLocaleString()} FCFA</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">0 FCFA</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleEditClick(supplier)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" 
                        title="Modifier"
                      >
                        <Edit size={14} className="text-slate-500" />
                      </button>
                      <button
                        onClick={() => setSupplierToDelete(supplier.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} className="text-slate-400 hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          {!isLoading && suppliers.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Truck size={28} className="text-slate-400" />
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg">{t("suppliers.no_supplier")}</p>
              <p className="text-slate-400 text-sm mt-1">
                {search ? t("suppliers.try_search") : t("suppliers.first_supplier")}
              </p>
              {!search && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={14} />
                  {t("suppliers.new")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? 'Modifier le fournisseur' : t("suppliers.new")}</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); setNewSupplier({ name: '', email: '', phone: '', address: '' }); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("suppliers.modal_company")} *</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Distribex Cameroun"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={e => setNewSupplier(p => ({ ...p, email: e.target.value }))}
                  placeholder="Ex: contact@distribex.com"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("suppliers.modal_phone")}</label>
                <input
                  type="tel"
                  value={newSupplier.phone}
                  onChange={e => setNewSupplier(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setEditingId(null); setNewSupplier({ name: '', email: '', phone: '', address: '' }); }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t("suppliers.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={!newSupplier.name}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {editingId ? 'Mettre à jour' : t("suppliers.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!supplierToDelete}
        title="Supprimer le fournisseur"
        message="Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action n'effacera pas ses factures précédentes mais l'empêchera d'apparaître dans les futures opérations."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setSupplierToDelete(null)}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Users, Plus, Search, Trash2, Edit, X } from 'lucide-react';
import { useI18nStore } from '@/lib/store/i18n.store';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useCustomers } from '@/lib/hooks/use-customers';
import type { LocalCustomer } from '@/lib/db/schema';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400',
];

export default function CustomersPage() {
  const { t } = useI18nStore();
  const [search, setSearch] = useState('');
  
  const { customers, isLoading, createCustomer, updateCustomer } = useCustomers(search);
  
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      await updateCustomer(customerToDelete, { is_active: false });
      toast.success(t("customers.delete_success") || "Client supprimé");
    } catch (err) {
      toast.error(t("common.error") || "Erreur");
    }
    setCustomerToDelete(null);
  };

  const handleSave = async () => {
    if (!newCustomer.name) return;
    
    try {
      if (editingId) {
        await updateCustomer(editingId, newCustomer);
        toast.success(t("common.update_success") || "Client mis à jour");
      } else {
        await createCustomer(newCustomer);
        toast.success(t("customers.save_success") || "Client ajouté");
      }
    } catch (error) {
      toast.error(t("common.error") || "Une erreur est survenue");
    }
    
    setNewCustomer({ name: '', phone: '', email: '', address: '' });
    setEditingId(null);
    setShowModal(false);
  };

  const handleEditClick = (c: LocalCustomer) => {
    setNewCustomer({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' });
    setEditingId(c.id);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("customers.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("customers.subtitle").replace("{count}", customers.length.toString())}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          {t("customers.new")}
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("customers.total")}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{customers.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("customers.active")}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{customers.filter(c => c.status === 'active').length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("customers.credits")}</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {customers.filter(c => c.current_debt > 0).length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t("customers.search")}
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("customers.table_customer")}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("customers.table_phone")}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("customers.table_total")}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("customers.table_debt")}</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("customers.table_status")}</th>
                <th className="px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {customers.map((customer, idx) => (
                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                        {customer.name[0]}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white text-sm">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{customer.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900 dark:text-white">
                    {customer.total_purchases.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">
                    {customer.current_debt > 0 ? (
                      <span className="text-red-500">{customer.current_debt.toLocaleString()} FCFA</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">0 FCFA</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {customer.status === 'active' ? t("customers.active_status") : t("customers.inactive_status")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleEditClick(customer)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" 
                        title="Modifier"
                      >
                        <Edit size={14} className="text-slate-500" />
                      </button>
                      <button
                        onClick={() => setCustomerToDelete(customer.id)}
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
          {/* Empty state */}
          {!isLoading && customers.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-slate-400" />
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg">{t("customers.no_customer")}</p>
              <p className="text-slate-400 text-sm mt-1">
                {search ? t("customers.try_search") : t("customers.first_customer")}
              </p>
              {!search && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={14} />
                  {t("customers.new")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Ajout */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? 'Modifier le client' : t("customers.new")}</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); setNewCustomer({ name: '', phone: '', email: '', address: '' }); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("customers.modal_name")} *</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Mama Adjoua"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("customers.modal_phone")}</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setEditingId(null); setNewCustomer({ name: '', phone: '', email: '', address: '' }); }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t("customers.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={!newCustomer.name}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {editingId ? 'Mettre à jour' : t("customers.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!customerToDelete}
        title="Supprimer le client"
        message="Êtes-vous sûr de vouloir supprimer ce client définitivement ? Son historique restera dans les archives, mais il sera retiré de la liste."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}

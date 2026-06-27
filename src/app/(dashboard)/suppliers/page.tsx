'use client';

import { useState } from 'react';
import { Truck, Plus, Search, Trash2, Edit, X, Building2 } from 'lucide-react';
import { useI18nStore } from '@/lib/store/i18n.store';
import { ConfirmModal } from '@/components/ui/confirm-modal';

const MOCK_SUPPLIERS = [
  {
    id: '1',
    name: 'Distribex Cameroun',
    contact: 'Pierre Atanga',
    phone: '+237 677 111 222',
    total_orders: 3200000,
    remaining_debt: 150000,
    status: 'active',
    category: 'Alimentation',
  },
  {
    id: '2',
    name: 'SOACAM Grossiste',
    contact: 'Isabelle Nkomo',
    phone: '+237 699 333 444',
    total_orders: 7500000,
    remaining_debt: 0,
    status: 'active',
    category: 'Boissons',
  },
  {
    id: '3',
    name: 'Afri-Commerce Sarl',
    contact: 'Moussa Konaté',
    phone: '+237 654 555 666',
    total_orders: 980000,
    remaining_debt: 75000,
    status: 'active',
    category: 'Hygiène',
  },
  {
    id: '4',
    name: 'Douala Market Import',
    contact: 'Chantal Essono',
    phone: '+237 677 777 888',
    total_orders: 450000,
    remaining_debt: 0,
    status: 'inactive',
    category: 'Électroménager',
  },
];

type Supplier = typeof MOCK_SUPPLIERS[number];

const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  Boissons: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Hygiène: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  Électroménager: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
};

export default function SuppliersPage() {
  const { t } = useI18nStore();
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("novakam-mock-suppliers");
      if (saved) return JSON.parse(saved);
    }
    return MOCK_SUPPLIERS;
  });
  const [showModal, setShowModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', phone: '', category: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  const filtered = suppliers.filter(
    s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  const confirmDelete = () => {
    if (!supplierToDelete) return;
    const updated = suppliers.filter(s => s.id !== supplierToDelete);
    setSuppliers(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("novakam-mock-suppliers", JSON.stringify(updated));
    }
    setSupplierToDelete(null);
  };

  const handleSave = () => {
    if (!newSupplier.name || !newSupplier.phone) return;
    
    let updated;
    if (editingId) {
      updated = suppliers.map(s => 
        s.id === editingId ? { ...s, name: newSupplier.name, contact: newSupplier.contact, phone: newSupplier.phone, category: newSupplier.category || 'Autre' } : s
      );
    } else {
      const supplier: Supplier = {
        id: Date.now().toString(),
        name: newSupplier.name,
        contact: newSupplier.contact,
        phone: newSupplier.phone,
        total_orders: 0,
        remaining_debt: 0,
        status: 'active',
        category: newSupplier.category || 'Autre',
      };
      updated = [supplier, ...suppliers];
    }
    
    setSuppliers(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("novakam-mock-suppliers", JSON.stringify(updated));
    }
    setNewSupplier({ name: '', contact: '', phone: '', category: '' });
    setEditingId(null);
    setShowModal(false);
  };

  const handleEditClick = (s: Supplier) => {
    setNewSupplier({ name: s.name, contact: s.contact, phone: s.phone, category: s.category });
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
          <p className="text-2xl font-bold text-green-600 mt-1">{suppliers.filter(s => s.status === 'active').length}</p>
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_supplier")}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_contact")}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_phone")}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_orders")}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_debt")}</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("suppliers.table_status")}</th>
                <th className="px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(supplier => (
                <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Building2 size={16} className="text-slate-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{supplier.name}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[supplier.category] ?? 'bg-slate-100 text-slate-600'}`}>
                          {supplier.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{supplier.contact}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{supplier.phone}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900 dark:text-white">
                    {supplier.total_orders.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">
                    {supplier.remaining_debt > 0 ? (
                      <span className="text-red-500">{supplier.remaining_debt.toLocaleString()} FCFA</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">0 FCFA</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        supplier.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {supplier.status === 'active' ? t("customers.active_status") : t("customers.inactive_status")}
                    </span>
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

          {filtered.length === 0 && (
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
              <button onClick={() => { setShowModal(false); setEditingId(null); setNewSupplier({ name: '', contact: '', phone: '', category: '' }); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("suppliers.modal_company")}</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Distribex Cameroun"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("suppliers.modal_contact")}</label>
                <input
                  type="text"
                  value={newSupplier.contact}
                  onChange={e => setNewSupplier(p => ({ ...p, contact: e.target.value }))}
                  placeholder="Ex: Jean Dupont"
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
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("suppliers.modal_category")}</label>
                <select
                  value={newSupplier.category}
                  onChange={e => setNewSupplier(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">{t("suppliers.modal_select_cat")}</option>
                  <option>Alimentation</option>
                  <option>Boissons</option>
                  <option>Hygiène</option>
                  <option>Électroménager</option>
                  <option>Autre</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setEditingId(null); setNewSupplier({ name: '', contact: '', phone: '', category: '' }); }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t("suppliers.cancel")}
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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

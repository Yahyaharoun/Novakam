'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, Plus, Search, Trash2, Edit, X, Shield, BadgeCheck, User,
  PowerOff, Power, Loader2, Save, AlertCircle
} from 'lucide-react';
import { useI18nStore } from '@/lib/store/i18n.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { useRBAC } from '@/lib/rbac/hooks';
import { UpgradePrompt } from '@/lib/rbac/guard';
import { ROLE_LABELS } from '@/lib/rbac/permissions';
import { PLAN_LIMITS } from '@/lib/rbac/subscription-limits';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import type { Plan, UserRole, EmployeeStatus } from '@/lib/supabase/database.types';
import toast from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDB } from '@/lib/db/schema';
import { enqueueSync } from '@/lib/sync/engine';

type Role = UserRole;

const ROLE_STYLES: Record<Role, string> = {
  owner:       'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  manager:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  cashier:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  warehouse:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  accountant:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  support:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const ASSIGNABLE_ROLES: Role[] = ['manager', 'cashier', 'warehouse', 'accountant', 'support'];

interface Employee {
  id: string;
  name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  hired_date: string | null;
  status: EmployeeStatus;
  notes: string | null;
  pin: string | null;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getInitials(name: string) {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400',
];

export default function EmployeesPage() {
  const { t } = useI18nStore();
  const shop = useAuthStore((s) => s.currentShop);
  const { can, canCreate, plan } = useRBAC();
  const limits = PLAN_LIMITS[plan as Plan];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'cashier' as Role, hired_date: '', notes: '', pin: '',
  });

  const activeCount = (employees || []).filter((e) => e.status === 'active').length;
  const limitCheck = canCreate('max_employees', activeCount);

  const localEmployees = useLiveQuery(
    () => {
      if (!shop?.id) return [];
      return getDB().employees
        .where('shop_id').equals(shop.id)
        .filter(e => e.status !== 'suspended' && e.status !== 'inactive') // or similar, depending on how you handle deleted. Let's return all.
        .toArray();
    },
    [shop?.id]
  );

  useEffect(() => {
    if (localEmployees) {
      // sort descending by created_at
      const sorted = [...localEmployees].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEmployees(sorted as any[]);
      setLoading(false);
    }
  }, [localEmployees]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', role: 'cashier', hired_date: '', notes: '', pin: '' });
    setShowModal(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      name: emp.name,
      email: emp.email ?? '',
      phone: emp.phone ?? '',
      role: emp.role,
      hired_date: emp.hired_date ?? '',
      notes: emp.notes ?? '',
      pin: emp.pin ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!shop?.id || !form.name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    if (!form.pin || form.pin.length < 4 || form.pin.length > 6) {
      toast.error('Le code PIN doit contenir entre 4 et 6 chiffres');
      return;
    }
    if (!editing && !limitCheck.allowed) {
      toast.error('Limite atteinte. Veuillez upgrader votre abonnement.');
      return;
    }
    setSaving(true);
    const db = getDB();
    const now = new Date().toISOString();
    const payload = {
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      role: form.role,
      hired_date: form.hired_date || null,
      notes: form.notes || null,
      pin: form.pin || null,
    };

    try {
      if (editing) {
        if (shop.id.startsWith('mock-')) {
          const updated = employees.map((e) => (e.id === editing.id ? { ...e, ...payload, updated_at: now } : e));
          localStorage.setItem("novakam-mock-employees", JSON.stringify(updated));
          setEmployees(updated);
        } else {
          const updatedRecord = { ...editing, ...payload, updated_at: now };
          await db.employees.put(updatedRecord as any);
          await enqueueSync("employees", editing.id, "update", updatedRecord);
        }
        toast.success('Employé mis à jour !');
      } else {
        if (shop.id.startsWith('mock-')) {
          const newEmp = { id: `mock-emp-${Date.now()}`, ...payload, shop_id: shop.id, status: 'active', created_at: now, updated_at: now };
          const current = [newEmp, ...employees];
          localStorage.setItem("novakam-mock-employees", JSON.stringify(current));
          setEmployees(current as any[]);
        } else {
          const newEmpId = crypto.randomUUID();
          const newEmp = { id: newEmpId, ...payload, shop_id: shop.id, status: 'active', sync_status: 'pending', created_at: now, updated_at: now };
          await db.employees.put(newEmp as any);
          await enqueueSync("employees", newEmpId, "create", newEmp);
        }
        toast.success('Employé ajouté !');
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(emp: Employee) {
    if (!can("manage:employees")) return;
    const newStatus: EmployeeStatus = emp.status === 'active' ? 'suspended' : 'active';
    
    if (newStatus === 'active' && !limitCheck.allowed) {
      toast.error('Limite atteinte. Veuillez upgrader votre abonnement.');
      return;
    }

    try {
      if (shop!.id.startsWith('mock-')) {
        const updated = employees.map((e) => (e.id === emp.id ? { ...e, status: newStatus } : e));
        localStorage.setItem("novakam-mock-employees", JSON.stringify(updated));
        setEmployees(updated);
      } else {
        const db = getDB();
        const updatedRecord = { ...emp, status: newStatus, updated_at: new Date().toISOString() };
        await db.employees.put(updatedRecord as any);
        await enqueueSync("employees", emp.id, "update", updatedRecord);
      }
      toast.success(newStatus === 'active' ? 'Employé réactivé' : 'Employé suspendu');
    } catch {
      toast.error('Erreur lors du changement de statut');
    }
  }

  async function handleDelete() {
    if (!confirmDelete || !shop?.id) return;
    try {
      if (shop.id.startsWith('mock-')) {
        const filtered = employees.filter((e) => e.id !== confirmDelete.id);
        localStorage.setItem("novakam-mock-employees", JSON.stringify(filtered));
        setEmployees(filtered);
      } else {
        const db = getDB();
        const deletedRecord = { ...confirmDelete, status: 'inactive', updated_at: new Date().toISOString() };
        await db.employees.put(deletedRecord as any);
        await enqueueSync("employees", confirmDelete.id, "update", { ...deletedRecord, is_deleted: true });
      }
      toast.success('Employé supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setConfirmDelete(null);
    }
  }

  const filtered = employees.filter(
    (e) =>
      (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.phone || '').includes(search)
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck size={22} className="text-blue-600" />
            {t('employees.title') || 'Employés'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeCount} / {limits.max_employees === -1 ? '∞' : limits.max_employees} employés actifs
          </p>
        </div>
        {can('manage:employees') && (
          limitCheck.allowed ? (
            <button
              id="add-employee-btn"
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all"
            >
              <Plus size={16} /> Ajouter un employé
            </button>
          ) : (
            <div className="max-w-xs">
              <UpgradePrompt resource="employés" compact />
            </div>
          )
        )}
      </div>

      {/* Alerte limite proche */}
      {limitCheck.limit !== -1 && activeCount >= limitCheck.limit * 0.8 && activeCount < limitCheck.limit && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle size={16} className="flex-shrink-0" />
          Vous approchez de votre limite d'employés ({activeCount}/{limitCheck.limit}). Pensez à upgrader votre plan.
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="search-employees"
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Rechercher un employé..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun employé trouvé</p>
          {can('manage:employees') && <p className="text-sm mt-1">Ajoutez votre premier employé.</p>}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((emp, i) => (
            <div
              key={emp.id}
              className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl hover:shadow-sm transition-all ${emp.status !== 'active' ? 'opacity-60' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                {getInitials(emp.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{emp.name || 'Sans nom'}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_STYLES[emp.role] || 'bg-slate-100 text-slate-700'}`}>
                    {emp.role === 'owner' || emp.role === 'manager' ? <Shield size={10} /> : <User size={10} />}
                    {ROLE_LABELS[emp.role]?.fr || emp.role || 'Inconnu'}
                  </span>
                  {emp.status !== 'active' && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {emp.status === 'suspended' ? 'Suspendu' : 'Inactif'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  {emp.phone && <span>{emp.phone}</span>}
                  {emp.email && <span className="hidden sm:inline">{emp.email}</span>}
                  {emp.hired_date && <span>Depuis {formatDate(emp.hired_date)}</span>}
                </div>
              </div>

              {/* Actions */}
              {can('manage:employees') && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleStatus(emp)}
                    className={`p-2 rounded-lg transition-colors ${emp.status === 'active' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                    title={emp.status === 'active' ? 'Suspendre' : 'Activer'}
                  >
                    {emp.status === 'active' ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>
                  <button
                    onClick={() => openEdit(emp)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(emp)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Ajout/Modification */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {editing ? 'Modifier l\'employé' : 'Ajouter un employé'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Nom */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nom complet *</label>
                <input
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Prénom Nom"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Rôle *</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  disabled={!can('manage:employees') || plan === 'free'}
                >
                  {plan === 'free' ? (
                    <option value="cashier">{ROLE_LABELS['cashier'].fr}</option>
                  ) : (
                    ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r].fr}</option>
                    ))
                  )}
                </select>
                {plan === 'free' && <p className="text-[10px] text-amber-600 mt-1">Le plan FREE limite les rôles à "Caissier".</p>}
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Téléphone</label>
                <input
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+237 6XX XXX XXX"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="employé@email.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              {/* Date d'embauche */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date d'embauche</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.hired_date}
                  onChange={(e) => setForm((f) => ({ ...f, hired_date: e.target.value }))}
                />
              </div>

              {/* Code PIN */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Code PIN d'accès (4 à 6 chiffres) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  pattern="\d{4,6}"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
                  placeholder="••••"
                  value={form.pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm((f) => ({ ...f, pin: val }));
                  }}
                  disabled={!can('manage:employees')} // Seul l'admin peut modifier
                />
                <p className="text-[10px] text-slate-500 mt-1">L'employé utilisera ce code pour se connecter à la caisse.</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Notes optionnelles..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {editing ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <ConfirmModal
          isOpen={true}
          title="Supprimer l'employé"
          message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete.name}" ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          isDestructive={true}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

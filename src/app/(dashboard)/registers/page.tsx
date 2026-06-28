"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag, Plus, Search, Edit, Trash2, Power, PowerOff,
  Loader2, X, Save, AlertCircle, CheckCircle2, User
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useI18nStore } from "@/lib/store/i18n.store";
import { useRBAC } from "@/lib/rbac/hooks";
import { UpgradePrompt } from "@/lib/rbac/guard";
import { PLAN_LIMITS } from "@/lib/rbac/subscription-limits";
import type { Plan, RegisterStatus } from "@/lib/supabase/database.types";
import toast from "react-hot-toast";
import { useRegisters, type RegisterWithEmployee } from "@/lib/hooks/use-registers";
import type { LocalCashRegister } from "@/lib/db/schema";
import { useEmployees } from "@/lib/hooks/use-employees";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactive: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif", inactive: "Inactif", maintenance: "Maintenance",
};

export default function RegistersPage() {
  const { t } = useI18nStore();
  const shop = useAuthStore((s) => s.currentShop);
  const { role, can, canCreate, plan } = useRBAC();
  const limits = PLAN_LIMITS[plan as Plan];

  const [search, setSearch] = useState("");
  
  const { registers, isLoading: loading, createRegister, updateRegister, deleteRegister } = useRegisters(search);
  const { employees } = useEmployees();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LocalCashRegister | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", pin: "", location: "", notes: "", assigned_employee_id: "" });

  const activeCount = registers.filter((r) => r.status === "active").length;
  const limitCheck = canCreate("max_registers_per_shop", activeCount);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", pin: "", location: "", notes: "", assigned_employee_id: "" });
    setShowModal(true);
  }

  function openEdit(r: LocalCashRegister) {
    setEditing(r);
    setForm({ name: r.name, code: r.code, pin: "", location: r.location ?? "", notes: "", assigned_employee_id: r.assigned_employee_id ?? "" });
    setShowModal(true);
  }

  async function handleSave() {
    if (!shop?.id || !form.name.trim() || !form.code.trim()) {
      toast.error("Le nom et le code sont obligatoires");
      return;
    }
    
    if (!editing && !limitCheck.allowed) {
      toast.error("Limite atteinte. Veuillez upgrader votre abonnement.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        location: form.location || undefined,
        assigned_employee_id: form.assigned_employee_id || undefined,
      };

      if (editing) {
        await updateRegister(editing.id, payload);
        toast.success("Caisse mise à jour");
      } else {
        await createRegister(payload);
        toast.success("Caisse créée avec succès");
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors de la sauvegarde");
    } finally { 
      setSaving(false); 
    }
  }

  async function handleToggleStatus(r: LocalCashRegister) {
    if (!can("manage:registers")) return;
    const newStatus = r.status === "active" ? "inactive" : "active";
    
    if (newStatus === 'active') {
        const currentActive = registers.filter((reg) => reg.status === "active").length;
        const currentLimit = limits.max_registers_per_shop;
        if (currentLimit !== -1 && currentActive >= currentLimit) {
            toast.error("Vous devez désactiver une caisse avant d'en activer une autre.");
            return;
        }
    }

    try {
      await updateRegister(r.id, { status: newStatus });
      toast.success(`Caisse ${newStatus === "active" ? "activée" : "désactivée"}`);
    } catch {
      toast.error("Erreur");
    }
  }

  async function handleDelete(id: string) {
    if (!can("manage:registers")) return;
    if (!confirm("Supprimer cette caisse ?")) return;
    
    try {
      await deleteRegister(id);
      toast.success("Caisse supprimée");
    } catch {
      toast.error("Erreur");
    }
  }

  const activeEmployees = employees.filter(e => e.status === 'active');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={22} className="text-blue-600" /> Caisses
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeCount} / {limits.max_registers_per_shop === -1 ? "∞" : limits.max_registers_per_shop} caisses actives
          </p>
        </div>
        {can("manage:registers") && (
          limitCheck.allowed ? (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all"
            >
              <Plus size={16} /> Nouvelle caisse
            </button>
          ) : (
            <div className="max-w-xs">
              <UpgradePrompt resource="caisses" compact />
            </div>
          )
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Rechercher une caisse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
      ) : registers.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune caisse trouvée</p>
          {can("manage:registers") && <p className="text-sm mt-1">Cliquez sur "Nouvelle caisse" pour commencer</p>}
        </div>
      ) : (
        <div className="grid gap-3">
          {registers.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm flex-shrink-0">
                {r.code.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{r.name}</span>
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{r.code}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                </div>
                {r.employee && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <User size={11} /> {r.employee.name}
                  </div>
                )}
                {r.location && <div className="text-xs text-slate-400 mt-0.5">{r.location}</div>}
              </div>
              {can("manage:registers") && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggleStatus(r)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title={r.status === "active" ? "Désactiver" : "Activer"}>
                    {r.status === "active" ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>
                  <button onClick={() => openEdit(r)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    <Edit size={15} />
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">{editing ? "Modifier la caisse" : "Nouvelle caisse"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Nom de la caisse *", key: "name", placeholder: "Caisse principale" },
                { label: "Code *", key: "code", placeholder: "CAISSE-01" },
                { label: "Code PIN (optionnel, pour l'association)", key: "pin", placeholder: "Ex: 8888" },
                { label: "Emplacement", key: "location", placeholder: "Rez-de-chaussée" },
                { label: "Notes", key: "notes", placeholder: "Notes optionnelles" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                  <input
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Employé assigné</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.assigned_employee_id}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_employee_id: e.target.value }))}
                >
                  <option value="">— Non assigné —</option>
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {editing ? "Mettre à jour" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

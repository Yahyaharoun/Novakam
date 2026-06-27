"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Store, Plus, Search, Edit, Trash2, Power, PowerOff,
  Loader2, X, Save, Star
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useI18nStore } from "@/lib/store/i18n.store";
import { useRBAC } from "@/lib/rbac/hooks";
import { UpgradePrompt } from "@/lib/rbac/guard";
import { PLAN_LIMITS } from "@/lib/rbac/subscription-limits";
import type { Plan, WarehouseStatus } from "@/lib/supabase/database.types";
import toast from "react-hot-toast";
import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "@/lib/db/schema";
import { enqueueSync } from "@/lib/sync/engine";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  status: WarehouseStatus;
  is_default: boolean;
  notes: string | null;
}

const STATUS_STYLES: Record<WarehouseStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactive: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
};

export default function WarehousesPage() {
  const { t } = useI18nStore();
  const shop = useAuthStore((s) => s.currentShop);
  const { can, canCreate, plan } = useRBAC();
  const limits = PLAN_LIMITS[plan as Plan];

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "", notes: "", is_default: false });

  const activeCount = (warehouses || []).filter((w) => w.status === "active").length;
  const limitCheck = canCreate("max_warehouses_per_shop", activeCount);

  const localWarehouses = useLiveQuery(
    () => {
      if (!shop?.id) return [];
      return getDB().warehouses
        .where('shop_id').equals(shop.id)
        .toArray();
    },
    [shop?.id]
  );

  useEffect(() => {
    if (localWarehouses) {
      // sort by is_default true first, then created_at desc
      const sorted = [...localWarehouses].sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setWarehouses(sorted as any[]);
      setLoading(false);
    }
  }, [localWarehouses]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", address: "", notes: "", is_default: false });
    setShowModal(true);
  }

  function openEdit(w: Warehouse) {
    setEditing(w);
    setForm({ name: w.name, code: w.code, address: w.address ?? "", notes: w.notes ?? "", is_default: w.is_default });
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
      const db = getDB();
      const now = new Date().toISOString();
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address || null,
        notes: form.notes || null,
        is_default: form.is_default,
      };

      if (editing) {
        const updatedRecord = { ...editing, ...payload, updated_at: now };
        
        await db.transaction('rw', db.warehouses, async () => {
          if (form.is_default) {
            // Remove default from others
            const others = await db.warehouses.where('shop_id').equals(shop.id).toArray();
            for (const o of others) {
              if (o.id !== editing.id && o.is_default) {
                await db.warehouses.update(o.id, { is_default: false, updated_at: now });
                await enqueueSync("warehouses", o.id, "update", { ...o, is_default: false, updated_at: now });
              }
            }
          }
          await db.warehouses.put(updatedRecord as any);
        });
        
        await enqueueSync("warehouses", editing.id, "update", updatedRecord);
        toast.success("Magasin mis à jour");
      } else {
        const newId = crypto.randomUUID();
        const newRecord = { ...payload, id: newId, shop_id: shop.id, status: 'active', sync_status: 'pending', created_at: now, updated_at: now };
        
        await db.transaction('rw', db.warehouses, async () => {
          if (form.is_default) {
            const others = await db.warehouses.where('shop_id').equals(shop.id).toArray();
            for (const o of others) {
              if (o.is_default) {
                await db.warehouses.update(o.id, { is_default: false, updated_at: now });
                await enqueueSync("warehouses", o.id, "update", { ...o, is_default: false, updated_at: now });
              }
            }
          }
          await db.warehouses.put(newRecord as any);
        });

        await enqueueSync("warehouses", newId, "create", newRecord);
        toast.success("Magasin créé avec succès");
      }
      setShowModal(false);
    } finally { setSaving(false); }
  }

  async function handleToggleStatus(w: Warehouse) {
    if (!can("manage:warehouses")) return;
    if (w.is_default && w.status === "active") {
      toast.error("Impossible de désactiver le magasin principal");
      return;
    }
    const newStatus: WarehouseStatus = w.status === "active" ? "inactive" : "active";
    try {
      const db = getDB();
      const updatedRecord = { ...w, status: newStatus, updated_at: new Date().toISOString() };
      await db.warehouses.put(updatedRecord as any);
      await enqueueSync("warehouses", w.id, "update", updatedRecord);
      toast.success(`Magasin ${newStatus === "active" ? "activé" : "désactivé"}`);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  async function handleDelete(w: Warehouse) {
    if (!can("manage:warehouses")) return;
    if (w.is_default) { toast.error("Impossible de supprimer le magasin principal"); return; }
    if (!confirm(`Supprimer le magasin "${w.name}" ?`)) return;
    try {
      const db = getDB();
      const deletedRecord = { ...w, status: 'inactive', updated_at: new Date().toISOString() };
      await db.warehouses.put(deletedRecord as any);
      await enqueueSync("warehouses", w.id, "update", { ...deletedRecord, is_deleted: true });
      toast.success("Magasin supprimé");
    } catch {
      toast.error("Erreur");
    }
  }

  const filtered = warehouses.filter(
    (w) => w.name.toLowerCase().includes(search.toLowerCase()) || w.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Store size={22} className="text-indigo-600" /> Magasins
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeCount} / {limits.max_warehouses_per_shop === -1 ? "∞" : limits.max_warehouses_per_shop} magasins actifs
          </p>
        </div>
        {can("manage:warehouses") && (
          limitCheck.allowed ? (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              <Plus size={16} /> Nouveau magasin
            </button>
          ) : (
            <div className="max-w-xs">
              <UpgradePrompt resource="magasins" compact />
            </div>
          )
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Rechercher un magasin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <Store size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun magasin trouvé</p>
          {can("manage:warehouses") && <p className="text-sm mt-1">Cliquez sur "Nouveau magasin" pour commencer</p>}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((w) => (
            <div key={w.id} className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-800/60 border rounded-2xl hover:shadow-sm transition-all ${w.is_default ? "border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-200 dark:ring-indigo-800" : "border-slate-200 dark:border-slate-700"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${w.is_default ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                {w.code.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{w.name}</span>
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{w.code}</span>
                  {w.is_default && (
                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                      <Star size={10} /> Principal
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[w.status]}`}>
                    {w.status === "active" ? "Actif" : "Inactif"}
                  </span>
                </div>
                {w.address && <div className="text-xs text-slate-400 mt-0.5">{w.address}</div>}
              </div>
              {can("manage:warehouses") && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggleStatus(w)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title={w.status === "active" ? "Désactiver" : "Activer"}>
                    {w.status === "active" ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>
                  <button onClick={() => openEdit(w)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    <Edit size={15} />
                  </button>
                  {!w.is_default && (
                    <button onClick={() => handleDelete(w)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
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
              <h3 className="font-bold text-slate-900 dark:text-white">{editing ? "Modifier le magasin" : "Nouveau magasin"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Nom du magasin *", key: "name", placeholder: "Magasin Principal" },
                { label: "Code *", key: "code", placeholder: "MAIN" },
                { label: "Adresse", key: "address", placeholder: "Rue, Ville" },
                { label: "Notes", key: "notes", placeholder: "Notes optionnelles" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                  <input
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={placeholder}
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={form.is_default}
                  onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Magasin principal</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all">
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

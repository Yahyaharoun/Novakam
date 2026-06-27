"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Database, CheckCircle2 } from "lucide-react";
import { getDB, type SyncQueueItem } from "@/lib/db/schema";
import { runSync } from "@/lib/sync/engine";
import { useSyncStore } from "@/lib/store/sync.store";
import toast from "react-hot-toast";

export default function SyncDashboardPage() {
  const syncStore = useSyncStore();
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  const loadQueue = async () => {
    const db = getDB();
    const items = await db.syncQueue.orderBy("created_at").reverse().toArray();
    setQueue(items);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial load
    loadQueue();

    // Set up a local interval just to refresh the UI view of the queue
    const interval = setInterval(loadQueue, 2000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error("Impossible : Pas de connexion Internet");
      return;
    }
    toast("Synchronisation forcée lancée...");
    await runSync();
    await loadQueue();
  };

  const clearErrorQueue = async () => {
    if (!confirm("Voulez-vous vraiment vider la file d'attente ? Les données non synchronisées seront perdues sur le Cloud (mais resteront en local).")) return;
    const db = getDB();
    await db.syncQueue.clear();
    syncStore.setPendingCount(0);
    syncStore.setStatus("idle");
    await loadQueue();
    toast.success("File d'attente vidée");
  };

  const getStatusColor = () => {
    if (!isOnline) return "#f59e0b"; // Warning Orange
    if (syncStore.status === "syncing") return "#3b82f6"; // Blue
    if (syncStore.status === "error") return "#ef4444"; // Red
    return "#10b981"; // Green
  };

  const getStatusText = () => {
    if (!isOnline) return "Hors-ligne (Sauvegarde Locale Uniquement)";
    if (syncStore.status === "syncing") return "Synchronisation en cours...";
    if (syncStore.status === "error") return "Erreur de synchronisation";
    return "Connecté et Synchronisé";
  };

  return (
    <div className="page-enter" style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
            Moteur de Synchronisation
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Contrôle du flux de données entre la tablette locale (IndexedDB) et le serveur Cloud (Supabase).
          </p>
        </div>
      </div>

      {/* Hero Status Card */}
      <div className="card" style={{ padding: "32px", display: "flex", alignItems: "center", gap: "24px", borderTop: `4px solid ${getStatusColor()}`, marginBottom: "24px" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: `${getStatusColor()}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {!isOnline ? <CloudOff size={40} color={getStatusColor()} /> : 
           syncStore.status === "syncing" ? <RefreshCw size={40} color={getStatusColor()} className="animate-spin" /> :
           syncStore.status === "error" ? <AlertTriangle size={40} color={getStatusColor()} /> :
           <Cloud size={40} color={getStatusColor()} />}
        </div>
        
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: getStatusColor(), marginBottom: "8px" }}>
            {getStatusText()}
          </h2>
          <div style={{ display: "flex", gap: "32px", marginTop: "12px" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Opérations en attente</p>
              <p style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>{syncStore.pendingCount}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Dernière Synchronisation</p>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginTop: "4px" }}>
                {syncStore.lastSyncAt ? new Date(syncStore.lastSyncAt).toLocaleTimeString("fr-CM") : "Jamais"}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button 
            onClick={handleManualSync} 
            disabled={!isOnline || syncStore.status === "syncing" || syncStore.pendingCount === 0}
            className="btn btn-primary"
          >
            <RefreshCw size={16} className={syncStore.status === "syncing" ? "animate-spin" : ""} /> Forcer la synchro
          </button>
          {(syncStore.status === "error" || queue.length > 50) && (
            <button onClick={clearErrorQueue} className="btn btn-secondary" style={{ color: "#ef4444" }}>
              Vider la file (Danger)
            </button>
          )}
        </div>
      </div>

      {/* Queue Table */}
      <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Database size={18} /> File d'attente locale (Local IndexedDB Queue)
      </h3>
      
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {queue.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <CheckCircle2 size={40} style={{ margin: "0 auto 12px", opacity: 0.5, color: "#10b981" }} />
            <p style={{ fontWeight: "500" }}>Toutes les données sont synchronisées.</p>
            <p style={{ fontSize: "13px" }}>La base de données locale est à jour avec le Cloud.</p>
          </div>
        ) : (
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table className="data-table">
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1 }}>
                <tr>
                  <th>Heure (Locale)</th>
                  <th>Table Cible</th>
                  <th>Opération</th>
                  <th>ID de l'Enregistrement</th>
                  <th style={{ textAlign: "center" }}>Essais</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} style={{ opacity: item.retry_count > 0 ? 0.7 : 1 }}>
                    <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {new Date(item.created_at).toLocaleTimeString("fr-CM")}
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", fontWeight: "600", padding: "4px 8px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", borderRadius: "6px" }}>
                        {item.table_name}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: "12px", fontWeight: "600", padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase",
                        background: item.operation === "create" ? "rgba(16, 185, 129, 0.1)" : item.operation === "update" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: item.operation === "create" ? "#10b981" : item.operation === "update" ? "#f59e0b" : "#ef4444"
                      }}>
                        {item.operation}
                      </span>
                    </td>
                    <td style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {item.record_id}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.retry_count > 0 ? (
                        <span style={{ color: "#ef4444", fontWeight: "600", fontSize: "12px" }}>Échec ({item.retry_count})</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Prêt</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "16px", textAlign: "center" }}>
        Le moteur de synchronisation vérifie automatiquement la connexion réseau toutes les 30 secondes en tâche de fond.
      </p>
    </div>
  );
}

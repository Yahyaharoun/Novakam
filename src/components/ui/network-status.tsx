"use client";

import { useEffect, useState } from "react";
import { useSyncStore } from "@/lib/store/sync.store";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const { pendingCount, status } = useSyncStore();

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && pendingCount === 0 && status !== "error") {
    // Tout va bien, on peut cacher ou afficher très discrètement
    return null;
  }

  let icon = <Wifi size={14} />;
  let color = "var(--color-primary-600)";
  let bgColor = "var(--color-primary-50)";
  let text = "En ligne";

  if (!isOnline) {
    icon = <WifiOff size={14} />;
    color = "#ef4444";
    bgColor = "#fee2e2";
    text = "Hors ligne";
    if (pendingCount > 0) {
      text += ` (${pendingCount} attente)`;
    }
  } else if (status === "syncing") {
    icon = <RefreshCw size={14} className="spin" />;
    color = "#f59e0b";
    bgColor = "#fef3c7";
    text = `Synchronisation... (${pendingCount})`;
  } else if (status === "error" || pendingCount > 0) {
    icon = <AlertCircle size={14} />;
    color = "#f59e0b";
    bgColor = "#fef3c7";
    text = `${pendingCount} en attente`;
  }

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      borderRadius: "20px",
      background: bgColor,
      color: color,
      fontSize: "12px",
      fontWeight: "600",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      transition: "all 0.3s ease",
      animation: "page-in 0.3s"
    }}>
      {icon}
      {text}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

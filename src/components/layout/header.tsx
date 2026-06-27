"use client";
import { Bell, Moon, Sun, LogOut, Store, ChevronDown, Wifi, WifiOff, RefreshCw, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useCurrentShop } from "@/lib/store/auth.store";
import { useSyncStore } from "@/lib/store/sync.store";
import { useOffline } from "@/lib/hooks/use-offline";
import { useTheme } from "next-themes";

import { useI18nStore } from "@/lib/store/i18n.store";

export function Header({ title }: { title?: string }) {
  const { t, language, setLanguage } = useI18nStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const shop = useCurrentShop();
  const syncStatus = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const { isOnline } = useOffline();

  useEffect(() => {
    setMounted(true);
  }, []);

  function toggleDark() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  function handleLogout() {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (url && url.startsWith("http")) {
        import("@/lib/supabase/client").then(({ createClient }) => {
          createClient().auth.signOut().catch(() => {});
        });
      }
    } catch (_) {}
    
    useAuthStore.getState().reset();
    
    // Clear local session cookie
    document.cookie = "novakam-local-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // Force a full page reload to clear all states and caches
    window.location.href = "/login";
  }

  return (
    <header
      style={{
        height: "var(--header-height)",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Left */}
      <div>
        <h1 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
          {title ?? (mounted && shop ? (shop.name === "Ma Boutique" ? t("nav.shop_fallback") || shop.name : shop.name) : "NOVAKAM")}
        </h1>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

        {/* Online/Sync indicator */}
        <div
          title={
            !isOnline
              ? t("sync.offline")
              : pendingCount > 0
              ? t("sync.pending").replace("{count}", pendingCount.toString())
              : t("sync.online")
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 10px",
            borderRadius: "20px",
            background: !isOnline
              ? "rgba(245,158,11,0.1)"
              : pendingCount > 0
              ? "rgba(245,158,11,0.1)"
              : "rgba(16,185,129,0.1)",
            border: `1px solid ${
              !isOnline || pendingCount > 0
                ? "rgba(245,158,11,0.3)"
                : "rgba(16,185,129,0.3)"
            }`,
            fontSize: "12px",
            fontWeight: "500",
            color: !isOnline || pendingCount > 0 ? "#f59e0b" : "#10b981",
            cursor: "default",
          }}
        >
          {syncStatus === "syncing" ? (
            <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />
          ) : isOnline ? (
            <Wifi size={12} />
          ) : (
            <WifiOff size={12} />
          )}
          <span>{isOnline ? t("sync.online") : t("sync.offline")}</span>
          {pendingCount > 0 && (
            <span
              style={{
                background: "#f59e0b",
                color: "white",
                borderRadius: "10px",
                padding: "0 5px",
                fontSize: "10px",
                fontWeight: "700",
              }}
            >
              {pendingCount}
            </span>
          )}
        </div>

        {/* Language Switcher */}
        <button
          id="toggle-language"
          onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase"
          }}
          title="Changer de langue / Switch language"
        >
          {mounted ? language : "FR"}
        </button>

        {/* Dark mode */}
        <button
          id="toggle-dark-mode"
          onClick={toggleDark}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={theme === "dark" ? "Mode clair" : "Mode sombre"}
        >
          {mounted && theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <button
          id="notifications-btn"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-muted)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bell size={15} />
        </button>

        {/* User / Shop menu */}
        <div style={{ position: "relative" }}>
          <button
            id="user-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-muted)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Store size={13} color="white" />
            </div>
            <span>{mounted && shop ? shop.name : t("nav.shop_fallback")}</span>
            <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
          </button>

          {menuOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                  minWidth: "200px",
                  zIndex: 50,
                  overflow: "hidden",
                }}
              >
                {shop && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
                      {shop.name}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Plan {shop.plan}
                    </p>
                  </div>
                )}
                <button
                  id="lock-btn"
                  onClick={() => useAuthStore.getState().lockApp()}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    fontWeight: "500",
                  }}
                >
                  <Lock size={14} />
                  Verrouiller la caisse
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

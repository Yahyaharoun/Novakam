"use client";

import { Bell, Moon, Sun, ShieldAlert, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

export function AdminHeader({ title }: { title?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

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
    document.cookie = "novakam-local-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
        <h1 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          {title || "Dashboard Super Admin"}
          <span style={{ fontSize: "11px", padding: "2px 6px", background: "#fef3c7", color: "#d97706", borderRadius: "4px", fontWeight: "700", textTransform: "uppercase" }}>
            Niveau 4
          </span>
        </h1>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        
        {/* Dark mode */}
        <button
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
            position: "relative"
          }}
        >
          <Bell size={15} />
          <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, background: "#ef4444", borderRadius: "50%" }}></span>
        </button>

        {/* User Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-muted)",
            color: "var(--text-primary)",
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={13} color="white" />
          </div>
          <span>{mounted && user?.email ? user.email : "Super Admin"}</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Déconnexion totale"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}

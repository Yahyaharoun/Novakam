"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Users,
  CreditCard,
  Settings,
  ShieldAlert,
  Server,
  Activity,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";

type NavItem =
  | { type: "divider"; label: string }
  | { href: string; icon: React.ElementType; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Vue d'ensemble" },
  { type: "divider", label: "Gestion SaaS" },
  { href: "/admin/shops", icon: Store, label: "Boutiques" },
  { href: "/admin/users", icon: Users, label: "Propriétaires & Utilisateurs" },
  { href: "/admin/subscriptions", icon: CreditCard, label: "Abonnements & Licences" },
  { type: "divider", label: "Système" },
  { href: "/admin/logs", icon: Activity, label: "Logs & Surveillance" },
  { href: "/admin/settings", icon: Settings, label: "Configuration SaaS" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        minHeight: "100vh",
        background: "#0f172a", // Darker background for Super Admin to distinguish from normal dashboard
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 40,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "18px 16px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/admin"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #f59e0b, #ef4444)", // Orange/Red gradient for Super Admin
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={18} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: "15px",
                fontWeight: "800",
                color: "white",
                letterSpacing: "0.02em",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              NOVAKAM
            </h1>
            <p
              style={{
                fontSize: "11px",
                color: "#f59e0b",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: "600",
              }}
            >
              Super Admin
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {NAV_ITEMS.map((item, index) => {
          if ("type" in item && item.type === "divider") {
            return (
              <div
                key={`div-${index}`}
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginTop: index === 0 ? "4px" : "16px",
                  marginBottom: "4px",
                  paddingLeft: "12px",
                }}
              >
                {item.label}
              </div>
            );
          }

          if (!("href" in item)) return null;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "8px",
                textDecoration: "none",
                background: active ? "rgba(255,255,255,0.1)" : "transparent",
                color: active ? "white" : "rgba(255,255,255,0.6)",
                fontWeight: active ? "600" : "500",
                fontSize: "13px",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }
              }}
              onMouseOut={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <item.icon size={16} style={{ color: active ? "#f59e0b" : "inherit" }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
            </Link>
          );
        })}
      </nav>
      
      {/* Footer Area */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            borderRadius: "8px",
            textDecoration: "none",
            color: "rgba(255,255,255,0.6)",
            fontSize: "13px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "white";
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.6)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={16} />
          <span>Retour à la Boutique</span>
        </Link>
      </div>
    </aside>
  );
}

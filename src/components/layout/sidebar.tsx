"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Truck,
  CreditCard,
  Receipt,
  UserCheck,
  BarChart3,
  Settings,
  ShoppingBag,
  ChevronRight,
  Landmark,
  FileText,
  Store,
  Building2,
  CreditCard as SubIcon,
  Zap,
} from "lucide-react";
import { useI18nStore } from "@/lib/store/i18n.store";
import { useRBAC } from "@/lib/rbac/hooks";
import { PLAN_INFO, PLAN_LIMITS } from "@/lib/rbac/subscription-limits";
import type { Plan } from "@/lib/supabase/database.types";

type NavItem =
  | { type: "divider"; labelKey: string; fallback: string }
  | { href: string; icon: React.ElementType; labelKey: string; id: string; highlight?: boolean; permission?: string };

const NAV_ITEMS_KEYS: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard", id: "nav-dashboard" },
  { href: "/pos", icon: ShoppingCart, labelKey: "nav.pos", id: "nav-pos", highlight: true },

  { type: "divider", labelKey: "nav.management", fallback: "Gestion" },
  { href: "/products", icon: Package, labelKey: "nav.products", id: "nav-products" },
  { href: "/inventory", icon: Warehouse, labelKey: "nav.inventory", id: "nav-inventory" },
  { href: "/customers", icon: Users, labelKey: "nav.customers", id: "nav-customers" },
  { href: "/suppliers", icon: Truck, labelKey: "nav.suppliers", id: "nav-suppliers" },

  { type: "divider", labelKey: "nav.finances", fallback: "Finances" },
  { href: "/credits", icon: CreditCard, labelKey: "nav.credits", id: "nav-credits" },
  { href: "/debts", icon: FileText, labelKey: "nav.debts", id: "nav.debts" },
  { href: "/expenses", icon: Receipt, labelKey: "nav.expenses", id: "nav-expenses" },
  { href: "/treasury", icon: Landmark, labelKey: "nav.treasury", id: "nav-treasury" },

  { type: "divider", labelKey: "nav.hr_reports", fallback: "RH & Rapports" },
  { href: "/employees", icon: UserCheck, labelKey: "nav.employees", id: "nav-employees", permission: "manage:employees" },
  { href: "/registers", icon: ShoppingBag, labelKey: "nav.registers", id: "nav-registers", permission: "manage:registers" },
  { href: "/warehouses", icon: Building2, labelKey: "nav.warehouses", id: "nav-warehouses", permission: "manage:warehouses" },
  { href: "/reports", icon: BarChart3, labelKey: "nav.reports", id: "nav-reports" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18nStore();
  const { can, plan } = useRBAC();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        minHeight: "100vh",
        background: "var(--sidebar-bg)",
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
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          <div className="flex items-center gap-3 pl-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tight text-blue-500" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>NOVAKAM</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "8px 8px" }}>
        {(() => {
          const limits = PLAN_LIMITS[plan];
          const visibleItems = NAV_ITEMS_KEYS.filter((item) => {
            if ("permission" in item && item.permission && !can(item.permission as any)) return false;
            if ("id" in item) {
              if (item.id === "nav-suppliers" && !limits.has_suppliers) return false;
              if (item.id === "nav-credits" && !limits.has_credits) return false;
              if (item.id === "nav-debts" && !limits.has_suppliers) return false;
              if (item.id === "nav-expenses" && (plan === "free" || plan === "starter")) return false;
              if (item.id === "nav-treasury" && (plan === "free" || plan === "starter")) return false;
              if (item.id === "nav-warehouses" && (plan === "free" || limits.max_warehouses_per_shop <= 1)) return false;
              if (item.id === "nav-employees" && limits.max_employees <= 1) return false;
              if (item.id === "nav-registers" && limits.max_registers_per_shop < 1) return false;
              if (item.id === "nav-reports" && plan === "free") return false;
            }
            return true;
          });

          return visibleItems.map((item, index) => {
            if ("type" in item && item.type === "divider") {
              const nextDividerIndex = visibleItems.findIndex((it, i) => i > index && "type" in it && it.type === "divider");
              const hasItems = visibleItems.slice(index + 1, nextDividerIndex === -1 ? visibleItems.length : nextDividerIndex).length > 0;
              if (!hasItems) return null;

              const label = t(item.labelKey);
              return (
                <div
                  key={`divider-${index}`}
                  style={{
                    padding: "16px 10px 5px",
                    fontSize: "9.5px",
                    fontWeight: "700",
                    color: "#334155",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {label !== item.labelKey ? label : item.fallback}
                </div>
              );
            }

            const navItem = item as Exclude<NavItem, { type: "divider" }>;
            const active = isActive(navItem.href);
            const Icon = navItem.icon;
            const label = t(navItem.labelKey);
            const finalLabel = label !== navItem.labelKey ? label : navItem.labelKey;

            return (
            <Link
              key={navItem.id}
              href={navItem.href}
              id={navItem.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "7px",
                marginBottom: "1px",
                textDecoration: "none",
                transition: "all 0.15s",
                background: active
                  ? "rgba(37,99,235,0.2)"
                  : navItem.highlight && !active
                  ? "rgba(37,99,235,0.06)"
                  : "transparent",
                color: active ? "#60a5fa" : "var(--sidebar-text)",
                fontSize: "13px",
                fontWeight: active ? "600" : "400",
                border: active
                  ? "1px solid rgba(59,130,246,0.25)"
                  : "1px solid transparent",
              }}
            >
              <Icon
                size={15}
                style={{ flexShrink: 0, color: active ? "#60a5fa" : "#64748b" }}
              />
              <span style={{ flex: 1 }}>{finalLabel}</span>
              {active && (
                <ChevronRight size={13} style={{ color: "#60a5fa", opacity: 0.7 }} />
              )}
            </Link>
          );
        });
        })()}
      </nav>

      {/* Bottom: Settings + Subscription */}
      <div
        style={{
          padding: "8px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/settings"
          id="nav-settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 10px",
            borderRadius: "7px",
            textDecoration: "none",
            color: isActive("/settings") ? "#60a5fa" : "#64748b",
            fontSize: "13px",
            background: isActive("/settings") ? "rgba(37,99,235,0.2)" : "transparent",
            transition: "all 0.15s",
          }}
        >
          <Settings size={15} />
          <span>{t("nav.settings")}</span>
        </Link>

        {/* Plan Badge + Subscription Link */}
        <Link
          href="/subscription"
          id="nav-subscription"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "7px 10px",
            borderRadius: "7px",
            textDecoration: "none",
            background: isActive("/subscription") ? "rgba(37,99,235,0.2)" : "rgba(37,99,235,0.06)",
            border: "1px solid rgba(59,130,246,0.15)",
            marginTop: "4px",
            transition: "all 0.15s",
          }}
        >
          <Zap size={14} style={{ color: "#60a5fa", flexShrink: 0 }} />
          <span style={{ fontSize: "12px", color: "#60a5fa", fontWeight: 600, flex: 1 }}>Abonnement</span>
          <span style={{
            fontSize: "10px",
            fontWeight: 700,
            padding: "1px 6px",
            borderRadius: "10px",
            background: "rgba(59,130,246,0.15)",
            color: "#60a5fa",
            textTransform: "uppercase",
          }}>
            {plan?.toUpperCase() ?? "FREE"}
          </span>
        </Link>

        <div style={{ padding: "8px 10px 4px", fontSize: "10px", color: "#2d3f55" }}>
          © 2025 NOVAKAM · v1.0
        </div>
      </div>
    </aside>
  );
}

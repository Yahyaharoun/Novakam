"use client";
import { useState } from "react";
import { Warehouse, TrendingDown, TrendingUp, AlertTriangle, Package, ArrowDownCircle, ArrowUpCircle, ScanBarcode } from "lucide-react";
import { useProducts } from "@/lib/hooks/use-products";
import { StockBadge } from "@/components/products/stock-badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "@/lib/db/schema";
import { useAuthStore } from "@/lib/store/auth.store";

import { useI18nStore } from "@/lib/store/i18n.store";

type StockFilter = "all" | "low" | "out" | "ok";

export default function InventoryPage() {
  const { t } = useI18nStore();
  const shop = useAuthStore(s => s.currentShop);
  const [filter, setFilter] = useState<StockFilter>("all");

  const { products, isLoading, lowStockCount } = useProducts({ isActive: true });
  
  const expiringBatches = useLiveQuery(async () => {
    if (!shop?.id) return 0;
    const db = getDB();
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    const todayStr = today.toISOString().split("T")[0];
    const nextMonthStr = nextMonth.toISOString().split("T")[0];

    const batches = await db.productBatches
      .where("shop_id")
      .equals(shop.id)
      .filter(b => b.is_active && b.stock_quantity > 0 && !!b.expiry_date && b.expiry_date >= todayStr && b.expiry_date <= nextMonthStr)
      .count();
    return batches;
  }, [shop?.id]) ?? 0;

  const outOfStock     = products.filter((p) => p.track_stock && p.stock_quantity <= 0);
  const lowStock       = products.filter((p) => p.track_stock && p.stock_quantity > 0 && p.stock_quantity <= p.min_stock);
  const healthy        = products.filter((p) => !p.track_stock || p.stock_quantity > p.min_stock);
  const totalStockValue = products.reduce((s, p) => s + p.stock_quantity * p.purchase_price, 0);

  const filtered = filter === "all" ? products
    : filter === "out" ? outOfStock
    : filter === "low" ? lowStock
    : healthy;

  const tabs: { key: StockFilter; label: string; count: number; color?: string }[] = [
    { key: "all",  label: t("inventory.tab_all"),        count: products.length },
    { key: "out",  label: t("inventory.tab_out"),    count: outOfStock.length,  color: "#ef4444" },
    { key: "low",  label: t("inventory.tab_low"),   count: lowStock.length,    color: "#f59e0b" },
    { key: "ok",   label: t("inventory.tab_ok"),   count: healthy.length,     color: "#10b981" },
  ];

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
          {t("inventory.title")}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          {t("inventory.subtitle")}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginBottom: "16px" }}>
        <Link href="/inventory/count" className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ScanBarcode size={16} /> Mode Scan (Inventaire)
        </Link>
        <Link href="/inventory/adjustments" className="btn btn-secondary btn-sm">
          {t("inventory.adjustments")}
        </Link>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        <div className="kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{t("inventory.total_value")}</p>
              <p style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }} className="currency-display">
                {formatCurrency(totalStockValue)}
              </p>
            </div>
            <div style={{ width: "38px", height: "38px", background: "linear-gradient(135deg,#2563eb,#3b82f6)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Warehouse size={18} color="white" />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ borderColor: outOfStock.length > 0 ? "rgba(239,68,68,0.3)" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{t("inventory.out_of_stock")}</p>
              <p style={{ fontSize: "22px", fontWeight: "700", color: outOfStock.length > 0 ? "#ef4444" : "var(--text-primary)" }}>
                {outOfStock.length}
              </p>
            </div>
            <div style={{ width: "38px", height: "38px", background: "linear-gradient(135deg,#ef4444,#f87171)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingDown size={18} color="white" />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ borderColor: lowStockCount > 0 ? "rgba(245,158,11,0.3)" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{t("inventory.low_stock")}</p>
              <p style={{ fontSize: "22px", fontWeight: "700", color: lowStockCount > 0 ? "#f59e0b" : "var(--text-primary)" }}>
                {lowStockCount}
              </p>
            </div>
            <div style={{ width: "38px", height: "38px", background: "linear-gradient(135deg,#d97706,#f59e0b)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} color="white" />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ borderColor: expiringBatches > 0 ? "rgba(245,158,11,0.3)" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Péremptions (&lt; 30j)</p>
              <p style={{ fontSize: "22px", fontWeight: "700", color: expiringBatches > 0 ? "#f59e0b" : "var(--text-primary)" }}>
                {expiringBatches} lots
              </p>
            </div>
            <div style={{ width: "38px", height: "38px", background: "linear-gradient(135deg,#d97706,#f59e0b)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} color="white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: "var(--bg-muted)", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`stock-tab-${tab.key}`}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "7px 16px",
              borderRadius: "7px",
              border: "none",
              background: filter === tab.key ? "var(--bg-surface)" : "transparent",
              color: filter === tab.key ? tab.color ?? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: filter === tab.key ? "600" : "400",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: filter === tab.key ? "var(--shadow-sm)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: filter === tab.key ? (tab.color ? `${tab.color}22` : "var(--bg-muted)") : "transparent",
                color: tab.color ?? "var(--text-muted)",
                borderRadius: "10px",
                padding: "1px 6px",
                fontSize: "11px",
                fontWeight: "600",
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton animate-pulse" style={{ height: "52px", background: "var(--border-color)", borderRadius: "8px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Package size={36} style={{ margin: "0 auto 12px", color: "var(--text-muted)", opacity: 0.4 }} />
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{t("inventory.no_product_cat")}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("inventory.table_product")}</th>
                <th>{t("inventory.table_status")}</th>
                <th style={{ textAlign: "right" }}>{t("inventory.table_stock")}</th>
                <th style={{ textAlign: "right" }}>{t("inventory.table_min_stock")}</th>
                <th style={{ textAlign: "right" }}>{t("inventory.table_value")}</th>
                <th>{t("inventory.table_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const stockValue = product.stock_quantity * product.purchase_price;
                const pct = product.min_stock > 0
                  ? Math.min(100, (product.stock_quantity / (product.min_stock * 2)) * 100)
                  : 100;

                return (
                  <tr key={product.id}>
                    <td>
                      <div>
                        <p style={{ fontWeight: "500", fontSize: "14px" }}>{product.name}</p>
                        {product.sku && <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{product.sku}</p>}
                      </div>
                    </td>
                    <td>
                      <StockBadge product={product} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "14px" }}>
                          {product.track_stock ? `${product.stock_quantity} ${product.unit}` : "∞"}
                        </div>
                        {product.track_stock && (
                          <div style={{ marginTop: "4px", height: "4px", background: "var(--bg-muted)", borderRadius: "2px", width: "80px", marginLeft: "auto" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct < 30 ? "#ef4444" : pct < 60 ? "#f59e0b" : "#10b981", borderRadius: "2px" }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: "13px" }}>
                      {product.track_stock ? `${product.min_stock} ${product.unit}` : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "600" }} className="currency-display">
                      {product.track_stock ? formatCurrency(stockValue) : "—"}
                    </td>
                    <td>
                      <Link href={`/products/${product.id}`} className="btn btn-ghost btn-sm">
                        {t("inventory.btn_manage")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Filter, AlertTriangle, Package,
  BarChart2, Edit2, ToggleLeft, Grid, List,
} from "lucide-react";
import { useProducts } from "@/lib/hooks/use-products";
import { useCategories } from "@/lib/hooks/use-categories";
import { StockBadge } from "@/components/products/stock-badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { LocalProduct } from "@/lib/db/schema";
import { getDB } from "@/lib/db/schema";
import { useAuthStore } from "@/lib/store/auth.store";
import { v4 as uuidv4 } from "uuid";
import { useI18nStore } from "@/lib/store/i18n.store";
import { useRBAC } from "@/lib/rbac/hooks";
import { PLAN_LIMITS } from "@/lib/rbac/subscription-limits";

// ── KPI mini-card ──────────────────────────────────────
function MiniKpi({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="card" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "4px" }}>
      <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ fontSize: "22px", fontWeight: "700", color: color ?? "var(--text-primary)", letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}

// ── Product Row (table view) ───────────────────────────
function ProductRow({ product, onEdit }: { product: LocalProduct; onEdit: () => void }) {
  const { t } = useI18nStore();
  const margin = product.selling_price > 0
    ? Math.round(((product.selling_price - product.purchase_price) / product.selling_price) * 100)
    : 0;

  return (
    <tr style={{ opacity: product.is_active ? 1 : 0.5 }}>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "var(--bg-muted)", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <Package size={16} style={{ color: "var(--text-muted)" }} />
          </div>
          <div>
            <p style={{ fontWeight: "500", fontSize: "14px", color: "var(--text-primary)" }}>{product.name}</p>
            {product.sku && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>SKU: {product.sku}</p>
            )}
          </div>
        </div>
      </td>
      <td>
        <StockBadge product={product} />
      </td>
      <td className="currency-display" style={{ fontWeight: "600" }}>
        {formatCurrency(product.selling_price)}
      </td>
      <td className="currency-display" style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
        {formatCurrency(product.purchase_price)}
      </td>
      <td>
        <span style={{ fontSize: "13px", fontWeight: "600", color: margin < 0 ? "#ef4444" : margin < 15 ? "#f59e0b" : "#10b981" }}>
          {margin}%
        </span>
      </td>
      <td>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={onEdit} className="btn btn-ghost btn-sm" title={t("products.edit")}>
            <Edit2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Product Card (grid view) ───────────────────────────
function ProductCard({ product, onEdit }: { product: LocalProduct; onEdit: () => void }) {
  const { t } = useI18nStore();
  const margin = product.selling_price > 0
    ? Math.round(((product.selling_price - product.purchase_price) / product.selling_price) * 100)
    : 0;

  return (
    <div
      className="card"
      style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", transition: "all 0.15s", opacity: product.is_active ? 1 : 0.5 }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Package size={18} style={{ color: "var(--color-primary-600)" }} />
        </div>
        <StockBadge product={product} showQty={false} />
      </div>

      {/* Name */}
      <div>
        <p style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)", marginBottom: "2px", lineHeight: 1.3 }}>
          {product.name}
        </p>
        {product.sku && (
          <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{product.sku}</p>
        )}
      </div>

      {/* Price + Margin */}
      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }} className="currency-display">
            {formatCurrency(product.selling_price)}
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {t("products.buy_label")} : {formatCurrency(product.purchase_price)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "14px", fontWeight: "700", color: margin < 0 ? "#ef4444" : margin < 15 ? "#f59e0b" : "#10b981" }}>
            {margin}%
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t("products.margin_label")}</p>
        </div>
      </div>

      {/* Stock bar */}
      {product.track_stock && (
        <div>
          <div style={{ height: "4px", background: "var(--bg-muted)", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, product.min_stock > 0 ? (product.stock_quantity / product.min_stock) * 50 : 100)}%`,
                background: product.stock_quantity <= 0 ? "#ef4444" : product.stock_quantity <= product.min_stock ? "#f59e0b" : "#10b981",
                borderRadius: "2px",
                transition: "width 0.3s",
              }}
            />
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
            Stock: {product.stock_quantity} {product.unit}
          </p>
        </div>
      )}

      {/* Actions */}
      <button onClick={onEdit} className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
        <Edit2 size={13} /> {t("products.edit")}
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────
export default function ProductsPage() {
  const { t } = useI18nStore();
  const router = useRouter();
  const [rawSearch, setRawSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const { currentShop } = useAuthStore();
  const { plan } = useRBAC();
  const limits = PLAN_LIMITS[plan];

  const handleGenerateProducts = async () => {
    if (!currentShop) return;
    if (limits.max_products !== -1 && products.length >= limits.max_products) {
      alert(`Limite atteinte (${limits.max_products} produits max). Vous ne pouvez plus en ajouter.`);
      return;
    }
    
    const maxToAdd = limits.max_products !== -1 ? Math.min(100, limits.max_products - products.length) : 100;

    const db = getDB();
    const newProducts: LocalProduct[] = [];
    const syncItems: any[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < maxToAdd; i++) {
      const pId = uuidv4();
      const product: LocalProduct = {
        id: pId,
        shop_id: currentShop.id,
        name: `Produit Test ${Math.floor(Math.random() * 10000)}`,
        sku: `TEST-${i}-${Math.floor(Math.random() * 10000)}`,
        internal_reference: `REF-TEST-${i}`,
        qr_code: pId,
        description: "",
        category_id: undefined,
        purchase_price: Math.floor(Math.random() * 5000),
        selling_price: Math.floor(Math.random() * 10000) + 5000,
        unit: "pc",
        barcode: undefined,
        track_stock: true,
        allow_negative: false,
        has_variants: false,
        has_batches: false,
        is_weighable: false,
        stock_quantity: Math.floor(Math.random() * 50) + 10,
        min_stock: 5,
        is_active: true,
        image_url: undefined,
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      };
      newProducts.push(product);
      syncItems.push({
        id: uuidv4(),
        table_name: "products",
        record_id: pId,
        action: "create",
        payload: product,
        status: "pending",
        created_at: now,
      });
    }

    try {
      await db.transaction("rw", [db.products, db.syncQueue], async () => {
        await db.products.bulkAdd(newProducts);
        await db.syncQueue.bulkAdd(syncItems);
      });
      alert(`${maxToAdd} produits générés avec succès !`);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération");
    }
  };

  const handleClearTestProducts = async () => {
    if (!currentShop) return;
    const db = getDB();
    try {
      const testProducts = await db.products
        .where("shop_id")
        .equals(currentShop.id)
        .filter(p => p.name.startsWith("Produit Test"))
        .toArray();
      const ids = testProducts.map(p => p.id);
      await db.transaction("rw", [db.products, db.syncQueue], async () => {
        await db.products.bulkDelete(ids);
      });
      alert(`${ids.length} produits de test supprimés !`);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  const search = useDeferredValue(rawSearch);

  const { products, isLoading, lowStockCount } = useProducts({
    search,
    category_id: categoryId || undefined,
    lowStock: lowStockOnly || undefined,
    isActive: true,
  });

  const { categories } = useCategories();

  const totalValue = products.reduce((s, p) => s + p.stock_quantity * p.purchase_price, 0);
  const outOfStock = products.filter((p) => p.track_stock && p.stock_quantity <= 0).length;

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
            {t("products.title")}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            {t("products.subtitle").replace("{count}", products.length.toString())}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleClearTestProducts} className="btn btn-secondary" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            🗑️ Vider (Tests)
          </button>
          <button onClick={handleGenerateProducts} className="btn btn-secondary" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
            ⚙️ Générer (Test)
          </button>
          
          {limits.max_products !== -1 && products.length >= limits.max_products ? (
            <button className="btn btn-primary" style={{ opacity: 0.5, cursor: "not-allowed" }} title="Limite d'abonnement atteinte">
              <Plus size={16} /> {t("products.new")}
            </button>
          ) : (
            <Link href="/products/new" id="add-product-btn" className="btn btn-primary">
              <Plus size={16} /> {t("products.new")}
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <MiniKpi label={t("products.total")} value={products.length} />
        <MiniKpi label={t("products.critical_stock")} value={lowStockCount} color={lowStockCount > 0 ? "#f59e0b" : undefined} />
        <MiniKpi label={t("products.out_of_stock")} value={outOfStock} color={outOfStock > 0 ? "#ef4444" : undefined} />
        <MiniKpi label={t("products.stock_value")} value={formatCurrency(totalValue)} />
      </div>

      {/* Filters bar */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: "200px" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            id="products-search"
            type="text"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder={t("products.search")}
            className="input"
            style={{ paddingLeft: "34px" }}
          />
        </div>

        {/* Category filter */}
        <select
          id="products-category-filter"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input"
          style={{ width: "auto", minWidth: "160px" }}
        >
          <option value="">{t("products.all_categories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Low stock toggle */}
        <button
          id="low-stock-filter-btn"
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`btn ${lowStockOnly ? "btn-primary" : "btn-secondary"} btn-sm`}
          style={{ gap: "6px" }}
        >
          <AlertTriangle size={14} />
          {t("products.low_stock_btn")} {lowStockCount > 0 && `(${lowStockCount})`}
        </button>

        {/* View toggle */}
        <div style={{ display: "flex", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
          <button onClick={() => setViewMode("list")} className="btn btn-ghost btn-sm" style={{ borderRadius: 0, background: viewMode === "list" ? "var(--bg-muted)" : "transparent" }}>
            <List size={15} />
          </button>
          <button onClick={() => setViewMode("grid")} className="btn btn-ghost btn-sm" style={{ borderRadius: 0, background: viewMode === "grid" ? "var(--bg-muted)" : "transparent" }}>
            <Grid size={15} />
          </button>
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStockCount > 0 && !lowStockOnly && (
        <div
          style={{
            marginBottom: "16px", padding: "12px 16px",
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px",
            fontSize: "13px",
          }}
        >
          <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <span style={{ color: "var(--text-primary)", flex: 1 }}>
            <strong>{t("products.alert_critical").replace("{count}", lowStockCount.toString())}</strong>{" "}
            <button onClick={() => setLowStockOnly(true)} style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", fontWeight: "600", padding: 0 }}>
              {t("products.alert_view")}
            </button>
          </span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "180px" }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
          <Package size={40} style={{ margin: "0 auto 16px", color: "var(--text-muted)", opacity: 0.4 }} />
          <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
            {rawSearch || categoryId || lowStockOnly ? t("products.no_result") : t("products.no_product")}
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
            {rawSearch || categoryId || lowStockOnly
              ? t("products.change_filters")
              : t("products.start_creating")}
          </p>
          {!rawSearch && !categoryId && !lowStockOnly && (
            <Link href="/products/new" className="btn btn-primary btn-sm">
              <Plus size={14} /> {t("products.create")}
            </Link>
          )}
        </div>
      ) : viewMode === "list" ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("products.table_product")}</th>
                <th>{t("products.table_stock")}</th>
                <th>{t("products.table_sell_price")}</th>
                <th>{t("products.table_buy_price")}</th>
                <th>{t("products.table_margin")}</th>
                <th>{t("products.table_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onEdit={() => router.push(`/products/${p.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onEdit={() => router.push(`/products/${p.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Trash2, Printer, QrCode } from "lucide-react";
import { ProductForm, type ProductFormData } from "@/components/products/product-form";
import { useProduct, useProducts } from "@/lib/hooks/use-products";
import { useCategories } from "@/lib/hooks/use-categories";
import { StockBadge } from "@/components/products/stock-badge";
import { formatCurrency } from "@/lib/utils/currency";
import toast from "react-hot-toast";
import { useState, useRef } from "react";
import QRCode from "react-qr-code";

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { product, isLoading } = useProduct(id);
  const { updateProduct, archiveProduct, adjustStock } = useProducts();
  const { categories } = useCategories();
  
  const [adjusting, setAdjusting] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  async function handleUpdate(data: ProductFormData) {
    try {
      await updateProduct(id, {
        name: data.name,
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        category_id: data.category_id || undefined,
        description: data.description || undefined,
        purchase_price: data.purchase_price,
        selling_price: data.selling_price,
        min_price: data.min_price,
        stock_quantity: data.stock_quantity,
        min_stock: data.min_stock,
        unit: data.unit,
        is_weighable: data.is_weighable,
        is_active: data.is_active,
        track_stock: data.track_stock,
        allow_negative: data.allow_negative,
        has_variants: data.has_variants,
        has_batches: data.has_batches,
      }, data.variants, data.batches);
      toast.success("Produit modifié avec succès");
      router.push("/products");
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  async function handleArchive() {
    if (!confirm("Archiver définitivement ce produit ?")) return;
    await archiveProduct(id);
    toast.success("Produit archivé");
    router.push("/products");
  }

  async function handleStockAdjust() {
    if (adjustDelta === 0) return;
    await adjustStock(id, adjustDelta, adjustNote);
    toast.success(`Stock ajusté de ${adjustDelta > 0 ? "+" : ""}${adjustDelta}`);
    setAdjusting(false);
    setAdjustDelta(0);
    setAdjustNote("");
  }

  const handlePrintLabel = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: "760px", padding: "20px" }}>
        <div className="skeleton animate-pulse" style={{ height: "40px", width: "200px", marginBottom: "24px" }} />
        <div className="skeleton animate-pulse" style={{ height: "400px", borderRadius: "12px" }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center", maxWidth: "500px", margin: "40px auto" }}>
        <p style={{ fontWeight: "600", color: "var(--text-primary)" }}>Produit introuvable</p>
        <button onClick={() => router.push("/products")} className="btn btn-primary" style={{ marginTop: "16px" }}>
          Retour au catalogue
        </button>
      </div>
    );
  }

  const margin = product.selling_price > 0
    ? Math.round(((product.selling_price - product.purchase_price) / product.selling_price) * 100)
    : 0;

  return (
    <>
      <div className="page-enter" style={{ maxWidth: "760px", margin: "0 auto", paddingBottom: "40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ padding: "8px" }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
              {product.name}
            </h1>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <StockBadge product={product} />
              <span style={{ fontSize: "13px", color: "var(--color-primary-600)", fontWeight: 500, background: "var(--color-primary-100)", padding: "2px 8px", borderRadius: "4px" }}>
                {product.internal_reference}
              </span>
              {product.sku && <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>SKU: {product.sku}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handlePrintLabel} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Printer size={15} /> Imprimer Étiquette
            </button>
            <button onClick={handleArchive} className="btn btn-ghost btn-sm" style={{ color: "#ef4444" }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          <div className="card" style={{ padding: "16px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Stock Actuel</p>
            <p style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
              {product.stock_quantity} <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>{product.unit}</span>
            </p>
          </div>
          <div className="card" style={{ padding: "16px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Prix de vente</p>
            <p style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
              {formatCurrency(product.selling_price)}
            </p>
          </div>
          <div className="card" style={{ padding: "16px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Marge Brute</p>
            <p style={{ fontSize: "20px", fontWeight: "700", color: margin < 15 ? "#f59e0b" : "#10b981" }}>
              {margin}%
            </p>
          </div>
          <div className="card" style={{ padding: "16px", background: "var(--bg-muted)", border: "1px dashed var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ padding: "4px", background: "#fff", borderRadius: "4px", border: "1px solid #ddd" }}>
                 <QRCode value={product.qr_code || product.id} size={40} level="L" />
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px", fontWeight: 600 }}>QR Code Interne</p>
                <p style={{ fontSize: "10px", color: "var(--text-secondary)", wordBreak: "break-all" }}>{product.qr_code?.substring(0,8)}...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock adjustment panel */}
        {product.track_stock && (
          <div className="card" style={{ padding: "20px", marginBottom: "24px", borderLeft: "4px solid var(--color-primary-600)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: adjusting ? "16px" : 0 }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>📦 Historique & Ajustement Rapide</p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Corrigez une erreur d'inventaire ou signalez une perte.</p>
              </div>
              <button onClick={() => setAdjusting(!adjusting)} className="btn btn-secondary btn-sm">
                {adjusting ? "Annuler" : "Ajuster manuellement"}
              </button>
            </div>
            {adjusting && (
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", background: "var(--bg-muted)", padding: "16px", borderRadius: "8px" }}>
                <div style={{ width: "120px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                    Quantité
                  </label>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(Number(e.target.value))}
                    className="input"
                    placeholder="+5 ou -2"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                    Raison / Motif de l'ajustement
                  </label>
                  <input
                    type="text"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    className="input"
                    placeholder="Ex: Marchandise abîmée, erreur de comptage..."
                  />
                </div>
                <button onClick={handleStockAdjust} className="btn btn-primary" disabled={adjustDelta === 0}>
                  Valider
                </button>
              </div>
            )}
          </div>
        )}

        {/* Edit Form */}
        <div style={{ marginTop: "32px" }}>
          <ProductForm
            product={product}
            categories={categories}
            onSubmit={handleUpdate}
            onCancel={() => router.push("/products")}
          />
        </div>
      </div>

      {/* ── Section Impression Etiquette (Cachée sauf impression) ── */}
      <div className="print-area no-print" ref={printRef}>
        <div style={{ width: "50mm", height: "30mm", display: "flex", flexDirection: "column", padding: "2mm", boxSizing: "border-box", fontFamily: "sans-serif" }}>
          <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, paddingRight: "4px" }}>
              <h2 style={{ fontSize: "9px", fontWeight: "bold", margin: 0, lineHeight: 1.1, maxHeight: "19px", overflow: "hidden" }}>{product.name}</h2>
              <p style={{ fontSize: "7px", margin: "2px 0 0", color: "#444" }}>Réf: {product.internal_reference}</p>
              <p style={{ fontSize: "12px", fontWeight: "900", margin: "4px 0 0" }}>{formatCurrency(product.selling_price)}</p>
            </div>
            <div>
              <QRCode value={product.qr_code || product.id} size={38} level="L" style={{ display: "block" }} />
            </div>
          </div>
          {product.barcode && (
            <div style={{ textAlign: "center", borderTop: "1px solid #ccc", paddingTop: "2px", marginTop: "2px" }}>
              <p style={{ fontSize: "6px", margin: 0, letterSpacing: "1px" }}>{product.barcode}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

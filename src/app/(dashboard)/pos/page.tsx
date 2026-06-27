// src/app/(dashboard)/pos/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Search, ScanBarcode, Package, Camera, XCircle } from "lucide-react";
import { useProducts, useProductByScanner } from "@/lib/hooks/use-products";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { CameraScanner } from "@/components/scanner/camera-scanner";
import { useCategories } from "@/lib/hooks/use-categories";
import { useCartStore } from "@/lib/store/cart.store";
import { PosCartColumn } from "@/components/pos/pos-cart-column";
import { PosCheckoutColumn, type PaymentSplitExt } from "@/components/pos/pos-checkout-column";
import { VariantModal } from "@/components/pos/variant-modal";
import { Receipt80mm, type ReceiptProps } from "@/components/pos/receipt-80mm";
import { useSales, type PaymentSplit } from "@/lib/hooks/use-sales";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/lib/store/auth.store";
import { useSettingsStore } from "@/lib/store/settings.store";
import { useCustomers } from "@/lib/hooks/use-customers";
import toast from "react-hot-toast";
import { useI18nStore } from "@/lib/store/i18n.store";
import { usePosShortcuts } from "@/lib/hooks/use-pos-shortcuts";

const ProductCard = memo(({ product, onClick, t }: { product: any; onClick: (product: any) => void; t: any }) => {
  return (
    <button 
      onClick={() => onClick(product)}
      className="card"
      style={{
        display: "flex", flexDirection: "column", padding: "12px", textAlign: "left",
        border: "1px solid var(--border-color)", cursor: "pointer", transition: "all 0.15s",
        background: "var(--bg-surface)", alignItems: "flex-start", gap: "8px", position: "relative"
      }}
      onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--color-primary-400)"}
      onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
    >
        {product.track_stock && product.stock_quantity <= 0 && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.6)", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ background: "#ef4444", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>{t("pos.out_of_stock")}</span>
          </div>
        )}
        <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "4px" }}>
          {product.name}
        </p>
        <div style={{ marginTop: "auto", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--color-primary-600)" }} className="currency-display">
            {formatCurrency(product.selling_price)}
          </p>
          {product.track_stock && (
            <p style={{ fontSize: "11px", color: product.stock_quantity <= product.min_stock ? "#ef4444" : "var(--text-secondary)" }}>
              {t("pos.stock")}{product.stock_quantity}
            </p>
          )}
        </div>
    </button>
  );
});

export default function PosPage() {
  const { t } = useI18nStore();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptProps | null>(null);
  const [variantPromptProduct, setVariantPromptProduct] = useState<any | null>(null);

  const { products, isLoading } = useProducts({ search, category_id: categoryId || undefined, isActive: true });
  const { categories } = useCategories();
  const getProductByScanner = useProductByScanner();
  const { posSettings } = useSettingsStore();
  const { processSale } = useSales();
  const { customers } = useCustomers();
  const shop = useAuthStore(s => s.currentShop);
  const user = useAuthStore(s => s.user);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  usePosShortcuts({
    onSearchFocus: () => searchInputRef.current?.focus(),
    onCancel: () => {
      useCartStore.getState().clear();
      setSearch("");
    },
    disabled: !!variantPromptProduct || !!receiptData,
  });

  // Print effect when receiptData changes
  useEffect(() => {
    if (receiptData && receiptRef.current) {
      setTimeout(() => {
         window.print();
         setReceiptData(null); // Clear after printing
      }, 500);
    }
  }, [receiptData]);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  const handleScan = async (code: string) => {
    const product = await getProductByScanner(code);
    if (product) {
      handleProductClick(product);
      if (isCameraOpen) setIsCameraOpen(false); // Optionnel: fermer la caméra après un scan réussi
    } else {
      setNotFoundCode(code);
      if (isCameraOpen) setIsCameraOpen(false); // Fermer pour afficher l'erreur
    }
  };

  useBarcodeScanner({
    onScan: handleScan,
    enabled: posSettings?.enable_barcode || posSettings?.enable_qrcode,
  });

  const handleProductClick = useCallback((product: any) => {
    if (product.has_variants || product.has_batches) {
      setVariantPromptProduct(product);
    } else {
      useCartStore.getState().addItem(product, 1);
      toast.success(`${product.name} ${t("pos.added")}`, { duration: 1000 });
    }
  }, [t]);

  const handleVariantSelect = useCallback((variant?: any, batch?: any) => {
    if (variantPromptProduct) {
      useCartStore.getState().addItem(variantPromptProduct, 1, variant, batch);
      toast.success(`${variant?.name || variantPromptProduct.name} ${t("pos.added")}`, { duration: 1000 });
    }
    setVariantPromptProduct(null);
  }, [t, variantPromptProduct]);



  const handlePaymentComplete = async (payments: PaymentSplitExt[], customerId?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const cartState = useCartStore.getState();
      const sale = await processSale({
        items: cartState.items,
        subtotal: cartState.subtotal,
        discountAmount: cartState.discountAmount,
        total: cartState.total,
        payments: payments.map(p => ({ method: p.method, amount: p.amount })),
        customerId,
        notes: payments.some(p => p.reference) 
          ? "Réf. Transaction: " + payments.map(p => p.reference).filter(Boolean).join(", ")
          : undefined,
      });

      // Prepare receipt data
      const paidAmt = payments.reduce((s, p) => s + p.amount, 0);
      const customerName = customers.find(c => c.id === customerId)?.name;
      
      const paymentNames = payments.map(p => {
        if (p.provider && p.reference) return `${p.provider} (${p.reference})`;
        if (p.provider) return p.provider;
        if (p.method === "cash") return "Espèces";
        return p.method;
      }).join(", ");
      
      setReceiptData({
        saleNumber: sale.sale_number,
        shopName: shop?.name || "Boutique",
        items: [...cartState.items],
        subtotal: cartState.subtotal,
        discountAmount: cartState.discountAmount,
        total: cartState.total,
        paidAmount: paidAmt,
        changeAmount: sale.change_amount,
        paymentMethod: paymentNames,
        cashierName: user?.email || "Caisse 1",
        customerName: customerName,
        date: sale.sold_at,
      });

      // Clear cart
      cartState.clear();
      toast.success(t("pos.sale_success"));

    } catch (error) {
      console.error(error);
      toast.error(t("pos.sale_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", overflow: "hidden", gap: "20px", padding: "10px" }}>
      
      {/* ── Left Column: Products (40%) ── */}
      <div style={{ flex: "4", display: "flex", flexDirection: "column", gap: "16px", minWidth: "300px" }}>
        
        {/* Filters & Search */}
        <div className="card" style={{ padding: "12px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
          {posSettings?.enable_search !== false && (
            <div style={{ position: "relative", flexGrow: 1, minWidth: "150px" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                ref={searchInputRef}
                type="text" 
                className="input" 
                placeholder={t("pos.search_placeholder")} 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "36px", width: "100%" }}
              />
            </div>
          )}

          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: posSettings?.enable_search !== false ? "200px" : "100%" }}>
            <option value="">{t("pos.all_categories")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <button 
            onClick={() => setIsCameraOpen(true)} 
            className="btn btn-ghost" 
            style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "13px", padding: "0 10px", border: "1px dashed var(--border-color)" }}
            title="Cliquez pour utiliser la caméra du PC/Téléphone"
          >
             <ScanBarcode size={16} /> Scanner Caméra
          </button>
        </div>

        {/* Product Grid */}
        <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", alignContent: "start", paddingRight: "4px" }}>
          {isLoading ? (
             <p style={{ padding: "20px" }}>{t("common.loading")}</p>
          ) : products.length === 0 ? (
             <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
               <Package size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
               <p>{t("pos.no_product")}</p>
             </div>
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} onClick={handleProductClick} t={t} />
            ))
          )}
        </div>
      </div>

      {/* ── Center Column: Cart (35%) ── */}
      <div style={{ flex: "3.5", minWidth: "320px", display: "flex" }}>
        <PosCartColumn />
      </div>

      {/* ── Right Column: Checkout (25%) ── */}
      <div style={{ flex: "2.5", minWidth: "300px", display: "flex" }}>
        <PosCheckoutColumn onComplete={handlePaymentComplete} isSubmitting={isSubmitting} />
      </div>

      {/* Modals & Hidden Elements */}
      {variantPromptProduct && (
        <VariantModal
          product={variantPromptProduct}
          onSelect={handleVariantSelect}
          onClose={() => setVariantPromptProduct(null)}
        />
      )}

      {receiptData && (
        <Receipt80mm ref={receiptRef} {...receiptData} />
      )}

      {/* ── Camera Scanner Modal ── */}
      {isCameraOpen && (
        <CameraScanner 
          onScan={handleScan}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* ── Erreur: Produit non trouvé ── */}
      {notFoundCode && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "24px", textAlign: "center", animation: "page-in 0.2s" }}>
            <XCircle size={48} style={{ color: "#ef4444", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Produit non enregistré</h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
              Le code scanné n'existe pas dans la base de données :<br/>
              <strong style={{ fontSize: "16px", color: "var(--text-primary)", display: "inline-block", marginTop: "8px" }}>{notFoundCode}</strong>
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={() => setNotFoundCode(null)} className="btn btn-ghost">Fermer</button>
              <a href={`/products/new?barcode=${notFoundCode}`} className="btn btn-primary">Ajouter le produit</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

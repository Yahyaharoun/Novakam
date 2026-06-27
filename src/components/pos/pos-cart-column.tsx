"use client";

import { Trash2, Plus, Minus, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useCartStore } from "@/lib/store/cart.store";
import { useI18nStore } from "@/lib/store/i18n.store";

export function PosCartColumn() {
  const { t } = useI18nStore();
  const cart = useCartStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-base)", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
      
      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-surface)" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "700" }}>Panier / Facture</h2>
        <span style={{ background: "var(--color-primary-500)", color: "white", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
          {cart.items.length} articles
        </span>
      </div>

      {/* Cart Items List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {cart.items.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "40px" }}>
            <FileText size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: "14px", fontWeight: "500" }}>Le panier est vide</p>
          </div>
        ) : (
          cart.items.map((item) => (
            <div key={item.product_id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px", borderBottom: "1px solid var(--border-color)" }}>
              
              {/* Product Image Placeholder */}
              <div style={{ width: "40px", height: "40px", background: "var(--bg-muted)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <FileText size={20} style={{ color: "var(--text-muted)" }} />
                )}
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.product_name}</p>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{item.product_sku || "N/A"}</p>
              </div>

              {/* Quantity Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-muted)", borderRadius: "6px", padding: "2px" }}>
                <button onClick={() => cart.updateQty(item.product_id, item.quantity - 1)} style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}>
                  <Minus size={14} />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  key={`qty-${item.product_id}-${item.quantity}`}
                  defaultValue={item.quantity}
                  onFocus={(e) => e.target.select()}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      if (val !== item.quantity) cart.updateQty(item.product_id, val);
                    } else {
                      e.target.value = item.quantity.toString();
                    }
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  style={{ fontSize: "13px", fontWeight: "600", width: "30px", textAlign: "center", background: "transparent", border: "none", outline: "none", padding: 0 }}
                />
                <button onClick={() => cart.updateQty(item.product_id, item.quantity + 1)} style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" }}>
                  <Plus size={14} />
                </button>
              </div>

              {/* Price & Discount */}
              <div style={{ textAlign: "right", minWidth: "80px" }}>
                <p style={{ fontSize: "14px", fontWeight: "700" }} className="currency-display">{formatCurrency(item.total_price)}</p>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }} className="currency-display">{formatCurrency(item.unit_price)}/u</p>
              </div>

              {/* Remove */}
              <button onClick={() => cart.removeItem(item.product_id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}>
                <Trash2 size={16} />
              </button>

            </div>
          ))
        )}
      </div>

      {/* Footer / Totals */}
      <div style={{ borderTop: "1px solid var(--border-color)", padding: "16px", background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {/* Global Discount */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-muted)", padding: "8px 12px", borderRadius: "8px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", flex: 1 }}>Remise globale</label>
          <input 
            type="number" 
            className="input" 
            style={{ width: "70px", padding: "4px 8px", height: "30px", fontSize: "13px" }} 
            value={cart.discountGlobal || ""}
            onChange={(e) => cart.setGlobalDiscount(Number(e.target.value) || 0, cart.discountGlobalType)}
            min="0"
          />
          <select 
            className="input" 
            style={{ width: "60px", padding: "4px 2px", height: "30px", fontSize: "13px" }}
            value={cart.discountGlobalType}
            onChange={(e) => cart.setGlobalDiscount(cart.discountGlobal, e.target.value as "percentage" | "fixed")}
          >
            <option value="percentage">%</option>
            <option value="fixed">FCFA</option>
          </select>
        </div>

        {/* Note */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Note de vente (facultatif)</label>
          <input 
            type="text" 
            className="input" 
            style={{ fontSize: "13px", padding: "8px" }} 
            placeholder="Ajouter une note..."
            value={cart.note}
            onChange={(e) => cart.setNote(e.target.value)}
          />
        </div>

        {/* Totals Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-secondary)" }}>
            <span>Sous-total</span>
            <span className="currency-display">{formatCurrency(cart.subtotal)}</span>
          </div>
          {cart.discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#10b981" }}>
              <span>Remise</span>
              <span className="currency-display">-{formatCurrency(cart.discountAmount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "8px", borderTop: "1px dashed var(--border-color)", paddingTop: "8px" }}>
            <span style={{ fontSize: "16px", fontWeight: "700" }}>Total à payer</span>
            <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--color-primary-600)", lineHeight: 1 }} className="currency-display">
              {formatCurrency(cart.total)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

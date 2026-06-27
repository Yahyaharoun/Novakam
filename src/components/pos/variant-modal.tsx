import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { getDB, type LocalProduct, type LocalProductVariant, type LocalProductBatch } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils/currency";

interface VariantModalProps {
  product: LocalProduct;
  onSelect: (variant?: LocalProductVariant, batch?: LocalProductBatch) => void;
  onClose: () => void;
}

export function VariantModal({ product, onSelect, onClose }: VariantModalProps) {
  const [variants, setVariants] = useState<LocalProductVariant[]>([]);
  const [batches, setBatches] = useState<LocalProductBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // For complex products (Variants AND Batches), we'll do simple selection for now:
  // User selects variant, then batch, or just variant.
  // The system currently supports one or the other mainly based on UI flow.
  const [selectedVariant, setSelectedVariant] = useState<LocalProductVariant | null>(null);

  useEffect(() => {
    async function load() {
      const db = getDB();
      if (product.has_variants) {
        const vs = await db.productVariants.where("product_id").equals(product.id).toArray();
        setVariants(vs);
      }
      if (product.has_batches && !product.has_variants) {
        // Simple case: no variants, only batches (e.g. Paracetamol)
        const bs = await db.productBatches.where("product_id").equals(product.id).toArray();
        // Sort by expiry_date ASC (FEFO)
        bs.sort((a, b) => {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return a.expiry_date.localeCompare(b.expiry_date);
        });
        setBatches(bs);
      }
      setLoading(false);
    }
    load();
  }, [product.id, product.has_variants, product.has_batches]);

  // If FEFO automatic selection is approved by the user, we auto-select the best batch
  useEffect(() => {
    if (!loading && product.has_batches && !product.has_variants && batches.length > 0) {
      // Find first batch with stock > 0, else just take the first one
      const bestBatch = batches.find(b => b.stock_quantity > 0) || batches[0];
      onSelect(undefined, bestBatch);
    }
  }, [loading, product, batches, onSelect]);

  if (loading || (product.has_batches && !product.has_variants)) {
    // If it's just batches, we auto-select and close (FEFO strategy)
    return null;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)"
    }}>
      <div className="card" style={{
        width: "100%", maxWidth: "500px", padding: "24px", paddingBottom: "40px",
        borderBottomLeftRadius: 0, borderBottomRightRadius: 0, animation: "slide-up 0.2s ease-out"
      }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700" }}>Choisissez une option</h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{product.name}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "8px" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "60vh", overflowY: "auto" }}>
          {variants.length === 0 && <p>Aucune variante trouvée.</p>}
          {variants.map(v => (
            <button
              key={v.id}
              onClick={() => onSelect(v, undefined)}
              className="card"
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px", cursor: "pointer", transition: "all 0.15s",
                border: "2px solid var(--border-color)", background: "var(--bg-surface)"
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--color-primary-400)"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
            >
              <div style={{ textAlign: "left" }}>
                <p style={{ fontWeight: "600", fontSize: "16px" }}>{v.name}</p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Stock: {v.stock_quantity}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontWeight: "700", color: "var(--color-primary-600)", fontSize: "16px" }}>
                  {formatCurrency(v.selling_price || product.selling_price)}
                </p>
              </div>
            </button>
          ))}
        </div>

      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

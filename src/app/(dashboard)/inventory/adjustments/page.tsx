"use client";

import { useState } from "react";
import { ArrowLeft, Search, Save, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProducts, useProductByScanner } from "@/lib/hooks/use-products";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { formatCurrency } from "@/lib/utils/currency";
import toast from "react-hot-toast";

export default function StockAdjustmentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { products, isLoading, adjustStock } = useProducts({ search, isActive: true });
  const getProductByScanner = useProductByScanner();
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"loss" | "inventory_adjustment">("loss");
  const [realQuantity, setRealQuantity] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  const handleSelect = (product: any) => {
    setSelectedProduct(product);
    setRealQuantity(product.stock_quantity); // Default to current stock
  };

  useBarcodeScanner({
    onScan: async (code) => {
      const product = await getProductByScanner(code);
      if (product) {
        handleSelect(product);
        toast.success(`Produit sélectionné : ${product.name}`);
      } else {
        toast.error("Produit introuvable !");
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || realQuantity === "") return;

    // Calculate Delta (Difference between what the computer thinks and what the real count is)
    // If loss: we deduct. If inventory_adjustment: we set to exact count (delta = real - current)
    const currentQty = selectedProduct.stock_quantity;
    const qtyNum = Number(realQuantity);
    
    let delta = 0;
    if (adjustmentType === "inventory_adjustment") {
      delta = qtyNum - currentQty;
    } else {
      // If "loss" was selected, user inputs how much was LOST. So delta is negative.
      delta = -Math.abs(qtyNum);
    }

    if (delta === 0) {
      toast.error("Aucune modification de stock (delta = 0).");
      return;
    }

    try {
      await adjustStock(selectedProduct.id, delta, notes);
      toast.success("Ajustement enregistré avec succès !");
      setSelectedProduct(null);
      setRealQuantity("");
      setNotes("");
      setSearch("");
    } catch {
      toast.error("Erreur lors de l'enregistrement de l'ajustement");
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: "800px", margin: "0 auto", padding: "24px" }}>
      
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Ajustements & Pertes
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Corriger le stock machine après un inventaire physique.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* Step 1: Select Product */}
        <div className="card" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "16px" }}>1. Sélectionner le produit</h2>
          
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Chercher par nom ou code..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "400px", overflowY: "auto" }}>
            {isLoading ? <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Recherche...</p> : null}
            {!isLoading && search && products.length === 0 && (
               <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Aucun résultat.</p>
            )}
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px", background: selectedProduct?.id === p.id ? "var(--color-primary-50)" : "transparent",
                  border: `1px solid ${selectedProduct?.id === p.id ? "var(--color-primary-400)" : "var(--border-color)"}`,
                  borderRadius: "8px", cursor: "pointer", textAlign: "left"
                }}
              >
                <div>
                  <p style={{ fontWeight: "600", fontSize: "14px", color: selectedProduct?.id === p.id ? "var(--color-primary-700)" : "var(--text-primary)" }}>
                    {p.name}
                  </p>
                  {p.sku && <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.sku}</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: p.stock_quantity <= 0 ? "#ef4444" : "var(--text-primary)" }}>
                    {p.stock_quantity} {p.unit}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Stock machine</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Form */}
        <div className="card" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "16px" }}>2. Déclarer l'écart</h2>
          
          {!selectedProduct ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              <Package size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ fontSize: "13px" }}>Veuillez sélectionner un produit à ajuster.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ padding: "12px", background: "var(--bg-muted)", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Stock Machine Actuel :</span>
                <span style={{ fontSize: "14px", fontWeight: "700" }}>{selectedProduct.stock_quantity} {selectedProduct.unit}</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Type d'ajustement
                </label>
                <select className="input" value={adjustmentType} onChange={e => setAdjustmentType(e.target.value as any)}>
                  <option value="inventory_adjustment">Inventaire Physique (Remplacer stock)</option>
                  <option value="loss">Perte / Vol / Casse (Déduire du stock)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  {adjustmentType === "inventory_adjustment" ? "Stock Réel (Compté)" : "Quantité Perdue / Cassée"} *
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required
                  className="input" 
                  value={realQuantity} 
                  onChange={e => setRealQuantity(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Motif / Notes (Optionnel)
                </label>
                <textarea 
                  className="input" 
                  style={{ minHeight: "60px", resize: "none" }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Cassé lors du déchargement..."
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "8px" }}>
                <Save size={16} /> Enregistrer l'Ajustement
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}

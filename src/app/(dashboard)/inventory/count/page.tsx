"use client";

import { useState } from "react";
import { ArrowLeft, Camera, Search, Save, Trash2, ScanBarcode, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProducts, useProductByScanner } from "@/lib/hooks/use-products";
import { useAuthStore } from "@/lib/store/auth.store";
import { getDB } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { enqueueSync } from "@/lib/sync/engine";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { CameraScanner } from "@/components/scanner/camera-scanner";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils/currency";

interface InventoryItem {
  product: any;
  theoreticalStock: number;
  countedStock: number;
  reason?: string;
}

export default function InventoryCountPage() {
  const router = useRouter();
  const getProductByScanner = useProductByScanner();
  const shop = useAuthStore(s => s.currentShop);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Gérer le scan d'un produit (Caméra ou HID)
  const handleScan = async (code: string) => {
    const product = await getProductByScanner(code);
    if (product) {
      if (!product.track_stock) {
         toast.error("Ce produit n'est pas suivi en stock.");
         if (isCameraOpen) setIsCameraOpen(false);
         return;
      }

      // Ajouter ou sélectionner le produit
      setItems(prev => {
        const exists = prev.find(i => i.product.id === product.id);
        if (exists) {
          toast(`${product.name} déjà dans la liste`, { icon: 'ℹ️' });
          return prev;
        }
        return [{
          product,
          theoreticalStock: product.stock_quantity,
          countedStock: product.stock_quantity, // Par défaut
        }, ...prev];
      });

      if (isCameraOpen) setIsCameraOpen(false);
    } else {
      setNotFoundCode(code);
      if (isCameraOpen) setIsCameraOpen(false);
    }
  };

  useBarcodeScanner({
    onScan: handleScan,
    enabled: true,
  });

  const updateCountedStock = (productId: string, qty: number) => {
    setItems(prev => prev.map(item => 
      item.product.id === productId ? { ...item, countedStock: qty } : item
    ));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const handleSave = async () => {
    if (!shop?.id) return;
    if (items.length === 0) return;

    setIsSaving(true);
    try {
      const db = getDB();
      const now = new Date().toISOString();

      for (const item of items) {
        const diff = item.countedStock - item.theoreticalStock;
        if (diff === 0) continue; // Pas d'écart

        const type = (diff > 0 ? "inventory_adjustment" : "loss") as "inventory_adjustment" | "loss";
        
        // Mouvement de stock
        const movement = {
          id: uuid(),
          shop_id: shop.id,
          product_id: item.product.id,
          type,
          quantity: Math.abs(diff),
          reason: `Inventaire par scan`,
          sync_status: "pending" as const,
          created_at: now,
          updated_at: now,
        };

        await db.stockMovements.add(movement);
        await enqueueSync("stockMovements", movement.id, "create", movement);

        // Mise à jour du stock produit
        await db.products.update(item.product.id, {
          stock_quantity: item.countedStock,
          updated_at: now,
          sync_status: "pending"
        });
        const updatedProd = await db.products.get(item.product.id);
        if (updatedProd) await enqueueSync("products", updatedProd.id, "update", updatedProd);
      }

      toast.success("Inventaire enregistré avec succès !");
      router.push("/inventory");
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de l'inventaire.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const differences = items.filter(i => i.countedStock !== i.theoreticalStock);

  return (
    <div className="page-enter" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.back()} className="btn btn-ghost btn-sm">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Mode Inventaire (Scan)</h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Scannez vos produits pour mettre à jour le stock physique</p>
          </div>
        </div>
        <button onClick={() => setIsCameraOpen(true)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Camera size={18} /> Scanner Caméra
        </button>
      </div>

      <div className="card" style={{ padding: "16px", marginBottom: "24px", background: "var(--bg-surface)" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
          <ScanBarcode size={24} style={{ color: "var(--color-primary-600)" }} />
          <p>
            Vous pouvez utiliser une <strong>douchette Bluetooth</strong> ou la <strong>caméra</strong> de l'appareil. Scannez simplement un produit pour l'ajouter à la liste de comptage.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", border: "2px dashed var(--border-color)", borderRadius: "12px" }}>
          <ScanBarcode size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
          <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>En attente de scan...</p>
          <p style={{ fontSize: "14px", marginTop: "8px" }}>Scannez le premier produit pour démarrer l'inventaire.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-muted)", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontSize: "12px" }}>Produit</th>
                <th style={{ padding: "12px 16px", fontSize: "12px", textAlign: "right" }}>Stock Théorique</th>
                <th style={{ padding: "12px 16px", fontSize: "12px", textAlign: "center" }}>Comptage Physique</th>
                <th style={{ padding: "12px 16px", fontSize: "12px", textAlign: "center" }}>Écart</th>
                <th style={{ padding: "12px 16px", fontSize: "12px" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const diff = item.countedStock - item.theoreticalStock;
                return (
                  <tr key={item.product.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "14px" }}>{item.product.name}</p>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.product.barcode || item.product.sku}</p>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px" }}>
                      {item.theoreticalStock} {item.product.unit}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <input 
                        type="number" 
                        className="input" 
                        style={{ width: "100px", textAlign: "center", margin: "0 auto" }}
                        value={Number.isNaN(item.countedStock) ? "" : item.countedStock}
                        onChange={(e) => updateCountedStock(item.product.id, parseFloat(e.target.value))}
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600" }}>
                      {diff === 0 ? (
                        <span style={{ color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                          <CheckCircle2 size={14} /> OK
                        </span>
                      ) : diff > 0 ? (
                        <span style={{ color: "#3b82f6" }}>+{diff}</span>
                      ) : (
                        <span style={{ color: "#ef4444" }}>{diff}</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button onClick={() => removeItem(item.product.id)} className="btn btn-ghost btn-sm" style={{ color: "#ef4444" }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "16px", background: "var(--bg-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              <strong>{items.length}</strong> produit(s) scanné(s) - <strong>{differences.length}</strong> écart(s) détecté(s).
            </p>
            <button onClick={handleSave} disabled={isSaving || items.length === 0} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Save size={16} /> 
              {isSaving ? "Enregistrement..." : "Valider l'Inventaire"}
            </button>
          </div>
        </div>
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
              <a href={`/products/new?barcode=${notFoundCode}`} target="_blank" className="btn btn-primary">Ajouter le produit</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

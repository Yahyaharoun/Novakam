"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Package, X, Barcode, Scale, Tags, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { LocalProduct } from "@/lib/db/schema";
import type { LocalCategory } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils/currency";

// ── Validation schema ──────────────────────────────────
const productSchema = z.object({
  name: z.string().min(1, "Nom requis").max(500),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  category_id: z.string().optional(),
  description: z.string().optional(),
  purchase_price: z.coerce.number().min(0, "Prix d'achat invalide"),
  selling_price: z.coerce.number().min(1, "Prix de vente requis"),
  min_price: z.coerce.number().min(0).optional(),
  stock_quantity: z.coerce.number().min(0),
  min_stock: z.coerce.number().min(0),
  unit: z.string().min(1, "Unité requise"),
  is_weighable: z.boolean(),
  track_stock: z.boolean(),
  allow_negative: z.boolean(),
  is_active: z.boolean(),
  has_variants: z.boolean(),
  has_batches: z.boolean(),
  // For UI only
  variants: z.array(z.object({
    name: z.string().min(1),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    purchase_price: z.coerce.number().optional(),
    selling_price: z.coerce.number().optional(),
    stock_quantity: z.coerce.number().min(0),
  })).optional(),
  batches: z.array(z.object({
    batch_number: z.string().min(1),
    expiry_date: z.string().optional(),
    stock_quantity: z.coerce.number().min(0),
  })).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: LocalProduct;
  categories: LocalCategory[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

const UNITS = ["pcs", "carton", "paquet", "bouteille", "kg", "g", "L", "mL", "m", "cm", "autre"];
const MARGIN_COLORS = (margin: number) =>
  margin < 0 ? "#ef4444" : margin < 15 ? "#f59e0b" : "#10b981";

export function ProductForm({ product, categories, onSubmit, onCancel }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      category_id: product?.category_id ?? "",
      description: product?.description ?? "",
      purchase_price: product?.purchase_price ?? 0,
      selling_price: product?.selling_price ?? 0,
      min_price: product?.min_price ?? undefined,
      stock_quantity: product?.stock_quantity ?? 0,
      min_stock: product?.min_stock ?? 0,
      unit: product?.unit ?? "pcs",
      is_weighable: product?.is_weighable ?? false,
      track_stock: product?.track_stock ?? true,
      allow_negative: product?.allow_negative ?? false,
      is_active: product?.is_active ?? true,
      has_variants: product?.has_variants ?? false,
      has_batches: product?.has_batches ?? false,
      variants: [],
      batches: [],
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: "variants"
  });

  const { fields: batchFields, append: appendBatch, remove: removeBatch } = useFieldArray({
    control,
    name: "batches"
  });

  const purchasePrice = watch("purchase_price") || 0;
  const sellingPrice  = watch("selling_price") || 0;
  const trackStock    = watch("track_stock");
  const hasVariants   = watch("has_variants");
  const hasBatches    = watch("has_batches");

  const margin = sellingPrice > 0
    ? Math.round(((sellingPrice - purchasePrice) / sellingPrice) * 100)
    : 0;

  async function onFormSubmit(data: ProductFormData) {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle = (error?: unknown) => cn(
    "input",
    error ? "input-error" : ""
  );

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div style={{ display: "grid", gap: "24px" }}>

        {/* ── Section Informations Générales ── */}
        <section className="card" style={{ padding: "24px", borderTop: "4px solid var(--color-primary-600)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Package size={18} style={{ color: "var(--color-primary-600)" }} />
            Informations Générales
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Nom du produit *</label>
              <input {...register("name")} className={inputStyle(errors.name)} placeholder="Ex: Riz Parfumé Oncle Ben's" />
              {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description (optionnelle)</label>
              <textarea
                {...register("description")}
                className="input"
                style={{ resize: "vertical", minHeight: "80px" }}
                placeholder="Détails du produit..."
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Catégorie</label>
                <a href="/categories" style={{ fontSize: "12px", color: "var(--color-primary-600)", fontWeight: 500, textDecoration: "none" }}>Gérer</a>
              </div>
              <select {...register("category_id")} className="input">
                <option value="">— Sélectionner une catégorie —</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {categories.length === 0 && (
                <p style={{ fontSize: "11px", color: "var(--text-warning)", marginTop: "4px" }}>Aucune catégorie. Créez-en une dans le menu Catégories.</p>
              )}
            </div>

            <div>
              <label style={labelStyle}>Unité de mesure *</label>
              <select {...register("unit")} className={inputStyle(errors.unit)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            
            <div style={{ gridColumn: "1 / -1", background: "var(--bg-muted)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>
                <input type="checkbox" {...register("is_weighable")} style={{ width: "18px", height: "18px", accentColor: "var(--color-primary-600)" }} />
                <Scale size={18} style={{ color: "var(--text-secondary)" }} />
                Produit à pesée (Vendu au poids ex: Viande, Riz en vrac)
              </label>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px", marginLeft: "30px" }}>
                Active la prise en charge des balances ou la décimalisation au point de vente.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section Identifiants ── */}
        <section className="card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Barcode size={18} style={{ color: "var(--text-secondary)" }} />
            Identifiants & Codes
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Référence Interne (Automatique)</label>
              <input 
                disabled 
                value={product?.internal_reference || "Générée automatiquement à la création"} 
                className="input" 
                style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}
              />
            </div>

            <div>
              <label style={labelStyle}>Référence Fournisseur (SKU)</label>
              <input {...register("sku")} className="input" placeholder="Optionnel" />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Code-barres Fabricant (Optionnel)</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <input {...register("barcode")} className="input" placeholder="Scanner ou taper le code-barres..." style={{ flex: 1 }} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                Si vide, vous pourrez imprimer et utiliser le QR Code interne NOVAKAM.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section Prix ── */}
        <section className="card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Tags size={18} style={{ color: "var(--text-secondary)" }} />
            Tarification
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Coût d&apos;achat</label>
              <input
                {...register("purchase_price")}
                type="number"
                min="0"
                className={inputStyle(errors.purchase_price)}
                placeholder="0"
              />
              {errors.purchase_price && <p style={errorStyle}>{errors.purchase_price.message}</p>}
            </div>

            <div>
              <label style={labelStyle}>Prix de vente final *</label>
              <input
                {...register("selling_price")}
                type="number"
                min="0"
                className={inputStyle(errors.selling_price)}
                placeholder="0"
              />
              {errors.selling_price && <p style={errorStyle}>{errors.selling_price.message}</p>}
            </div>

            <div>
              <label style={labelStyle}>Prix minimum autorisé</label>
              <input
                {...register("min_price")}
                type="number"
                min="0"
                className="input"
                placeholder="Optionnel"
              />
            </div>
          </div>

          {/* Indicateur marge */}
          {sellingPrice > 0 && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "8px",
                background: `${MARGIN_COLORS(margin)}15`,
                border: `1px solid ${MARGIN_COLORS(margin)}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Marge Brute Estimée</span>
                <span style={{ fontSize: "18px", fontWeight: "700", color: MARGIN_COLORS(margin) }}>
                  {margin}%
                </span>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Bénéfice par unité</span>
                <span style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {formatCurrency(sellingPrice - purchasePrice)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ── Section Stock ── */}
        <section className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckSquare size={18} style={{ color: "var(--text-secondary)" }} />
              Gestion des Stocks & Visibilité
            </h3>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
              <input type="checkbox" {...register("track_stock")} style={{ width: "16px", height: "16px", accentColor: "var(--color-primary-600)" }} />
              Suivre l'inventaire
            </label>
          </div>

          {trackStock && !hasVariants && !hasBatches && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: "16px", background: "var(--bg-muted)", borderRadius: "8px", marginBottom: "20px" }}>
              <div>
                <label style={labelStyle}>Stock Actuel</label>
                <input
                  {...register("stock_quantity")}
                  type="number"
                  min="0"
                  step="0.001"
                  className="input"
                />
              </div>
              <div>
                <label style={labelStyle}>Alerte Stock Bas (Seuil min)</label>
                <input
                  {...register("min_stock")}
                  type="number"
                  min="0"
                  step="0.001"
                  className="input"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}>
                  <input type="checkbox" {...register("allow_negative")} style={{ accentColor: "var(--color-primary-600)" }} />
                  Autoriser la vente même si le stock est épuisé (Stock Négatif)
                </label>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: "var(--text-primary)" }}>
              <input type="checkbox" {...register("is_active")} style={{ width: "16px", height: "16px", accentColor: "var(--color-primary-600)" }} />
              Produit Actif (Visible et vendable en point de vente)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: "var(--text-primary)" }}>
              <input type="checkbox" {...register("has_variants")} style={{ width: "16px", height: "16px", accentColor: "var(--color-primary-600)" }} />
              Ce produit possède des variantes (Ex: Couleurs, Tailles)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: "var(--text-primary)" }}>
              <input type="checkbox" {...register("has_batches")} style={{ width: "16px", height: "16px", accentColor: "var(--color-primary-600)" }} />
              Gérer par Lots / Dates de péremption
            </label>
          </div>
        </section>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "10px" }}>
          <button type="button" onClick={onCancel} className="btn btn-ghost" style={{ padding: "0 24px" }}>
            Annuler
          </button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: "0 32px", height: "48px" }}>
            {isSubmitting ? (
              <><Loader2 size={18} style={{ animation: "spin 1s linear infinite", marginRight: "8px" }} /> Enregistrement...</>
            ) : (
              <>{product ? "Mettre à jour le produit" : "Enregistrer le produit"}</>
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "var(--text-secondary)",
  marginBottom: "8px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const errorStyle: React.CSSProperties = {
  color: "#ef4444",
  fontSize: "12px",
  marginTop: "6px",
  fontWeight: 500
};

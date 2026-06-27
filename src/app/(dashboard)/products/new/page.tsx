"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductForm, type ProductFormData } from "@/components/products/product-form";
import { useProducts } from "@/lib/hooks/use-products";
import { useCategories } from "@/lib/hooks/use-categories";
import { useAuthStore } from "@/lib/store/auth.store";
import toast from "react-hot-toast";
import { useRBAC } from "@/lib/rbac/hooks";
import { PLAN_LIMITS } from "@/lib/rbac/subscription-limits";

export default function NewProductPage() {
  const router = useRouter();
  const shop = useAuthStore((s) => s.currentShop);
  const { createProduct } = useProducts();
  const { categories } = useCategories();
  const { plan } = useRBAC();
  const limits = PLAN_LIMITS[plan];
  const { products } = useProducts({ isActive: true });

  async function handleSubmit(data: ProductFormData) {
    if (!shop?.id) return;
    if (limits.max_products !== -1 && products.length >= limits.max_products) {
      toast.error(`Limite d'abonnement atteinte (${limits.max_products} produits max)`);
      return;
    }
    try {
      await createProduct({
        shop_id: shop.id,
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
        unit: data.unit || "unité",
        is_weighable: false,
        is_active: data.is_active,
        track_stock: data.track_stock,
        allow_negative: data.allow_negative,
        has_variants: data.has_variants,
        has_batches: data.has_batches,
        image_url: undefined,
      }, data.variants, data.batches);
      toast.success("Produit créé avec succès !");
      router.push("/products");
    } catch {
      toast.error("Erreur lors de la création du produit");
    }
  }

  return (
    <div className="page-enter" style={{ maxWidth: "760px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Nouveau produit
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Les modifications sont sauvegardées localement et synchronisées automatiquement
          </p>
        </div>
      </div>

      <ProductForm
        categories={categories}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/products")}
      />
    </div>
  );
}

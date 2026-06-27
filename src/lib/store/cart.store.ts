// src/lib/store/cart.store.ts
import { create } from "zustand";
import type { LocalProduct, LocalProductVariant, LocalProductBatch } from "@/lib/db/schema";

export interface CartItem {
  product_id: string;
  product_name: string;
  product_image?: string | null;
  product_sku?: string;
  variant_id?: string;
  batch_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  discount: number;        
  discountType: "percentage" | "fixed";
  total_price: number;
}

export interface PaymentSplit {
  method: string;
  amount: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  discountGlobal: number; 
  discountGlobalType: "percentage" | "fixed";
  note: string;
  payments: PaymentSplit[];

  // Computed
  subtotal: number;
  discountAmount: number;
  total: number;

  // Actions
  addItem: (product: LocalProduct, qty?: number, variant?: LocalProductVariant, batch?: LocalProductBatch) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
  updateDiscount: (productId: string, discount: number, discountType: "percentage" | "fixed", variantId?: string) => void;
  setCustomer: (id: string | null) => void;
  setGlobalDiscount: (value: number, type: "percentage" | "fixed") => void;
  setNote: (note: string) => void;
  setPayments: (payments: PaymentSplit[]) => void;
  clear: () => void;
}

function computeItemTotal(price: number, qty: number, discount: number, type: "percentage" | "fixed") {
  const base = price * qty;
  const discountAmt = type === "percentage" ? Math.round(base * (discount / 100)) : discount;
  return Math.max(0, base - discountAmt);
}

function computeTotals(items: CartItem[], discountGlobal: number, discountGlobalType: "percentage" | "fixed") {
  const subtotal = items.reduce((s, i) => s + i.total_price, 0);
  const discountAmount = discountGlobalType === "percentage" 
    ? Math.round(subtotal * (discountGlobal / 100))
    : discountGlobal;
  const total = Math.max(0, subtotal - discountAmount);
  return { subtotal, discountAmount, total };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  discountGlobal: 0,
  discountGlobalType: "percentage",
  note: "",
  payments: [],
  subtotal: 0,
  discountAmount: 0,
  total: 0,

  addItem: (product, qty = 1, variant, batch) => {
    const { items, discountGlobal, discountGlobalType } = get();
    const existing = items.find((i) => i.product_id === product.id && i.variant_id === variant?.id);

    let newItems: CartItem[];
    if (existing) {
      newItems = items.map((i) =>
        i.product_id === product.id && i.variant_id === variant?.id
          ? {
              ...i,
              quantity: i.quantity + qty,
              total_price: computeItemTotal(i.unit_price, i.quantity + qty, i.discount, i.discountType),
            }
          : i
      );
    } else {
      const sellingPrice = variant?.selling_price ?? product.selling_price;
      const purchasePrice = variant?.purchase_price ?? product.purchase_price;
      
      const item: CartItem = {
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        product_sku: variant?.sku ?? product.sku ?? undefined,
        variant_id: variant?.id,
        variant_name: variant?.name,
        batch_id: batch?.id,
        quantity: qty,
        unit_price: sellingPrice,
        purchase_price: purchasePrice,
        discount: 0,
        discountType: "percentage",
        total_price: sellingPrice * qty,
      };
      newItems = [...items, item];
    }
    set({ items: newItems, ...computeTotals(newItems, discountGlobal, discountGlobalType) });
  },

  removeItem: (productId, variantId) => {
    const { discountGlobal, discountGlobalType } = get();
    const newItems = get().items.filter((i) => !(i.product_id === productId && i.variant_id === variantId));
    set({ items: newItems, ...computeTotals(newItems, discountGlobal, discountGlobalType) });
  },

  updateQty: (productId, qty, variantId) => {
    if (qty <= 0) { get().removeItem(productId, variantId); return; }
    const { discountGlobal, discountGlobalType } = get();
    const newItems = get().items.map((i) =>
      i.product_id === productId && i.variant_id === variantId
        ? { ...i, quantity: qty, total_price: computeItemTotal(i.unit_price, qty, i.discount, i.discountType) }
        : i
    );
    set({ items: newItems, ...computeTotals(newItems, discountGlobal, discountGlobalType) });
  },

  updateDiscount: (productId, discount, discountType, variantId) => {
    const { discountGlobal, discountGlobalType } = get();
    const newItems = get().items.map((i) =>
      i.product_id === productId && i.variant_id === variantId
        ? { ...i, discount, discountType, total_price: computeItemTotal(i.unit_price, i.quantity, discount, discountType) }
        : i
    );
    set({ items: newItems, ...computeTotals(newItems, discountGlobal, discountGlobalType) });
  },

  setCustomer: (id) => set({ customerId: id }),

  setGlobalDiscount: (discountGlobal, discountGlobalType) => {
    const { items } = get();
    set({ discountGlobal, discountGlobalType, ...computeTotals(items, discountGlobal, discountGlobalType) });
  },

  setNote: (note) => set({ note }),
  setPayments: (payments) => set({ payments }),

  clear: () => set({
    items: [], customerId: null, discountGlobal: 0, discountGlobalType: "percentage",
    note: "", payments: [], subtotal: 0, discountAmount: 0, total: 0,
  }),
}));

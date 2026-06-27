// src/components/products/stock-badge.tsx
"use client";
import type { LocalProduct } from "@/lib/db/schema";

interface StockBadgeProps {
  product: LocalProduct;
  showQty?: boolean;
}

export function StockBadge({ product, showQty = true }: StockBadgeProps) {
  if (!product.track_stock) {
    return (
      <span className="badge badge-gray">
        <span>∞</span>
        {showQty && <span>Illimité</span>}
      </span>
    );
  }

  const isOut = product.stock_quantity <= 0;
  const isLow = !isOut && product.stock_quantity <= product.min_stock;

  if (isOut) {
    return (
      <span className="badge badge-red">
        <span>●</span>
        {showQty && <span>Rupture</span>}
      </span>
    );
  }
  if (isLow) {
    return (
      <span className="badge badge-yellow">
        <span>▲</span>
        {showQty && (
          <span>
            {product.stock_quantity} {product.unit}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="badge badge-green">
      <span>●</span>
      {showQty && (
        <span>
          {product.stock_quantity} {product.unit}
        </span>
      )}
    </span>
  );
}

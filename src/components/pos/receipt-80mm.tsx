// src/components/pos/receipt-80mm.tsx
"use client";

import { forwardRef } from "react";
import { formatCurrency } from "@/lib/utils/currency";
import type { CartItem } from "@/lib/store/cart.store";
import { useI18nStore } from "@/lib/store/i18n.store";

export interface ReceiptProps {
  saleNumber: string;
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  cashierName?: string;
  customerName?: string;
  date: string;
}

export const Receipt80mm = forwardRef<HTMLDivElement, ReceiptProps>(
  (
    {
      saleNumber,
      shopName,
      shopAddress,
      shopPhone,
      items,
      subtotal,
      discountAmount,
      total,
      paidAmount,
      changeAmount,
      paymentMethod,
      cashierName,
      customerName,
      date,
    },
    ref
  ) => {
    const { t, language } = useI18nStore();
    return (
      <div ref={ref} className="receipt-container">
        <style dangerouslySetInnerHTML={{ __html: `
          .receipt-container {
            display: none;
          }
          @media print {
            body * {
              visibility: hidden;
            }
            .receipt-container, .receipt-container * {
              visibility: visible;
            }
            .receipt-container {
              display: block;
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              padding: 5mm;
              margin: 0;
              font-family: monospace;
              font-size: 12px;
              color: black;
              background: white;
            }
            @page {
              margin: 0;
            }
          }
        `}} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <h2 style={{ fontSize: "18px", margin: "0 0 5px 0" }}>{shopName}</h2>
          {shopAddress && <p style={{ margin: "2px 0" }}>{shopAddress}</p>}
          {shopPhone && <p style={{ margin: "2px 0" }}>Tel: {shopPhone}</p>}
        </div>

        {/* Meta */}
        <div style={{ borderBottom: "1px dashed black", paddingBottom: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("pos.receipt_ticket") || "Ticket:"}</span>
            <span>{saleNumber}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("pos.receipt_date") || "Date:"}</span>
            <span>{new Date(date).toLocaleString(language === 'fr' ? "fr-CM" : "en-US")}</span>
          </div>
          {cashierName && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{t("pos.receipt_cashier") || "Caisse:"}</span>
              <span>{cashierName}</span>
            </div>
          )}
          {customerName && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{t("pos.receipt_customer") || "Client:"}</span>
              <span>{customerName}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <table style={{ width: "100%", marginBottom: "10px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px dashed black" }}>
              <th style={{ textAlign: "left", paddingBottom: "5px" }}>{t("pos.receipt_qty") || "Qté x Article"}</th>
              <th style={{ textAlign: "right", paddingBottom: "5px" }}>{t("pos.receipt_total") || "Total"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ paddingTop: "5px", paddingBottom: "5px" }}>
                  <div>{item.product_name}</div>
                  <div style={{ fontSize: "10px", color: "#444" }}>
                    {item.quantity} x {formatCurrency(item.unit_price)}
                    {item.discount > 0 ? ` (-${item.discount}%)` : ""}
                  </div>
                </td>
                <td style={{ textAlign: "right", verticalAlign: "top", paddingTop: "5px" }}>
                  {formatCurrency(item.total_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ borderTop: "1px dashed black", paddingTop: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span>{t("pos.receipt_subtotal") || "Sous-total:"}</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span>{t("pos.receipt_discount") || "Remise:"}</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "bold", margin: "5px 0" }}>
            <span>{t("pos.receipt_total_upper") || "TOTAL:"}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payment */}
        <div style={{ borderTop: "1px dashed black", paddingTop: "10px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span>{t("pos.receipt_payment") || "Paiement"} ({paymentMethod}):</span>
            <span>{formatCurrency(paidAmount)}</span>
          </div>
          {changeAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span>{t("pos.receipt_change") || "Monnaie rendue:"}</span>
              <span>{formatCurrency(changeAmount)}</span>
            </div>
          )}
          {paidAmount < total && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontWeight: "bold" }}>
              <span>{t("pos.receipt_credit") || "Reste à payer (Crédit):"}</span>
              <span>{formatCurrency(total - paidAmount)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: "10px" }}>
          <p style={{ margin: "2px 0" }}>{t("pos.receipt_thanks") || "Merci de votre visite !"}</p>
          <p style={{ margin: "2px 0" }}>{t("pos.receipt_powered") || "Propulsé par NOVAKAM"}</p>
        </div>
      </div>
    );
  }
);

Receipt80mm.displayName = "Receipt80mm";

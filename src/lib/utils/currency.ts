// src/lib/utils/currency.ts

/**
 * Formats a number as FCFA (XAF) currency
 * e.g. 1500000 → "1 500 000 FCFA"
 */
export function formatCurrency(
  amount: number,
  currency: string = "XAF",
  locale: string = "fr-CM"
): string {
  if (currency === "XAF" || currency === "FCFA") {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA";
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Compact currency for small spaces
 * e.g. 1500000 → "1,5M FCFA"
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(".0", "")}M FCFA`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k FCFA`;
  }
  return formatCurrency(amount);
}

/**
 * Parse string input to number (handles spaces and commas)
 */
export function parseCurrencyInput(value: string): number {
  return parseFloat(value.replace(/\s/g, "").replace(",", ".")) || 0;
}

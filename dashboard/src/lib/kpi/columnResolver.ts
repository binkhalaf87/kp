import { normalizeColumnName } from "@/lib/parsers/reportSchemas";
import type { ParsedRow } from "@/lib/types";

/** Best-effort column name hints, same caveat as reportSchemas.ts: refine once real files are seen. */
export const COLUMN_HINTS = {
  product: ["المنتج", "اسم المنتج", "الصنف", "product", "item"],
  quantity: ["الكمية", "quantity", "qty"],
  lineTotal: ["الإجمالي شامل", "الإجمالي", "المبيعات", "المبلغ", "total", "sales", "amount", "net"],
  vat: ["الضريبة", "ضريبة القيمة", "vat", "tax"],
  date: ["التاريخ", "date"],
  time: ["الوقت", "time"],
  cashier: ["الكاشير", "المستخدم", "الموظف", "cashier", "user", "employee"],
  paymentMethod: ["طريقة الدفع", "payment method", "payment"],
  invoiceNumber: ["رقم الفاتورة", "invoice", "فاتورة"],
  category: ["الفئة", "category"],
  customer: ["العميل", "customer"],
  returnedQuantity: ["الكمية المرتجعة", "مرتجع", "returned", "return"],
} as const;

export type ColumnHintKey = keyof typeof COLUMN_HINTS;

/** Finds the actual column name in `columns` that best matches a hint group. */
export function resolveColumn(columns: string[], hintKey: ColumnHintKey): string | null {
  const hints = COLUMN_HINTS[hintKey].map(normalizeColumnName);
  for (const col of columns) {
    const normalized = normalizeColumnName(col);
    if (hints.some((h) => normalized.includes(h))) return col;
  }
  return null;
}

export function toNumber(value: ParsedRow[string]): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(n) ? null : n;
}

export function toText(value: ParsedRow[string]): string | null {
  if (value === null || value === undefined) return null;
  return String(value).trim() || null;
}

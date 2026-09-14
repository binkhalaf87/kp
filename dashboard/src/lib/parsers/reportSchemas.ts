import type { ReportType } from "@/lib/types";

export function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

/**
 * Column signatures confirmed against real Rewaa CSV exports (not guessed).
 * Every Rewaa "detail" report we've seen so far is actually a single-row
 * AGGREGATE — there is no per-invoice line-item export with date/time/
 * cashier/payment-method per row. Only "منتجات العملاء" (customer products)
 * has row-level granularity, and even that has no price/revenue column.
 *
 * Each schema below is identified by a `signature` — one or more columns
 * that, combined, uniquely identify that report among the others (checked
 * in the order they appear in REPORT_SCHEMAS, most specific first).
 * SALES_BY_PAYMENT_METHOD and SALES_BY_PERIOD have not been confirmed
 * against a real file yet, so they keep looser, lower-confidence hints.
 */
export interface ReportSchemaDef {
  reportType: ReportType;
  labelAr: string;
  /** All of these substrings must appear in some column for a confident (0.95) match. */
  signature: string[];
  /** Fallback fuzzy hint groups, used only if no schema's signature matches. */
  hintGroups: string[][];
}

export const REPORT_SCHEMAS: ReportSchemaDef[] = [
  {
    // Confirmed real headers: اسم العميل, رقم هاتف العميل, اسم المنتج,
    // الرقم التعريفي, الكمية, معلومات تتبع المنتج
    reportType: "CUSTOMER_PRODUCTS",
    labelAr: "منتجات العملاء",
    signature: ["اسم المنتج", "اسم العميل"],
    hintGroups: [["العميل", "customer"], ["المنتج", "product"], ["الكمية", "quantity"]],
  },
  {
    // Confirmed real headers: اسم العميل, رقم هاتف العميل, الموقع, المبيعات,
    // تكلفة البضاعة المباعة, قيمة الربح, المبيعات (شامل الضريبة),
    // الكمية المباعة, الكمية المرتجعة — same shape as SALES_BY_USER but
    // keyed by customer+phone instead of user/role.
    reportType: "SALES_BY_CUSTOMER",
    labelAr: "المبيعات حسب العملاء",
    signature: ["اسم العميل", "رقم هاتف العميل"],
    hintGroups: [["العميل", "customer"], ["المبيعات", "sales"]],
  },
  {
    // Confirmed real headers: المستخدم / الوظيفة, الموقع, المبيعات,
    // تكلفة البضاعة المباعة, قيمة الربح, المبيعات (شاملة الضريبة),
    // الكمية المباعة, الكمية المرتجعة
    reportType: "SALES_BY_USER",
    labelAr: "المبيعات حسب المستخدمين",
    signature: ["المستخدم"],
    hintGroups: [["المستخدم", "الكاشير", "user", "cashier"], ["المبيعات", "sales"]],
  },
  {
    // Confirmed real headers: إجمالي المبيعات, إجمالي الفئات,
    // متوسط مبيعات الفئات, إجمالي المبيعات (شاملة الضريبة),
    // إجمالي الكميات المباعة, إجمالي الكميات المرتجعة,
    // إجمالي تكلفة البضاعة المباعة, إجمالي قيمة الربح
    // Single aggregate row — only tells you the category COUNT, not a
    // per-category breakdown.
    reportType: "SALES_BY_CATEGORY",
    labelAr: "ملخص المبيعات بحسب الفئة",
    signature: ["اجمالي الفئات"],
    hintGroups: [["الفئة", "category"], ["المبيعات", "sales"]],
  },
  {
    // Confirmed real headers: إجمالي المبيعات, إجمالي الفواتير,
    // متوسط مبيعات الفواتير, المبيعات (شاملة الضريبة),
    // إجمالي تكلفة البضاعة المباعة, إجمالي قيمة الربح,
    // إجمالي الكميات المباعة, إجمالي الكميات المرتجعة,
    // ضريبة المبيعات %15, ضريبة المبيعات %100, الضرائب الأخرى, إجمالي الضريبة
    // Also a single aggregate row (total invoice count + totals), not
    // itemized per invoice despite the report's name.
    reportType: "SALES_BY_INVOICE",
    labelAr: "تقرير المبيعات من كل فاتورة (ملخص إجمالي)",
    signature: ["اجمالي الفواتير"],
    hintGroups: [["الفاتورة", "invoice"], ["المبيعات", "sales"]],
  },
  {
    // Not yet confirmed against a real file — placeholder hints only.
    reportType: "SALES_BY_PAYMENT_METHOD",
    labelAr: "المبيعات من طرق الدفع",
    signature: ["طريقه الدفع"],
    hintGroups: [["طريقة الدفع", "payment method", "payment"], ["المبلغ", "المبيعات", "amount", "sales"]],
  },
  {
    // Not yet confirmed against a real file — placeholder hints only.
    reportType: "SALES_BY_PERIOD",
    labelAr: "ملخص المبيعات حسب الفترة الزمنية",
    signature: [],
    hintGroups: [["الفترة", "التاريخ", "period", "date"], ["المبيعات", "sales"]],
  },
];

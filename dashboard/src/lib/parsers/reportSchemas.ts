import type { ReportType } from "@/lib/types";

/**
 * Column-name heuristics used to detect which known Rewaa report a file
 * represents. Each report type has a list of "hint groups" — each group is a
 * set of alternative keywords (Arabic/English) that would appear in a column
 * name for that concept. A report type "matches" a hint group if ANY column
 * in the file contains ANY keyword from that group (case-insensitive,
 * whitespace-normalized substring match).
 *
 * IMPORTANT: these hints are best-effort placeholders based on the report
 * names and product/field vocabulary described for this project. They have
 * NOT been verified against real Rewaa export files yet. Until real sample
 * files are supplied, low-confidence matches are surfaced to the user as
 * "يحتاج مراجعة" rather than silently assumed — see detectReportType.ts.
 * Once real files are available, replace/extend the keyword lists below to
 * match the exact column headers.
 */
export interface ReportSchemaDef {
  reportType: ReportType;
  labelAr: string;
  hintGroups: string[][];
}

export const REPORT_SCHEMAS: ReportSchemaDef[] = [
  {
    reportType: "SALES_BY_CATEGORY",
    labelAr: "ملخص المبيعات بحسب الفئة",
    hintGroups: [
      ["الفئة", "category"],
      ["الكمية", "quantity", "qty"],
      ["المبيعات", "الإجمالي", "sales", "total", "net"],
    ],
  },
  {
    reportType: "SALES_BY_INVOICE",
    labelAr: "تقرير المبيعات من كل فاتورة",
    hintGroups: [
      ["رقم الفاتورة", "invoice", "فاتورة"],
      ["المنتج", "product", "item", "صنف"],
      ["الكمية", "quantity", "qty"],
      ["التاريخ", "date"],
    ],
  },
  {
    reportType: "SALES_BY_USER",
    labelAr: "المبيعات حسب المستخدمين",
    hintGroups: [
      ["المستخدم", "الكاشير", "user", "cashier", "employee", "الموظف"],
      ["المبيعات", "الإجمالي", "sales", "total"],
    ],
  },
  {
    reportType: "SALES_BY_CUSTOMER",
    labelAr: "المبيعات حسب العملاء",
    hintGroups: [
      ["العميل", "customer", "client"],
      ["المبيعات", "الإجمالي", "sales", "total"],
    ],
  },
  {
    reportType: "CUSTOMER_PRODUCTS",
    labelAr: "منتجات العملاء",
    hintGroups: [
      ["العميل", "customer"],
      ["المنتج", "product", "item"],
      ["الكمية", "quantity", "qty"],
    ],
  },
  {
    reportType: "SALES_BY_PAYMENT_METHOD",
    labelAr: "المبيعات من طرق الدفع",
    hintGroups: [
      ["طريقة الدفع", "payment method", "payment", "الدفع"],
      ["المبلغ", "المبيعات", "amount", "total", "sales"],
    ],
  },
  {
    reportType: "SALES_BY_PERIOD",
    labelAr: "ملخص المبيعات حسب الفترة الزمنية",
    hintGroups: [
      ["الفترة", "التاريخ", "period", "date", "day", "month", "يوم", "شهر"],
      ["المبيعات", "الإجمالي", "sales", "total"],
    ],
  },
];

export function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

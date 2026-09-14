// Core domain types for the Kids Planet KPI dashboard.
// This project is fully independent of any other project's data, branding, or infrastructure.

export type ReportType =
  | "SALES_BY_CATEGORY" // ملخص المبيعات بحسب الفئة
  | "SALES_BY_INVOICE" // تقرير المبيعات من كل فاتورة
  | "SALES_BY_USER" // المبيعات حسب المستخدمين
  | "SALES_BY_CUSTOMER" // المبيعات حسب العملاء
  | "CUSTOMER_PRODUCTS" // منتجات العملاء
  | "SALES_BY_PAYMENT_METHOD" // المبيعات من طرق الدفع
  | "SALES_BY_PERIOD" // ملخص المبيعات حسب الفترة الزمنية
  | "UNKNOWN";

export const REPORT_TYPE_LABELS_AR: Record<ReportType, string> = {
  SALES_BY_CATEGORY: "ملخص المبيعات بحسب الفئة",
  SALES_BY_INVOICE: "تقرير المبيعات من كل فاتورة",
  SALES_BY_USER: "المبيعات حسب المستخدمين",
  SALES_BY_CUSTOMER: "المبيعات حسب العملاء",
  CUSTOMER_PRODUCTS: "منتجات العملاء",
  SALES_BY_PAYMENT_METHOD: "المبيعات من طرق الدفع",
  SALES_BY_PERIOD: "ملخص المبيعات حسب الفترة الزمنية",
  UNKNOWN: "غير معروف",
};

export type FileStatus =
  | "RECOGNIZED" // تم التعرف عليه
  | "NEEDS_REVIEW" // يحتاج مراجعة
  | "UNSUPPORTED" // ملف غير مدعوم
  | "DUPLICATE"; // بيانات مكررة

export interface ParsedRow {
  [column: string]: string | number | null;
}

export interface DetectionResult {
  reportType: ReportType;
  confidence: number; // 0..1
  matchedHints: string[];
  missingHints: string[];
}

export interface ImportedFile {
  id: string;
  fileName: string;
  fileHash: string;
  importedAt: string; // ISO timestamp
  reportType: ReportType;
  confidence: number;
  status: FileStatus;
  rowCount: number;
  columns: string[];
  periodStart: string | null; // ISO date if detectable
  periodEnd: string | null;
  rows: ParsedRow[];
}

export type ProductCategory =
  | "TICKET"
  | "CAFE"
  | "FACE_PAINTING"
  | "TOY"
  | "ACTIVITY"
  | "MEMBERSHIP"
  | "SECOND_VISIT"
  | "OTHER";

export const PRODUCT_CATEGORY_LABELS_AR: Record<ProductCategory, string> = {
  TICKET: "تذكرة دخول",
  CAFE: "كافيه",
  FACE_PAINTING: "رسم على الوجه",
  TOY: "ألعاب",
  ACTIVITY: "فعالية",
  MEMBERSHIP: "اشتراك",
  SECOND_VISIT: "زيارة ثانية",
  OTHER: "أخرى",
};

export interface ProductMapping {
  productName: string;
  detectedCategory: ProductCategory;
  manualCategory: ProductCategory | null;
  countsAsChildEntry: boolean;
  countsAsSecondVisit: boolean;
  department: string;
  confidence: number; // 0..1, how sure the auto-classifier is
  needsReview: boolean;
  // Rewaa's per-customer product export gives quantity but no price/revenue
  // per line. Entering a unit price here is what unlocks revenue-based KPIs
  // (ticket/cafe revenue, revenue per child) for that product; until set,
  // those metrics stay "unavailable" rather than guessed.
  unitPrice: number | null;
}

export interface CashierMapping {
  cashierName: string;
  department: string; // e.g. "Cafe", "Tickets/Reception", "Other"
}

export type ExpenseCategory =
  | "RENT"
  | "PAYROLL"
  | "ELECTRICITY"
  | "WATER"
  | "INTERNET"
  | "MARKETING"
  | "PURCHASES"
  | "MAINTENANCE"
  | "EVENTS"
  | "GIFTS"
  | "ENTERTAINER"
  | "GOVERNMENT_FEES"
  | "OTHER";

export const EXPENSE_CATEGORY_LABELS_AR: Record<ExpenseCategory, string> = {
  RENT: "الإيجار",
  PAYROLL: "الرواتب",
  ELECTRICITY: "الكهرباء",
  WATER: "المياه",
  INTERNET: "الإنترنت",
  MARKETING: "التسويق",
  PURCHASES: "المشتريات",
  MAINTENANCE: "الصيانة",
  EVENTS: "الفعاليات",
  GIFTS: "الهدايا",
  ENTERTAINER: "المهرج/الشخصيات",
  GOVERNMENT_FEES: "الرسوم الحكومية",
  OTHER: "مصروفات أخرى",
};

export interface Expense {
  id: string;
  date: string; // ISO date
  category: ExpenseCategory;
  description: string;
  amount: number;
  recurring: boolean;
}

export interface Targets {
  monthlySalesTarget: number;
  dailySalesTarget: number;
  childVisitTarget: number;
  cafeRevenuePerChildTarget: number;
  averageTicketTarget: number;
  operatingProfitTarget: number;
}

export interface AppSettings {
  acquisitionCost: number; // سعر شراء المشروع
  previousYearSameMonthSales: number; // مرجع Growth vs Last Year
  reconciliationTolerancePct: number; // % سماح للفروقات بين التقارير
}

export const DEFAULT_TARGETS: Targets = {
  monthlySalesTarget: 70000,
  dailySalesTarget: 2333,
  childVisitTarget: 0,
  cafeRevenuePerChildTarget: 0,
  averageTicketTarget: 0,
  operatingProfitTarget: 0,
};

export const DEFAULT_SETTINGS: AppSettings = {
  acquisitionCost: 210000,
  previousYearSameMonthSales: 62944.5,
  reconciliationTolerancePct: 2,
};

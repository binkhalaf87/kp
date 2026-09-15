import type { ImportedFile, ReportType } from "@/lib/types";

const ANALYTICAL_REPORTS = new Set<ReportType>([
  "SALES_BY_CATEGORY",
  "SALES_BY_INVOICE",
  "SALES_BY_USER",
  "SALES_BY_CUSTOMER",
  "CUSTOMER_PRODUCTS",
  "SALES_BY_PAYMENT_METHOD",
  "SALES_BY_PERIOD",
  "PRODUCT_PERFORMANCE_SUMMARY",
]);

function time(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Newer business periods win; re-exports of the same period use the latest upload. */
export function compareImportsNewestFirst(a: ImportedFile, b: ImportedFile): number {
  return (
    time(b.periodEnd) - time(a.periodEnd) ||
    time(b.periodStart) - time(a.periodStart) ||
    time(b.importedAt) - time(a.importedAt)
  );
}

export function selectLatestImport(imports: ImportedFile[], reportType: ReportType): ImportedFile | undefined {
  return imports
    .filter((file) => file.reportType === reportType && file.status !== "UNSUPPORTED" && file.status !== "DUPLICATE")
    .sort(compareImportsNewestFirst)[0];
}

/**
 * Returns one authoritative file per analytical report type. Product catalogs
 * are kept separately because simple and variable catalogs complement each other.
 */
export function selectActiveImports(imports: ImportedFile[]): ImportedFile[] {
  const selected = new Map<ReportType, ImportedFile>();
  const passthrough: ImportedFile[] = [];

  for (const file of imports) {
    if (!ANALYTICAL_REPORTS.has(file.reportType)) {
      if (file.status !== "UNSUPPORTED" && file.status !== "DUPLICATE") passthrough.push(file);
      continue;
    }
    const current = selected.get(file.reportType);
    if (!current || compareImportsNewestFirst(file, current) < 0) selected.set(file.reportType, file);
  }

  return [...selected.values(), ...passthrough];
}

export function getActiveImportIds(imports: ImportedFile[]): Set<string> {
  return new Set(selectActiveImports(imports).map((file) => file.id));
}


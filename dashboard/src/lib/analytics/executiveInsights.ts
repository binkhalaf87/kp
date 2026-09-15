import type { ImportedFile } from "@/lib/types";
import type { KpiResult } from "@/lib/kpi/types";
import { extractInvoiceSummary } from "@/lib/parsers/extractors";
import { compareImportsNewestFirst } from "@/lib/imports/selectActiveImports";

export interface ExecutiveAlert {
  level: "danger" | "warning" | "info";
  title: string;
  detail: string;
}

export interface ExecutiveInsights {
  periodStart: string | null;
  periodEnd: string | null;
  dailyRunRate: number | null;
  projectedMonthSales: number | null;
  requiredDailySales: number | null;
  targetAchievementPct: number | null;
  salesSincePreviousUpload: number | null;
  daysRemaining: number | null;
  alerts: ExecutiveAlert[];
}

function daysInclusive(start: string, end: string): number {
  return Math.floor((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
}

export function buildExecutiveInsights(
  imports: ImportedFile[],
  kpis: KpiResult,
  monthlyTarget: number,
  cafeRevenuePerChildTarget: number
): ExecutiveInsights {
  const snapshots = imports
    .filter((file) => file.reportType === "SALES_BY_INVOICE" && file.status !== "UNSUPPORTED" && file.status !== "DUPLICATE")
    .sort(compareImportsNewestFirst);
  const current = snapshots[0];
  const currentSales = current ? extractInvoiceSummary(current)?.totalSalesInclVat ?? null : kpis.totalSalesInclVat;
  const previous = current
    ? snapshots.find((file, index) => index > 0 && file.periodStart === current.periodStart && file.periodEnd !== current.periodEnd)
    : undefined;
  const previousSales = previous ? extractInvoiceSummary(previous)?.totalSalesInclVat ?? null : null;

  let elapsedDays: number | null = null;
  let totalDays: number | null = null;
  let daysRemaining: number | null = null;
  if (current?.periodStart && current.periodEnd) {
    elapsedDays = daysInclusive(current.periodStart, current.periodEnd);
    const end = new Date(`${current.periodEnd}T00:00:00Z`);
    const monthStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    const startsAtMonthBeginning = current.periodStart === monthStart.toISOString().slice(0, 10);
    if (startsAtMonthBeginning) {
      totalDays = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
      daysRemaining = Math.max(0, totalDays - elapsedDays);
    }
  }

  const dailyRunRate = currentSales !== null && elapsedDays ? currentSales / elapsedDays : null;
  const projectedMonthSales = dailyRunRate !== null && totalDays ? dailyRunRate * totalDays : null;
  const requiredDailySales =
    currentSales !== null && monthlyTarget > 0 && daysRemaining !== null && daysRemaining > 0
      ? Math.max(0, monthlyTarget - currentSales) / daysRemaining
      : null;
  const targetAchievementPct = currentSales !== null && monthlyTarget > 0 ? (currentSales / monthlyTarget) * 100 : null;
  const salesSincePreviousUpload = currentSales !== null && previousSales !== null ? currentSales - previousSales : null;

  const alerts: ExecutiveAlert[] = [];
  if (projectedMonthSales !== null && monthlyTarget > 0 && projectedMonthSales < monthlyTarget) {
    alerts.push({
      level: projectedMonthSales < monthlyTarget * 0.85 ? "danger" : "warning",
      title: "توقع إغلاق الشهر أقل من الهدف",
      detail: `الفجوة المتوقعة ${Math.round(monthlyTarget - projectedMonthSales).toLocaleString("ar-SA")} ر.س.`,
    });
  }
  if (
    cafeRevenuePerChildTarget > 0 &&
    kpis.cafeRevenuePerChild !== null &&
    kpis.cafeRevenuePerChild < cafeRevenuePerChildTarget
  ) {
    alerts.push({
      level: "warning",
      title: "إنفاق الكوفي لكل طفل أقل من الهدف",
      detail: `الحالي ${kpis.cafeRevenuePerChild.toFixed(2)} ر.س مقابل هدف ${cafeRevenuePerChildTarget.toFixed(2)} ر.س.`,
    });
  }
  const failedChecks = kpis.reconciliation.filter((row) => !row.withinTolerance).length;
  if (failedChecks > 0) {
    alerts.push({ level: "danger", title: "فروقات بين تقارير رواء", detail: `${failedChecks} عمليات توفيق تجاوزت نسبة السماح.` });
  }
  if (kpis.unclassifiedProducts.length > 0) {
    alerts.push({ level: "warning", title: "منتجات غير مصنفة", detail: `${kpis.unclassifiedProducts.length} منتجات تؤثر على دقة توزيع الإيراد.` });
  }
  if (kpis.missingFields.length > 0) {
    alerts.push({ level: "info", title: "بيانات ناقصة", detail: `${kpis.missingFields.length} مصادر أو حقول مطلوبة لمؤشرات مكتملة.` });
  }
  if (alerts.length === 0) {
    alerts.push({ level: "info", title: "لا توجد تنبيهات حرجة", detail: "المؤشرات المتاحة ضمن الحدود المسجلة حاليًا." });
  }

  return {
    periodStart: current?.periodStart ?? null,
    periodEnd: current?.periodEnd ?? null,
    dailyRunRate,
    projectedMonthSales,
    requiredDailySales,
    targetAchievementPct,
    salesSincePreviousUpload,
    daysRemaining,
    alerts,
  };
}


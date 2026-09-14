"use client";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { calculateOperatingProfit } from "@/lib/kpi/profit";
import { calculateCapitalRecovery } from "@/lib/kpi/capitalRecovery";
import { getTargetStatus } from "@/lib/kpi/targetStatus";
import { formatSar, formatNumber, formatPct } from "@/lib/utils/format";

export default function ExecutiveDashboardPage() {
  const imports = useDashboardStore((s) => s.imports);
  const expenses = useDashboardStore((s) => s.expenses);
  const targets = useDashboardStore((s) => s.targets);
  const settings = useDashboardStore((s) => s.settings);
  const kpis = useKpis();

  const hasData = imports.length > 0;

  if (!hasData) {
    return (
      <div>
        <PageHeader title="لوحة الإدارة" description="نظرة تنفيذية سريعة على أداء المركز." />
        <EmptyState />
      </div>
    );
  }

  const profit = calculateOperatingProfit(kpis.totalSalesInclVat, expenses);
  const capitalRecovery = calculateCapitalRecovery(profit.operatingProfit, settings.acquisitionCost);

  const salesGrowthYoY =
    kpis.totalSalesInclVat !== null && settings.previousYearSameMonthSales > 0
      ? ((kpis.totalSalesInclVat - settings.previousYearSameMonthSales) / settings.previousYearSameMonthSales) * 100
      : null;

  const salesTargetStatus = getTargetStatus(kpis.totalSalesInclVat, targets.monthlySalesTarget);

  return (
    <div>
      <PageHeader title="لوحة الإدارة" description="إجابات سريعة على أهم أسئلة الأداء." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="كم بعنا؟ — إجمالي المبيعات" value={formatSar(kpis.totalSalesInclVat)} tone="primary" size="lg" />
        <KpiCard label="كم طفل دخل؟ — إجمالي زيارات الأطفال" value={formatNumber(kpis.totalChildVisits)} size="lg" />
        <KpiCard label="متوسط الإيراد لكل طفل" value={formatSar(kpis.revenuePerChildVisit)} size="lg" />
        <KpiCard label="كم باع الكوفي؟" value={formatSar(kpis.cafeRevenue)} size="lg" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div className="kp-card">
          <div className="text-xs font-bold text-muted mb-2">هل المبيعات تتحسن؟ (مقابل نفس الشهر العام الماضي)</div>
          {salesGrowthYoY === null ? (
            <div className="text-sm text-muted">غير متاح من التقارير المرفوعة</div>
          ) : (
            <div className={`text-2xl font-black ${salesGrowthYoY >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {salesGrowthYoY >= 0 ? "▲" : "▼"} {formatPct(Math.abs(salesGrowthYoY))}
            </div>
          )}
        </div>
        <div className="kp-card">
          <div className="text-xs font-bold text-muted mb-2">هل نحن أعلى أو أقل من الهدف الشهري؟</div>
          <StatusBadge status={salesTargetStatus} />
          <div className="text-[11px] text-muted mt-2">الهدف: {formatSar(targets.monthlySalesTarget)}</div>
        </div>
        <KpiCard label="كم الربح؟ (تشغيلي)" value={profit.operatingProfit !== null ? formatSar(profit.operatingProfit) : null} hint={profit.operatingProfit === null ? "أضف المصروفات لحساب الربح" : `هامش الربح: ${formatPct(profit.operatingMarginPct)}`} />
        <div className="kp-card">
          <div className="text-xs font-bold text-muted mb-2">كم استرددنا من رأس المال؟</div>
          {capitalRecovery.message ? (
            <div className="text-sm text-muted">{capitalRecovery.message}</div>
          ) : (
            <>
              <div className="text-2xl font-black text-navy">{formatPct(capitalRecovery.recoveredPct)}</div>
              <div className="text-[11px] text-muted mt-1">{formatSar(capitalRecovery.recoveredAmount)} من {formatSar(settings.acquisitionCost)}</div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <KpiCard label="التذاكر الأساسية" value={formatNumber(kpis.paidTicketEntries)} />
        <KpiCard label="الزيارات الثانية" value={formatNumber(kpis.secondVisitEntries)} />
        <KpiCard label="عدد الفواتير" value={formatNumber(kpis.transactions)} />
        <KpiCard label="متوسط قيمة الفاتورة" value={formatSar(kpis.averageTransactionValue)} />
      </div>

      {kpis.missingFields.length > 0 && (
        <div className="kp-card mt-6 border-amber-200 bg-amber-50">
          <div className="font-bold text-amber-800 text-sm mb-1">⚠ حقول ناقصة أثرت على بعض المؤشرات</div>
          <ul className="text-xs text-amber-700 list-disc pr-5">
            {kpis.missingFields.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { BreakdownTable } from "@/components/BreakdownTable";
import { DailySalesChart } from "@/components/charts/DailySalesChart";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { formatSar, formatNumber, formatPct } from "@/lib/utils/format";

export default function SalesPage() {
  const hasData = useDashboardStore((s) => s.imports.length > 0);
  const kpis = useKpis();

  if (!hasData) {
    return (
      <div>
        <PageHeader title="المبيعات" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="المبيعات" description="تفصيل المبيعات حسب الفئة والمنتج وطريقة الدفع والفترة." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="إجمالي المبيعات (شامل الضريبة)" value={formatSar(kpis.totalSalesInclVat)} tone="primary" />
        <KpiCard label="صافي المبيعات" value={formatSar(kpis.netSales)} />
        <KpiCard label="عدد الفواتير" value={formatNumber(kpis.transactions)} />
        <KpiCard label="متوسط قيمة الفاتورة" value={formatSar(kpis.averageTransactionValue)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="نسبة إيراد التذاكر" value={formatPct(kpis.ticketRevenueSharePct)} />
        <KpiCard label="نسبة إيراد الكوفي" value={formatPct(kpis.cafeRevenueSharePct)} />
        <KpiCard label="نسبة الإيرادات الأخرى" value={formatPct(kpis.otherRevenueSharePct)} />
      </div>

      <div className="kp-card">
        <div className="font-black text-navy mb-3">المبيعات اليومية</div>
        <DailySalesChart data={kpis.dailySeries} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <BreakdownTable title="المبيعات حسب الفئة" rows={kpis.byCategory} labelHeader="الفئة" />
        <BreakdownTable title="المبيعات حسب طريقة الدفع" rows={kpis.byPaymentMethod} labelHeader="طريقة الدفع" />
      </div>

      <BreakdownTable title="أفضل المنتجات مبيعًا" rows={kpis.byProduct} labelHeader="المنتج" />

      <div className="kp-card">
        <div className="font-black text-navy mb-2">المرتجعات</div>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard label="كمية المرتجعات" value={formatNumber(kpis.returnsQuantity)} />
          <KpiCard label="قيمة المرتجعات" value={formatSar(kpis.returnsValue)} />
        </div>
      </div>
    </div>
  );
}

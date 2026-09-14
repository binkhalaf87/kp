"use client";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { BreakdownTable } from "@/components/BreakdownTable";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { formatPct } from "@/lib/utils/format";

function findShare(rows: { label: string; sharePct: number | null }[], keywords: string[]): number | null {
  const row = rows.find((r) => keywords.some((k) => r.label.toLowerCase().includes(k)));
  return row?.sharePct ?? null;
}

export default function PaymentsPage() {
  const hasData = useDashboardStore((s) => s.imports.length > 0);
  const kpis = useKpis();

  if (!hasData) {
    return (
      <div>
        <PageHeader title="طرق الدفع" />
        <EmptyState />
      </div>
    );
  }

  const cardPct = findShare(kpis.byPaymentMethod, ["بطاقة", "card", "مدى", "visa", "mada"]);
  const cashPct = findShare(kpis.byPaymentMethod, ["نقد", "cash"]);
  const knownPct = (cardPct ?? 0) + (cashPct ?? 0);
  const otherPct = kpis.byPaymentMethod.length > 0 ? Math.max(0, 100 - knownPct) : null;

  const salesVsPayment = kpis.reconciliation.find((r) => r.label.includes("طرق الدفع"));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="طرق الدفع" />

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="نسبة البطاقات" value={formatPct(cardPct)} />
        <KpiCard label="نسبة النقد" value={formatPct(cashPct)} />
        <KpiCard label="نسبة طرق أخرى" value={formatPct(otherPct)} />
      </div>

      <BreakdownTable title="المبيعات حسب طريقة الدفع" rows={kpis.byPaymentMethod} labelHeader="طريقة الدفع" />

      {salesVsPayment && (
        <div className={`kp-card ${salesVsPayment.withinTolerance ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
          <div className={`font-bold text-sm mb-1 ${salesVsPayment.withinTolerance ? "text-emerald-800" : "text-rose-800"}`}>
            {salesVsPayment.withinTolerance ? "✓ إجمالي المبيعات مطابق لإجمالي طرق الدفع" : "⚠ اختلاف بين إجمالي المبيعات وإجمالي طرق الدفع يحتاج مراجعة"}
          </div>
          <div className="text-xs text-muted">الفرق: {salesVsPayment.diff.toFixed(2)} ر.س ({salesVsPayment.diffPct.toFixed(1)}%)</div>
        </div>
      )}
    </div>
  );
}

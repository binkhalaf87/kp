"use client";

import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { calculateOperatingProfit } from "@/lib/kpi/profit";
import { getTargetStatus } from "@/lib/kpi/targetStatus";
import { formatSar } from "@/lib/utils/format";
import type { Targets } from "@/lib/types";

// "هدف المبيعات اليومي" is deliberately not shown: no Rewaa report we've
// seen exposes a per-day breakdown, so its "actual" could never be more
// than a permanent "—" — an indicator with no possible data source.
const FIELDS: { key: keyof Targets; label: string }[] = [
  { key: "monthlySalesTarget", label: "هدف المبيعات الشهري" },
  { key: "childVisitTarget", label: "هدف عدد زيارات الأطفال" },
  { key: "cafeRevenuePerChildTarget", label: "هدف إيراد الكوفي لكل طفل" },
  { key: "averageTicketTarget", label: "هدف متوسط قيمة الفاتورة" },
  { key: "operatingProfitTarget", label: "هدف الربح التشغيلي" },
];

export default function TargetsPage() {
  const targets = useDashboardStore((s) => s.targets);
  const updateTargets = useDashboardStore((s) => s.updateTargets);
  const expenses = useDashboardStore((s) => s.expenses);
  const kpis = useKpis();
  const profit = calculateOperatingProfit(kpis.totalSalesInclVat, expenses);

  const actuals: Record<keyof Targets, number | null> = {
    monthlySalesTarget: kpis.totalSalesInclVat,
    dailySalesTarget: null,
    childVisitTarget: kpis.totalChildVisits,
    cafeRevenuePerChildTarget: kpis.cafeRevenuePerChild,
    averageTicketTarget: kpis.averageTransactionValue,
    operatingProfitTarget: profit.operatingProfit,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الأهداف" description="حدّد الأهداف الشهرية/اليومية — يمكن تعديلها في أي وقت." />

      <div className="kp-card overflow-x-auto">
        <table className="kp-table">
          <thead>
            <tr>
              <th>المؤشر</th>
              <th>الهدف</th>
              <th>الفعلي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {FIELDS.map((f) => (
              <tr key={f.key}>
                <td className="font-bold">{f.label}</td>
                <td>
                  <input
                    type="number"
                    value={targets[f.key]}
                    onChange={(e) => updateTargets({ [f.key]: Number(e.target.value) })}
                    className="border border-[#e3e7f5] rounded-lg px-2 py-1 text-sm w-32"
                  />
                </td>
                <td>{actuals[f.key] !== null ? formatSar(actuals[f.key]) : "—"}</td>
                <td>
                  <StatusBadge status={getTargetStatus(actuals[f.key], targets[f.key])} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted">
        🟢 ضمن الهدف · 🟡 يحتاج انتباه (ضمن 10% من الهدف) · 🔴 أقل من الهدف — يمكن تعديل نسبة التحذير من الإعدادات لاحقًا.
      </div>
    </div>
  );
}

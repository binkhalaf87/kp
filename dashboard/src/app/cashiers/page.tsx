"use client";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { formatSar, formatNumber, formatPct } from "@/lib/utils/format";

export default function CashiersPage() {
  const hasData = useDashboardStore((s) => s.imports.length > 0);
  const kpis = useKpis();

  if (!hasData) {
    return (
      <div>
        <PageHeader title="الكاشير" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="أداء الكاشير"
        description="ملاحظة: لا تتم مقارنة كاشير الكوفي بكاشير التذاكر كما لو كانا يؤديان نفس الوظيفة — القسم موضح لكل كاشير."
      />

      <div className="kp-card overflow-x-auto">
        {kpis.byCashier.length === 0 ? (
          <div className="text-sm text-muted">غير متاح من التقارير المرفوعة — تأكد من وجود عمود الكاشير في تقرير الفواتير.</div>
        ) : (
          <table className="kp-table">
            <thead>
              <tr>
                <th>الكاشير</th>
                <th>القسم</th>
                <th>المبيعات</th>
                <th>الكمية</th>
                <th>المرتجعات</th>
                <th>نسبة المبيعات</th>
              </tr>
            </thead>
            <tbody>
              {kpis.byCashier.map((c) => (
                <tr key={c.cashierName}>
                  <td className="font-bold">{c.cashierName}</td>
                  <td>{c.department}</td>
                  <td>{formatSar(c.sales)}</td>
                  <td>{formatNumber(c.quantity)}</td>
                  <td>{formatNumber(c.returns)}</td>
                  <td>{formatPct(c.salesSharePct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {kpis.unknownCashiers.length > 0 && (
        <div className="kp-card border-amber-200 bg-amber-50">
          <div className="font-bold text-amber-800 text-sm mb-1">⚠ كاشير غير معروف القسم</div>
          <p className="text-xs text-amber-700 mb-2">
            حدد القسم المناسب لهؤلاء الكاشير من صفحة الإعدادات حتى تظهر بياناتهم مصنّفة بدقة.
          </p>
          <div className="flex flex-wrap gap-2">
            {kpis.unknownCashiers.map((name) => (
              <span key={name} className="kp-badge-yellow">{name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { REPORT_TYPE_LABELS_AR } from "@/lib/types";
import { formatNumber, formatSar } from "@/lib/utils/format";
import { getActiveImportIds } from "@/lib/imports/selectActiveImports";

export default function DataQualityPage() {
  const imports = useDashboardStore((s) => s.imports);
  const kpis = useKpis();
  const activeImportIds = getActiveImportIds(imports);

  if (imports.length === 0) {
    return (
      <div>
        <PageHeader title="جودة البيانات" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="جودة البيانات" description="نظرة شاملة على مصادر البيانات المستخدمة وأي مشاكل مكتشفة." />

      <div className="kp-card overflow-x-auto">
        <div className="font-black text-navy mb-3">الملفات المستخدمة</div>
        <table className="kp-table">
          <thead>
            <tr>
              <th>الملف</th>
              <th>نوع التقرير</th>
              <th>الفترة</th>
              <th>الصفوف</th>
              <th>الأعمدة</th>
              <th>الاستخدام</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((f) => (
              <tr key={f.id}>
                <td className="font-bold">{f.fileName}</td>
                <td>{REPORT_TYPE_LABELS_AR[f.reportType]}</td>
                <td>{f.periodStart ? `${f.periodStart} — ${f.periodEnd}` : "—"}</td>
                <td>{formatNumber(f.rowCount)}</td>
                <td className="max-w-xs truncate" title={f.columns.join(", ")}>{f.columns.length}</td>
                <td>
                  {activeImportIds.has(f.id) ? (
                    <span className="kp-badge-green">معتمد في التحليل</span>
                  ) : (
                    <span className="kp-badge-yellow">نسخة تاريخية</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="kp-card">
          <div className="font-black text-navy mb-2">حقول ناقصة</div>
          {kpis.missingFields.length === 0 ? (
            <div className="text-sm text-emerald-700">لا توجد حقول ناقصة معروفة.</div>
          ) : (
            <ul className="text-sm text-rose-700 list-disc pr-5">
              {kpis.missingFields.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
        </div>
        <div className="kp-card">
          <div className="font-black text-navy mb-2">منتجات تحتاج تصنيف</div>
          {kpis.unclassifiedProducts.length === 0 ? (
            <div className="text-sm text-emerald-700">لا توجد منتجات غير مصنّفة.</div>
          ) : (
            <ul className="text-sm flex flex-col gap-1">
              {kpis.unclassifiedProducts.map((p) => (
                <li key={p.productName} className="flex justify-between">
                  <span>{p.productName}</span>
                  <span className="text-muted">{formatSar(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="kp-card">
          <div className="font-black text-navy mb-2">كاشير غير معروف</div>
          {kpis.unknownCashiers.length === 0 ? (
            <div className="text-sm text-emerald-700">كل الكاشير معروف القسم.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {kpis.unknownCashiers.map((c) => <span key={c} className="kp-badge-yellow">{c}</span>)}
            </div>
          )}
        </div>
        <div className="kp-card">
          <div className="font-black text-navy mb-2">فروقات التوفيق (Reconciliation)</div>
          {kpis.reconciliation.length === 0 ? (
            <div className="text-sm text-muted">لا توجد تقارير كافية للمقارنة بعد.</div>
          ) : (
            <ul className="text-sm flex flex-col gap-1.5">
              {kpis.reconciliation.map((r) => (
                <li key={r.label} className="flex items-center justify-between">
                  <span>{r.withinTolerance ? "✓" : "⚠"} {r.label}</span>
                  <span className={r.withinTolerance ? "text-emerald-700" : "text-rose-700"}>{r.diffPct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

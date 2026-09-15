import type { ExecutiveInsights as Insights } from "@/lib/analytics/executiveInsights";
import { KpiCard } from "@/components/KpiCard";
import { formatPct, formatSar } from "@/lib/utils/format";

const ALERT_STYLE = {
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function ExecutiveInsights({ insights }: { insights: Insights }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-black text-lg text-navy">ملخص القرار التنفيذي</h2>
          <p className="text-xs text-muted">سرعة المبيعات الحالية، توقع نهاية الشهر، والإجراء المطلوب.</p>
        </div>
        {(insights.periodStart || insights.periodEnd) && (
          <div className="text-xs font-bold text-muted bg-white rounded-full border border-[#e3e7f5] px-3 py-1.5">
            الفترة المعتمدة: {insights.periodStart ?? "—"} — {insights.periodEnd ?? "—"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="نسبة تحقيق الهدف" value={formatPct(insights.targetAchievementPct)} tone="primary" />
        <KpiCard label="متوسط المبيعات اليومي" value={formatSar(insights.dailyRunRate)} />
        <KpiCard label="توقع إغلاق الشهر" value={formatSar(insights.projectedMonthSales)} />
        <KpiCard label="المطلوب يوميًا لتحقيق الهدف" value={formatSar(insights.requiredDailySales)} />
        <KpiCard
          label="المبيعات منذ التقرير السابق"
          value={formatSar(insights.salesSincePreviousUpload)}
          hint={insights.daysRemaining !== null ? `${insights.daysRemaining} يوم متبقٍ` : undefined}
        />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {insights.alerts.map((alert, index) => (
          <div key={`${alert.title}-${index}`} className={`rounded-2xl border p-4 ${ALERT_STYLE[alert.level]}`}>
            <div className="text-sm font-black">{alert.level === "danger" ? "⚠" : alert.level === "warning" ? "!" : "i"} {alert.title}</div>
            <div className="text-xs mt-1 opacity-80">{alert.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}


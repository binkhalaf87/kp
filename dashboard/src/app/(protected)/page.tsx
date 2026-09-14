"use client";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { BreakdownTable } from "@/components/BreakdownTable";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { calculateOperatingProfit } from "@/lib/kpi/profit";
import { calculateCapitalRecovery } from "@/lib/kpi/capitalRecovery";
import { getTargetStatus } from "@/lib/kpi/targetStatus";
import { formatSar, formatNumber, formatPct, UNAVAILABLE_LABEL } from "@/lib/utils/format";

export default function DashboardPage() {
  const imports = useDashboardStore((s) => s.imports);
  const expenses = useDashboardStore((s) => s.expenses);
  const targets = useDashboardStore((s) => s.targets);
  const settings = useDashboardStore((s) => s.settings);
  const kpis = useKpis();

  const hasData = imports.length > 0;

  if (!hasData) {
    return (
      <div>
        <PageHeader title="لوحة الإدارة" description="نظرة شاملة على أداء المركز — كل مؤشر هنا محسوب من التقارير المرفوعة فعليًا." />
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

  const ticketRevenuePerChild =
    kpis.ticketRevenue !== null && kpis.totalChildVisits ? kpis.ticketRevenue / kpis.totalChildVisits : null;
  const otherPerChild =
    kpis.totalSalesInclVat !== null && kpis.ticketRevenue !== null && kpis.cafeRevenue !== null && kpis.totalChildVisits
      ? (kpis.totalSalesInclVat - kpis.ticketRevenue - kpis.cafeRevenue) / kpis.totalChildVisits
      : null;

  const cafeQuantity = kpis.byCategory.find((c) => c.label === "CAFE")?.quantity ?? null;
  const avgCafeProductPrice = kpis.cafeRevenue !== null && cafeQuantity ? kpis.cafeRevenue / cafeQuantity : null;
  const cafeAttachRate =
    kpis.totalChildVisits && cafeQuantity !== null ? (cafeQuantity / kpis.totalChildVisits) * 100 : null;
  const cafeProducts = kpis.byCategoryProducts.CAFE ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="لوحة الإدارة" description="نظرة شاملة على أداء المركز — كل مؤشر هنا محسوب من التقارير المرفوعة فعليًا." />

      {/* نظرة عامة */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="إجمالي المبيعات (شامل الضريبة)" value={formatSar(kpis.totalSalesInclVat)} tone="primary" size="lg" />
          <KpiCard label="صافي المبيعات (بدون ضريبة)" value={formatSar(kpis.netSales)} size="lg" />
          <KpiCard label="عدد الفواتير" value={formatNumber(kpis.transactions)} size="lg" />
          <KpiCard label="متوسط قيمة الفاتورة" value={formatSar(kpis.averageTransactionValue)} size="lg" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kp-card">
            <div className="text-xs font-bold text-muted mb-2">هل المبيعات تتحسن؟ (مقابل نفس الشهر العام الماضي)</div>
            {salesGrowthYoY === null ? (
              <div className="text-sm text-muted">{UNAVAILABLE_LABEL}</div>
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
          <KpiCard
            label="كم الربح؟ (تشغيلي)"
            value={profit.operatingProfit !== null ? formatSar(profit.operatingProfit) : null}
            hint={profit.operatingProfit === null ? "أضف المصروفات لحساب الربح" : `هامش الربح: ${formatPct(profit.operatingMarginPct)}`}
          />
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard label="نسبة إيراد التذاكر من إجمالي المبيعات" value={formatPct(kpis.ticketRevenueSharePct)} />
          <KpiCard label="نسبة إيراد الكوفي من إجمالي المبيعات" value={formatPct(kpis.cafeRevenueSharePct)} />
          <KpiCard label="نسبة الإيرادات الأخرى" value={formatPct(kpis.otherRevenueSharePct)} />
        </div>

        <div className="kp-card">
          <div className="font-black text-navy mb-2">أرقام رواء (تكلفة البضاعة وهامش الربح الإجمالي)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="تكلفة البضاعة المباعة (COGS)" value={formatSar(kpis.cogs)} />
            <KpiCard label="إجمالي قيمة الربح (من رواء)" value={formatSar(kpis.grossProfit)} />
            <KpiCard label="إجمالي الضريبة" value={formatSar(kpis.vatTotal)} />
            <KpiCard label="كمية المرتجعات" value={formatNumber(kpis.returnsQuantity)} />
          </div>
          <div className="text-[11px] text-muted mt-2">
            هذا هامش الربح الإجمالي من رواء فقط — وليس الربح التشغيلي الصافي (المحسوب أعلاه بعد خصم المصروفات).
          </div>
        </div>

        <BreakdownTable title="المبيعات حسب الفئة" rows={kpis.byCategory} labelHeader="الفئة" />
        <BreakdownTable title="أفضل المنتجات مبيعًا (كل الفئات)" rows={kpis.byProduct} labelHeader="المنتج" />
      </section>

      {/* الأطفال والتذاكر */}
      <section className="flex flex-col gap-4">
        <h2 className="font-black text-lg text-navy">الأطفال والتذاكر</h2>
        <p className="text-xs text-muted -mt-2">قاعدة صارمة: لا تُستخدم الكمية المباعة الإجمالية كعدد للأطفال — فقط تذاكر الدخول والزيارة الثانية.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="إجمالي زيارات الأطفال" value={formatNumber(kpis.totalChildVisits)} tone="primary" />
          <KpiCard label="التذاكر الأساسية (Paid Ticket Entries)" value={formatNumber(kpis.paidTicketEntries)} />
          <KpiCard label="الزيارات الثانية" value={formatNumber(kpis.secondVisitEntries)} />
          <KpiCard label="متوسط الإيراد لكل زيارة طفل" value={formatSar(kpis.revenuePerChildVisit)} />
        </div>

        <BreakdownTable title="توزيع تذاكر الدخول (Ticket Mix)" rows={kpis.ticketMix} labelHeader="نوع التذكرة" />

        <div className="grid md:grid-cols-3 gap-4">
          <div className="kp-card">
            <div className="font-black text-navy mb-2">رسم على الوجه</div>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="عدد العمليات" value={formatNumber(kpis.facePaintingCount)} />
              <KpiCard label="الإيراد" value={formatSar(kpis.facePaintingRevenue)} />
            </div>
            <div className="text-xs text-muted mt-2">نسبة الانتشار (Penetration): {formatPct(kpis.facePaintingPenetrationPct)}</div>
          </div>
          <div className="kp-card">
            <div className="font-black text-navy mb-2">الاشتراكات (Memberships)</div>
            <KpiCard label="عدد الاشتراكات المباعة" value={formatNumber(kpis.membershipSoldCount)} />
            <div className="text-[11px] text-muted mt-2">
              لا تُحتسب الاشتراكات تلقائيًا كزيارة طفل ما لم ترتبط بزيارة فعلية في البيانات.
            </div>
          </div>
          <div className="kp-card">
            <div className="font-black text-navy mb-2">اقتصاديات الطفل (تقسيم الإيراد لكل زيارة)</div>
            <ul className="text-sm flex flex-col gap-1.5">
              <li className="flex justify-between"><span className="text-muted">إيراد التذاكر لكل طفل</span><b>{ticketRevenuePerChild !== null ? formatSar(ticketRevenuePerChild) : UNAVAILABLE_LABEL}</b></li>
              <li className="flex justify-between"><span className="text-muted">إيراد الكوفي لكل طفل</span><b>{kpis.cafeRevenuePerChild !== null ? formatSar(kpis.cafeRevenuePerChild) : UNAVAILABLE_LABEL}</b></li>
              <li className="flex justify-between"><span className="text-muted">إيراد الإضافات لكل طفل</span><b>{otherPerChild !== null ? formatSar(otherPerChild) : UNAVAILABLE_LABEL}</b></li>
            </ul>
          </div>
        </div>
      </section>

      {/* KP Coffee */}
      <section className="flex flex-col gap-4">
        <h2 className="font-black text-lg text-navy">KP Coffee</h2>
        <p className="text-xs text-muted -mt-2">إجمالي مبيعات الكوفي ونسبتها من المركز موجودة أعلاه في &quot;المبيعات حسب الفئة&quot; — هنا فقط ما هو خاص بأداء الكوفي تحديدًا.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard label="متوسط سعر منتج الكوفي" value={avgCafeProductPrice !== null ? formatSar(avgCafeProductPrice) : null} />
          <div className="kp-card">
            <div className="text-xs font-bold text-muted mb-2">Cafe Attach Rate (منتجات كوفي لكل زيارة طفل)</div>
            {cafeAttachRate !== null ? (
              <div className="text-2xl font-black text-navy">{formatPct(cafeAttachRate)}</div>
            ) : (
              <div className="text-sm text-muted">{UNAVAILABLE_LABEL}</div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <BreakdownTable title="أفضل منتجات الكوفي مبيعًا" rows={cafeProducts.slice(0, 10)} labelHeader="المنتج" />
          <BreakdownTable title="أضعف منتجات الكوفي مبيعًا" rows={[...cafeProducts].reverse().slice(0, 10)} labelHeader="المنتج" />
        </div>
      </section>

      {/* الكاشير */}
      <section className="flex flex-col gap-4">
        <h2 className="font-black text-lg text-navy">أداء الكاشير</h2>
        <p className="text-xs text-muted -mt-2">ملاحظة: لا تتم مقارنة كاشير الكوفي بكاشير التذاكر كما لو كانا يؤديان نفس الوظيفة — القسم موضح لكل كاشير.</p>

        <div className="kp-card overflow-x-auto">
          {kpis.byCashier.length === 0 ? (
            <div className="text-sm text-muted">{UNAVAILABLE_LABEL} — تأكد من رفع تقرير &quot;المبيعات حسب المستخدمين&quot;.</div>
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
            <p className="text-xs text-amber-700 mb-2">حدد القسم المناسب لهؤلاء الكاشير من صفحة الإعدادات حتى تظهر بياناتهم مصنّفة بدقة.</p>
            <div className="flex flex-wrap gap-2">
              {kpis.unknownCashiers.map((name) => (
                <span key={name} className="kp-badge-yellow">{name}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      {kpis.missingFields.length > 0 && (
        <div className="kp-card border-amber-200 bg-amber-50">
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

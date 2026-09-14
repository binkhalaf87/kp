"use client";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { BreakdownTable } from "@/components/BreakdownTable";
import { HourlyChart } from "@/components/charts/HourlyChart";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { formatSar, formatNumber, formatPct, UNAVAILABLE_LABEL } from "@/lib/utils/format";

export default function ChildrenPage() {
  const hasData = useDashboardStore((s) => s.imports.length > 0);
  const kpis = useKpis();

  if (!hasData) {
    return (
      <div>
        <PageHeader title="الأطفال والتذاكر" />
        <EmptyState />
      </div>
    );
  }

  const cafeRevenuePerChild = kpis.cafeRevenuePerChild;
  const ticketRevenuePerChild =
    kpis.ticketRevenue !== null && kpis.totalChildVisits ? kpis.ticketRevenue / kpis.totalChildVisits : null;
  const otherPerChild =
    kpis.totalSalesInclVat !== null &&
    kpis.ticketRevenue !== null &&
    kpis.cafeRevenue !== null &&
    kpis.totalChildVisits
      ? (kpis.totalSalesInclVat - kpis.ticketRevenue - kpis.cafeRevenue) / kpis.totalChildVisits
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الأطفال والتذاكر" description="قاعدة صارمة: لا تُستخدم الكمية المباعة الإجمالية كعدد للأطفال — فقط تذاكر الدخول والزيارة الثانية." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="إجمالي زيارات الأطفال" value={formatNumber(kpis.totalChildVisits)} tone="primary" />
        <KpiCard label="التذاكر الأساسية (Paid Ticket Entries)" value={formatNumber(kpis.paidTicketEntries)} />
        <KpiCard label="الزيارات الثانية" value={formatNumber(kpis.secondVisitEntries)} />
        <KpiCard label="متوسط الإيراد لكل زيارة" value={formatSar(kpis.revenuePerChildVisit)} />
      </div>

      <BreakdownTable title="توزيع تذاكر الدخول (Ticket Mix)" rows={kpis.ticketMix} labelHeader="نوع التذكرة" />

      <div className="kp-card">
        <div className="font-black text-navy mb-3">دخول الأطفال حسب الساعة</div>
        <HourlyChart data={kpis.hourlySeries} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="kp-card">
          <div className="font-black text-navy mb-2">رسم على الوجه</div>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="عدد العمليات" value={formatNumber(kpis.facePaintingCount)} />
            <KpiCard label="الإيراد" value={formatSar(kpis.facePaintingRevenue)} />
          </div>
          <div className="text-xs text-muted mt-2">
            نسبة الانتشار (Penetration): {formatPct(kpis.facePaintingPenetrationPct)}
          </div>
        </div>
        <div className="kp-card">
          <div className="font-black text-navy mb-2">الاشتراكات (Memberships)</div>
          <KpiCard label="عدد الاشتراكات المباعة" value={formatNumber(kpis.membershipSoldCount)} />
          <div className="text-[11px] text-muted mt-2">
            لا تُحتسب الاشتراكات تلقائيًا كزيارة طفل ما لم ترتبط بزيارة فعلية في البيانات.
          </div>
        </div>
        <div className="kp-card">
          <div className="font-black text-navy mb-2">اقتصاديات الطفل</div>
          <ul className="text-sm flex flex-col gap-1.5">
            <li className="flex justify-between"><span className="text-muted">إيراد التذاكر لكل طفل</span><b>{ticketRevenuePerChild !== null ? formatSar(ticketRevenuePerChild) : UNAVAILABLE_LABEL}</b></li>
            <li className="flex justify-between"><span className="text-muted">إيراد الكوفي لكل طفل</span><b>{cafeRevenuePerChild !== null ? formatSar(cafeRevenuePerChild) : UNAVAILABLE_LABEL}</b></li>
            <li className="flex justify-between"><span className="text-muted">إيراد الإضافات لكل طفل</span><b>{otherPerChild !== null ? formatSar(otherPerChild) : UNAVAILABLE_LABEL}</b></li>
            <li className="flex justify-between border-t border-[#eef0fa] pt-1.5"><span className="text-muted">إجمالي الإيراد لكل طفل</span><b>{formatSar(kpis.revenuePerChildVisit)}</b></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

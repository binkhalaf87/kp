"use client";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { BreakdownTable } from "@/components/BreakdownTable";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { formatSar, formatNumber, formatPct, UNAVAILABLE_LABEL } from "@/lib/utils/format";

export default function CoffeePage() {
  const hasData = useDashboardStore((s) => s.imports.length > 0);
  const kpis = useKpis();

  if (!hasData) {
    return (
      <div>
        <PageHeader title="أداء KP Coffee" />
        <EmptyState />
      </div>
    );
  }

  // byProduct is an overall top-sellers list (all categories); a cafe-only
  // per-product ranking needs the same per-row classification the KPI
  // engine already applies, tracked as a refinement once real files land.
  const cafeProducts = kpis.byProduct;

  const cafeQuantity = kpis.byCategory.find((c) => c.label === "CAFE")?.quantity ?? null;
  const avgProductPrice =
    kpis.cafeRevenue !== null && cafeQuantity ? kpis.cafeRevenue / cafeQuantity : null;

  const attachRate =
    kpis.totalChildVisits && cafeQuantity !== null ? (cafeQuantity / kpis.totalChildVisits) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="أداء KP Coffee" description="مبيعات الكافيه بشكل مستقل عن دخول الأطفال." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="إجمالي مبيعات الكوفي" value={formatSar(kpis.cafeRevenue)} tone="primary" />
        <KpiCard label="نسبة الكوفي من مبيعات المركز" value={formatPct(kpis.cafeRevenueSharePct)} />
        <KpiCard label="مبيعات الكوفي لكل طفل" value={formatSar(kpis.cafeRevenuePerChild)} />
        <KpiCard label="متوسط سعر المنتج" value={avgProductPrice !== null ? formatSar(avgProductPrice) : null} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <KpiCard label="عدد منتجات الكوفي المباعة" value={formatNumber(cafeQuantity)} />
        <div className="kp-card">
          <div className="text-xs font-bold text-muted mb-2">Cafe Attach Rate (منتجات كوفي لكل زيارة طفل)</div>
          {attachRate !== null ? (
            <div className="text-2xl font-black text-navy">{formatPct(attachRate)}</div>
          ) : (
            <div className="text-sm text-muted">{UNAVAILABLE_LABEL}</div>
          )}
        </div>
      </div>

      <BreakdownTable title="أفضل المنتجات مبيعًا (كل المنتجات)" rows={cafeProducts.slice(0, 10)} labelHeader="المنتج" />
      <BreakdownTable title="أضعف المنتجات مبيعًا" rows={[...cafeProducts].reverse().slice(0, 10)} labelHeader="المنتج" />
    </div>
  );
}

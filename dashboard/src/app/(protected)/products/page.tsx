"use client";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { BreakdownTable } from "@/components/BreakdownTable";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";

export default function ProductsPage() {
  const hasData = useDashboardStore((s) => s.imports.length > 0);
  const kpis = useKpis();

  if (!hasData) {
    return (
      <div>
        <PageHeader title="المنتجات" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="المنتجات" description="مبيعات المركز حسب الفئة والمنتج." />
      <BreakdownTable title="المبيعات حسب الفئة" rows={kpis.byCategory} labelHeader="الفئة" />
      <BreakdownTable title="كل المنتجات" rows={kpis.byProduct} labelHeader="المنتج" />
    </div>
  );
}

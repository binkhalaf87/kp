"use client";

import { useMemo } from "react";
import { useDashboardStore } from "@/lib/store";
import { calculateKpis } from "./calculateKpis";

export function useKpis() {
  const imports = useDashboardStore((s) => s.imports);
  const productMappings = useDashboardStore((s) => s.productMappings);
  const cashierDepartments = useDashboardStore((s) => s.cashierDepartments);
  const tolerancePct = useDashboardStore((s) => s.settings.reconciliationTolerancePct);

  return useMemo(
    () => calculateKpis(imports, productMappings, cashierDepartments, tolerancePct),
    [imports, productMappings, cashierDepartments, tolerancePct]
  );
}

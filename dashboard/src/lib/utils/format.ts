// Numbers use Western digits with "en-US" grouping (e.g. 25,063.50) per the
// project's specified format, even though labels/currency are Arabic —
// matches how Rewaa, bank statements, and POS receipts show figures.

export function formatSar(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ر.س`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

export const UNAVAILABLE_LABEL = "غير متاح من التقارير المرفوعة";

import type { BreakdownRow } from "@/lib/kpi/types";
import { formatSar, formatNumber, formatPct } from "@/lib/utils/format";

export function BreakdownTable({
  title,
  rows,
  labelHeader = "البند",
}: {
  title: string;
  rows: BreakdownRow[];
  labelHeader?: string;
}) {
  return (
    <div className="kp-card overflow-x-auto">
      <div className="font-black text-navy mb-3">{title}</div>
      {rows.length === 0 ? (
        <div className="text-sm text-muted">غير متاح من التقارير المرفوعة</div>
      ) : (
        <table className="kp-table">
          <thead>
            <tr>
              <th>{labelHeader}</th>
              <th>الكمية</th>
              <th>الإيراد</th>
              <th>النسبة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="font-bold">{r.label}</td>
                <td>{formatNumber(r.quantity)}</td>
                <td>{formatSar(r.revenue)}</td>
                <td>{formatPct(r.sharePct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

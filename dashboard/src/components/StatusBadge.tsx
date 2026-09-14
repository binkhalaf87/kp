import type { TargetStatus } from "@/lib/kpi/targetStatus";

const CONFIG: Record<TargetStatus, { label: string; className: string; icon: string }> = {
  ON_TARGET: { label: "ضمن الهدف", className: "kp-badge-green", icon: "🟢" },
  NEEDS_ATTENTION: { label: "يحتاج انتباه", className: "kp-badge-yellow", icon: "🟡" },
  BELOW_TARGET: { label: "أقل من الهدف", className: "kp-badge-red", icon: "🔴" },
  UNKNOWN: { label: "غير محدد", className: "kp-badge-yellow", icon: "⚪" },
};

export function StatusBadge({ status }: { status: TargetStatus }) {
  const c = CONFIG[status];
  return (
    <span className={c.className}>
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
}

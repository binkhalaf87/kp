import { UNAVAILABLE_LABEL } from "@/lib/utils/format";
import clsx from "clsx";

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  size = "md",
}: {
  label: string;
  value: string | number | null;
  hint?: string;
  tone?: "default" | "primary";
  size?: "md" | "lg";
}) {
  const unavailable = value === null || value === "—";
  return (
    <div
      className={clsx(
        "kp-card flex flex-col gap-1.5",
        tone === "primary" && "bg-gradient-to-br from-navy to-purple text-white border-none"
      )}
    >
      <span className={clsx("text-xs font-bold", tone === "primary" ? "text-white/70" : "text-muted")}>
        {label}
      </span>
      {unavailable ? (
        <span className="text-sm text-muted">{UNAVAILABLE_LABEL}</span>
      ) : (
        <span
          className={clsx(
            "font-black tabular-nums",
            size === "lg" ? "text-3xl" : "text-2xl",
            tone === "primary" ? "text-white" : "text-navy"
          )}
        >
          {value}
        </span>
      )}
      {hint && (
        <span className={clsx("text-[11px]", tone === "primary" ? "text-white/60" : "text-muted")}>{hint}</span>
      )}
    </div>
  );
}

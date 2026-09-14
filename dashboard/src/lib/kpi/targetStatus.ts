export type TargetStatus = "ON_TARGET" | "NEEDS_ATTENTION" | "BELOW_TARGET" | "UNKNOWN";

/**
 * 🟢 On Target: at/above target.
 * 🟡 Needs Attention: within `warnThresholdPct` below target (default 10%).
 * 🔴 Below Target: further below than that.
 * Thresholds are editable via Settings/Targets, not hardcoded business assumptions.
 */
export function getTargetStatus(
  actual: number | null,
  target: number,
  warnThresholdPct = 10
): TargetStatus {
  if (actual === null || !target) return "UNKNOWN";
  if (actual >= target) return "ON_TARGET";
  const gapPct = ((target - actual) / target) * 100;
  return gapPct <= warnThresholdPct ? "NEEDS_ATTENTION" : "BELOW_TARGET";
}

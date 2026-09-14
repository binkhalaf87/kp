export interface CapitalRecoveryResult {
  recoveredAmount: number | null;
  recoveredPct: number | null;
  message: string | null;
}

export const CAPITAL_RECOVERY_UNAVAILABLE_MESSAGE =
  "لا يمكن حساب استرداد رأس المال بدقة قبل إدخال المصروفات.";

/**
 * Capital Recovery uses cumulative NET OPERATING PROFIT only — never raw
 * sales — per the project rule that sales alone cannot be used to claim
 * capital recovery.
 */
export function calculateCapitalRecovery(
  cumulativeOperatingProfit: number | null,
  acquisitionCost: number
): CapitalRecoveryResult {
  if (cumulativeOperatingProfit === null) {
    return { recoveredAmount: null, recoveredPct: null, message: CAPITAL_RECOVERY_UNAVAILABLE_MESSAGE };
  }
  const recoveredAmount = Math.max(0, cumulativeOperatingProfit);
  const recoveredPct = acquisitionCost > 0 ? (recoveredAmount / acquisitionCost) * 100 : null;
  return { recoveredAmount, recoveredPct, message: null };
}

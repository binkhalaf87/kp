import type { Expense } from "@/lib/types";

export interface ProfitResult {
  operatingRevenue: number | null;
  totalExpenses: number | null;
  operatingProfit: number | null;
  operatingMarginPct: number | null;
  expensesByCategory: Record<string, number>;
}

/**
 * Operating Profit = Operating Revenue − recorded operating expenses.
 * Rewaa's own "Gross Profit"/COGS figures are NOT used here — per the
 * project rules they are not reliable enough to treat as net profit, and
 * this project's expenses (rent, payroll, utilities, ...) are captured
 * separately in the Expenses module. If no expenses have been entered yet,
 * profit is intentionally left unavailable rather than assumed to equal
 * revenue.
 */
export function calculateOperatingProfit(operatingRevenue: number | null, expenses: Expense[]): ProfitResult {
  if (expenses.length === 0) {
    return {
      operatingRevenue,
      totalExpenses: null,
      operatingProfit: null,
      operatingMarginPct: null,
      expensesByCategory: {},
    };
  }

  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  for (const e of expenses) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + e.amount;
    totalExpenses += e.amount;
  }

  if (operatingRevenue === null) {
    return {
      operatingRevenue: null,
      totalExpenses,
      operatingProfit: null,
      operatingMarginPct: null,
      expensesByCategory,
    };
  }

  const operatingProfit = operatingRevenue - totalExpenses;
  const operatingMarginPct = operatingRevenue !== 0 ? (operatingProfit / operatingRevenue) * 100 : null;

  return { operatingRevenue, totalExpenses, operatingProfit, operatingMarginPct, expensesByCategory };
}

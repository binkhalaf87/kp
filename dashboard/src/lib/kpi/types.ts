import type { ProductCategory } from "@/lib/types";

/** A metric that is either a computed number or explicitly unavailable given the imported data. */
export type Metric = number | null;

export interface BreakdownRow {
  label: string;
  quantity: number;
  // null when the products in this row/category have no manually-entered
  // unit price yet (Rewaa's row-level exports carry quantity only, never
  // revenue) — never estimated, per the no-invented-data rule.
  revenue: number | null;
  sharePct: number | null;
}

export interface CashierRow {
  cashierName: string;
  department: string;
  sales: number;
  quantity: number;
  returns: number;
  salesSharePct: number | null;
}

export interface ReconciliationRow {
  label: string;
  a: number;
  b: number;
  diff: number;
  diffPct: number;
  withinTolerance: boolean;
}

export interface UnclassifiedProduct {
  productName: string;
  confidence: number;
  quantity: number;
  revenue: number;
}

export interface KpiResult {
  // Core KPIs
  totalSalesInclVat: Metric;
  netSales: Metric;
  totalChildVisits: Metric;
  paidTicketEntries: Metric;
  secondVisitEntries: Metric;
  revenuePerChildVisit: Metric;
  ticketRevenue: Metric;
  cafeRevenue: Metric;
  cafeRevenuePerChild: Metric;
  averageTransactionValue: Metric;
  transactions: Metric;
  returnsQuantity: Metric;
  // Rewaa's own figures (from the invoice-summary aggregate report), shown
  // as informational metrics — NOT used as "net profit" anywhere; Operating
  // Profit (see profit.ts) is computed separately from entered expenses.
  cogs: Metric;
  grossProfit: Metric;
  vatTotal: Metric;

  // Secondary
  ticketRevenueSharePct: Metric;
  cafeRevenueSharePct: Metric;
  otherRevenueSharePct: Metric;
  facePaintingRevenue: Metric;
  facePaintingCount: Metric;
  facePaintingPenetrationPct: Metric;
  toyRevenue: Metric;
  activityRevenue: Metric;
  membershipRevenue: Metric;
  membershipSoldCount: Metric;

  byCashier: CashierRow[];
  byCategory: BreakdownRow[];
  byProduct: BreakdownRow[];
  byPaymentMethod: BreakdownRow[];
  ticketMix: BreakdownRow[];
  // Per-category product rankings (e.g. cafe-only top sellers) — distinct
  // from `byProduct`, which mixes every category together.
  byCategoryProducts: Partial<Record<ProductCategory, BreakdownRow[]>>;

  reconciliation: ReconciliationRow[];
  unclassifiedProducts: UnclassifiedProduct[];
  unknownCashiers: string[];
  missingFields: string[];
}

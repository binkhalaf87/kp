import type { ProductCategory } from "@/lib/types";

/** A metric that is either a computed number or explicitly unavailable given the imported data. */
export type Metric = number | null;

export interface BreakdownRow {
  label: string;
  quantity: number;
  revenue: number;
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

export interface DailyRow {
  date: string; // ISO date
  sales: number;
  childVisits: number;
  cafeRevenue: number;
  revenuePerChild: number | null;
}

export interface HourlyRow {
  hour: number;
  sales: number;
  childEntries: number;
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
  hasInvoiceLevelData: boolean;
  dateRangeAvailable: boolean;
  timeAvailable: boolean;

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
  returnsValue: Metric;

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

  dailySeries: DailyRow[];
  hourlySeries: HourlyRow[];

  reconciliation: ReconciliationRow[];
  unclassifiedProducts: UnclassifiedProduct[];
  unknownCashiers: string[];
  missingFields: string[];

  categoryRevenue: Partial<Record<ProductCategory, number>>;
}

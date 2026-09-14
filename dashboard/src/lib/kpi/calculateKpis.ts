import type { ImportedFile, ProductMapping } from "@/lib/types";
import { buildProductMapping, effectiveCategory } from "@/lib/classification/productClassifier";
import { resolveColumn, toNumber, toText } from "./columnResolver";
import type {
  KpiResult,
  BreakdownRow,
  CashierRow,
  DailyRow,
  HourlyRow,
  ReconciliationRow,
  UnclassifiedProduct,
} from "./types";

function pct(part: number, whole: number): number | null {
  if (!whole) return null;
  return (part / whole) * 100;
}

function sumBy<T>(rows: T[], fn: (r: T) => number): number {
  return rows.reduce((acc, r) => acc + fn(r), 0);
}

function toBreakdown(map: Map<string, { quantity: number; revenue: number }>, totalRevenue: number): BreakdownRow[] {
  return Array.from(map.entries())
    .map(([label, v]) => ({
      label,
      quantity: v.quantity,
      revenue: v.revenue,
      sharePct: pct(v.revenue, totalRevenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function calculateKpis(
  imports: ImportedFile[],
  productMappings: Record<string, ProductMapping>,
  cashierDepartments: Record<string, string>,
  reconciliationTolerancePct: number
): KpiResult {
  const invoiceFile = imports.find((f) => f.reportType === "SALES_BY_INVOICE" && f.status !== "UNSUPPORTED");
  const categoryFile = imports.find((f) => f.reportType === "SALES_BY_CATEGORY" && f.status !== "UNSUPPORTED");
  const userFile = imports.find((f) => f.reportType === "SALES_BY_USER" && f.status !== "UNSUPPORTED");
  const paymentFile = imports.find((f) => f.reportType === "SALES_BY_PAYMENT_METHOD" && f.status !== "UNSUPPORTED");
  const periodFile = imports.find((f) => f.reportType === "SALES_BY_PERIOD" && f.status !== "UNSUPPORTED");

  const missingFields: string[] = [];
  const unclassifiedMap = new Map<string, UnclassifiedProduct>();
  const unknownCashiers = new Set<string>();

  const result: KpiResult = {
    hasInvoiceLevelData: !!invoiceFile,
    dateRangeAvailable: false,
    timeAvailable: false,
    totalSalesInclVat: null,
    netSales: null,
    totalChildVisits: null,
    paidTicketEntries: null,
    secondVisitEntries: null,
    revenuePerChildVisit: null,
    ticketRevenue: null,
    cafeRevenue: null,
    cafeRevenuePerChild: null,
    averageTransactionValue: null,
    transactions: null,
    returnsQuantity: null,
    returnsValue: null,
    ticketRevenueSharePct: null,
    cafeRevenueSharePct: null,
    otherRevenueSharePct: null,
    facePaintingRevenue: null,
    facePaintingCount: null,
    facePaintingPenetrationPct: null,
    toyRevenue: null,
    activityRevenue: null,
    membershipRevenue: null,
    membershipSoldCount: null,
    byCashier: [],
    byCategory: [],
    byProduct: [],
    byPaymentMethod: [],
    ticketMix: [],
    dailySeries: [],
    hourlySeries: [],
    reconciliation: [],
    unclassifiedProducts: [],
    unknownCashiers: [],
    missingFields: [],
    categoryRevenue: {},
  };

  if (invoiceFile) {
    const cols = invoiceFile.columns;
    const productCol = resolveColumn(cols, "product");
    const qtyCol = resolveColumn(cols, "quantity");
    const totalCol = resolveColumn(cols, "lineTotal");
    const vatCol = resolveColumn(cols, "vat");
    const dateCol = resolveColumn(cols, "date");
    const timeCol = resolveColumn(cols, "time");
    const cashierCol = resolveColumn(cols, "cashier");
    const paymentCol = resolveColumn(cols, "paymentMethod");
    const invoiceCol = resolveColumn(cols, "invoiceNumber");
    const returnedQtyCol = resolveColumn(cols, "returnedQuantity");

    if (!productCol) missingFields.push("عمود المنتج في تقرير الفواتير");
    if (!qtyCol) missingFields.push("عمود الكمية في تقرير الفواتير");
    if (!totalCol) missingFields.push("عمود إجمالي المبيعات في تقرير الفواتير");

    let totalSales = 0;
    let vatTotal = 0;
    let hasVat = false;
    let ticketRevenue = 0;
    let cafeRevenue = 0;
    let facePaintingRevenue = 0;
    let facePaintingCount = 0;
    let toyRevenue = 0;
    let activityRevenue = 0;
    let membershipRevenue = 0;
    let membershipSoldCount = 0;
    let paidTicketEntries = 0;
    let secondVisitEntries = 0;
    let returnsQuantity = 0;
    let returnsValue = 0;

    const invoiceNumbers = new Set<string>();
    const categoryMap = new Map<string, { quantity: number; revenue: number }>();
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    const paymentMap = new Map<string, { quantity: number; revenue: number }>();
    const ticketMixMap = new Map<string, { quantity: number; revenue: number }>();
    const cashierMap = new Map<string, { sales: number; quantity: number; returns: number }>();
    const dailyMap = new Map<string, { sales: number; childVisits: number; cafeRevenue: number }>();
    const hourlyMap = new Map<number, { sales: number; childEntries: number }>();

    for (const row of invoiceFile.rows) {
      const productName = productCol ? toText(row[productCol]) : null;
      const quantity = qtyCol ? toNumber(row[qtyCol]) ?? 0 : 0;
      const lineTotal = totalCol ? toNumber(row[totalCol]) ?? 0 : 0;
      const vat = vatCol ? toNumber(row[vatCol]) : null;
      const cashier = cashierCol ? toText(row[cashierCol]) : null;
      const payment = paymentCol ? toText(row[paymentCol]) : null;
      const invoiceNo = invoiceCol ? toText(row[invoiceCol]) : null;
      const dateVal = dateCol ? toText(row[dateCol]) : null;
      const timeVal = timeCol ? toText(row[timeCol]) : null;
      const returnedQty = returnedQtyCol ? toNumber(row[returnedQtyCol]) ?? 0 : 0;

      totalSales += lineTotal;
      if (vat !== null) {
        vatTotal += vat;
        hasVat = true;
      }
      if (invoiceNo) invoiceNumbers.add(invoiceNo);
      if (returnedQty && returnedQty > 0) {
        returnsQuantity += returnedQty;
        returnsValue += (lineTotal / (quantity || 1)) * returnedQty;
      } else if (quantity < 0) {
        returnsQuantity += Math.abs(quantity);
        returnsValue += Math.abs(lineTotal);
      }

      if (!productName) continue;

      let mapping = productMappings[productName];
      if (!mapping) {
        mapping = buildProductMapping(productName);
      }
      const category = effectiveCategory(mapping);

      if (mapping.needsReview && mapping.manualCategory === null) {
        const existing = unclassifiedMap.get(productName);
        unclassifiedMap.set(productName, {
          productName,
          confidence: mapping.confidence,
          quantity: (existing?.quantity ?? 0) + quantity,
          revenue: (existing?.revenue ?? 0) + lineTotal,
        });
      }

      categoryMap.set(category, {
        quantity: (categoryMap.get(category)?.quantity ?? 0) + quantity,
        revenue: (categoryMap.get(category)?.revenue ?? 0) + lineTotal,
      });
      productMap.set(productName, {
        quantity: (productMap.get(productName)?.quantity ?? 0) + quantity,
        revenue: (productMap.get(productName)?.revenue ?? 0) + lineTotal,
      });

      if (category === "TICKET") {
        ticketRevenue += lineTotal;
        paidTicketEntries += quantity;
        ticketMixMap.set(productName, {
          quantity: (ticketMixMap.get(productName)?.quantity ?? 0) + quantity,
          revenue: (ticketMixMap.get(productName)?.revenue ?? 0) + lineTotal,
        });
      } else if (category === "SECOND_VISIT") {
        secondVisitEntries += quantity;
        ticketMixMap.set(productName, {
          quantity: (ticketMixMap.get(productName)?.quantity ?? 0) + quantity,
          revenue: (ticketMixMap.get(productName)?.revenue ?? 0) + lineTotal,
        });
      } else if (category === "CAFE") {
        cafeRevenue += lineTotal;
      } else if (category === "FACE_PAINTING") {
        facePaintingRevenue += lineTotal;
        facePaintingCount += quantity;
      } else if (category === "TOY") {
        toyRevenue += lineTotal;
      } else if (category === "ACTIVITY") {
        activityRevenue += lineTotal;
      } else if (category === "MEMBERSHIP") {
        membershipRevenue += lineTotal;
        membershipSoldCount += quantity;
        ticketMixMap.set(productName, {
          quantity: (ticketMixMap.get(productName)?.quantity ?? 0) + quantity,
          revenue: (ticketMixMap.get(productName)?.revenue ?? 0) + lineTotal,
        });
      }

      if (payment) {
        paymentMap.set(payment, {
          quantity: (paymentMap.get(payment)?.quantity ?? 0) + quantity,
          revenue: (paymentMap.get(payment)?.revenue ?? 0) + lineTotal,
        });
      }

      if (cashier) {
        if (!cashierDepartments[cashier]) unknownCashiers.add(cashier);
        const c = cashierMap.get(cashier) ?? { sales: 0, quantity: 0, returns: 0 };
        c.sales += lineTotal;
        c.quantity += quantity;
        if (returnedQty > 0) c.returns += returnedQty;
        cashierMap.set(cashier, c);
      }

      if (dateVal) {
        const d = dailyMap.get(dateVal) ?? { sales: 0, childVisits: 0, cafeRevenue: 0 };
        d.sales += lineTotal;
        if (category === "TICKET" || category === "SECOND_VISIT") d.childVisits += quantity;
        if (category === "CAFE") d.cafeRevenue += lineTotal;
        dailyMap.set(dateVal, d);
      }

      if (timeVal) {
        const hourMatch = timeVal.match(/^(\d{1,2})/);
        if (hourMatch) {
          const hour = Number(hourMatch[1]);
          const h = hourlyMap.get(hour) ?? { sales: 0, childEntries: 0 };
          h.sales += lineTotal;
          if (category === "TICKET" || category === "SECOND_VISIT") h.childEntries += quantity;
          hourlyMap.set(hour, h);
        }
      }
    }

    const totalChildVisits = paidTicketEntries + secondVisitEntries;

    result.totalSalesInclVat = totalSales || null;
    result.netSales = hasVat ? totalSales - vatTotal : null;
    result.paidTicketEntries = paidTicketEntries || null;
    result.secondVisitEntries = secondVisitEntries || null;
    result.totalChildVisits = totalChildVisits || null;
    result.ticketRevenue = ticketRevenue || null;
    result.cafeRevenue = cafeRevenue || null;
    result.facePaintingRevenue = facePaintingRevenue || null;
    result.facePaintingCount = facePaintingCount || null;
    result.toyRevenue = toyRevenue || null;
    result.activityRevenue = activityRevenue || null;
    result.membershipRevenue = membershipRevenue || null;
    result.membershipSoldCount = membershipSoldCount || null;
    result.transactions = invoiceNumbers.size || null;
    result.returnsQuantity = returnsQuantity || null;
    result.returnsValue = returnsValue || null;

    result.revenuePerChildVisit = totalChildVisits > 0 ? totalSales / totalChildVisits : null;
    result.cafeRevenuePerChild = totalChildVisits > 0 ? cafeRevenue / totalChildVisits : null;
    result.averageTransactionValue = invoiceNumbers.size > 0 ? totalSales / invoiceNumbers.size : null;
    result.facePaintingPenetrationPct = totalChildVisits > 0 ? pct(facePaintingCount, totalChildVisits) : null;

    result.ticketRevenueSharePct = pct(ticketRevenue, totalSales);
    result.cafeRevenueSharePct = pct(cafeRevenue, totalSales);
    const otherRevenue = totalSales - ticketRevenue - cafeRevenue;
    result.otherRevenueSharePct = pct(otherRevenue, totalSales);

    result.byCategory = toBreakdown(categoryMap, totalSales);
    result.byProduct = toBreakdown(productMap, totalSales).slice(0, 50);
    result.byPaymentMethod = toBreakdown(paymentMap, totalSales);
    result.ticketMix = toBreakdown(ticketMixMap, ticketRevenue + membershipRevenue);

    result.byCashier = Array.from(cashierMap.entries())
      .map(([cashierName, v]): CashierRow => ({
        cashierName,
        department: cashierDepartments[cashierName] ?? "غير محدد",
        sales: v.sales,
        quantity: v.quantity,
        returns: v.returns,
        salesSharePct: pct(v.sales, totalSales),
      }))
      .sort((a, b) => b.sales - a.sales);

    result.dailySeries = Array.from(dailyMap.entries())
      .map(([date, v]): DailyRow => ({
        date,
        sales: v.sales,
        childVisits: v.childVisits,
        cafeRevenue: v.cafeRevenue,
        revenuePerChild: v.childVisits > 0 ? v.sales / v.childVisits : null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    result.dateRangeAvailable = result.dailySeries.length > 0;

    result.hourlySeries = Array.from(hourlyMap.entries())
      .map(([hour, v]): HourlyRow => ({ hour, sales: v.sales, childEntries: v.childEntries }))
      .sort((a, b) => a.hour - b.hour);
    result.timeAvailable = result.hourlySeries.length > 0;

    result.categoryRevenue = Object.fromEntries(categoryMap.entries()) as never;
  }

  // Reconciliation: compare invoice-level totals against independently
  // reported aggregates when both are available.
  const reconciliation: ReconciliationRow[] = [];
  const addReconciliation = (label: string, a: number | null, b: number | null) => {
    if (a === null || b === null) return;
    const diff = a - b;
    const diffPct = b !== 0 ? (Math.abs(diff) / Math.abs(b)) * 100 : 0;
    reconciliation.push({
      label,
      a,
      b,
      diff,
      diffPct,
      withinTolerance: diffPct <= reconciliationTolerancePct,
    });
  };

  if (categoryFile && result.totalSalesInclVat !== null) {
    const totalCol = resolveColumn(categoryFile.columns, "lineTotal");
    if (totalCol) {
      const sum = sumBy(categoryFile.rows, (r) => toNumber(r[totalCol]) ?? 0);
      addReconciliation("إجمالي المبيعات: الفواتير مقابل ملخص الفئات", result.totalSalesInclVat, sum);
    }
  }
  if (userFile && result.totalSalesInclVat !== null) {
    const totalCol = resolveColumn(userFile.columns, "lineTotal");
    if (totalCol) {
      const sum = sumBy(userFile.rows, (r) => toNumber(r[totalCol]) ?? 0);
      addReconciliation("إجمالي المبيعات: الفواتير مقابل المستخدمين", result.totalSalesInclVat, sum);
    }
  }
  if (paymentFile && result.totalSalesInclVat !== null) {
    const totalCol = resolveColumn(paymentFile.columns, "lineTotal");
    if (totalCol) {
      const sum = sumBy(paymentFile.rows, (r) => toNumber(r[totalCol]) ?? 0);
      addReconciliation("إجمالي المبيعات: الفواتير مقابل طرق الدفع", result.totalSalesInclVat, sum);
    }
  }
  if (periodFile && result.totalSalesInclVat !== null) {
    const totalCol = resolveColumn(periodFile.columns, "lineTotal");
    if (totalCol) {
      const sum = sumBy(periodFile.rows, (r) => toNumber(r[totalCol]) ?? 0);
      addReconciliation("إجمالي المبيعات: الفواتير مقابل الفترة الزمنية", result.totalSalesInclVat, sum);
    }
  }

  result.reconciliation = reconciliation;
  result.unclassifiedProducts = Array.from(unclassifiedMap.values()).sort((a, b) => b.revenue - a.revenue);
  result.unknownCashiers = Array.from(unknownCashiers);
  result.missingFields = missingFields;

  return result;
}

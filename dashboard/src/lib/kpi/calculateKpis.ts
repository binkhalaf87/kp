import type { ImportedFile, ProductMapping } from "@/lib/types";
import { buildProductMapping, effectiveCategory } from "@/lib/classification/productClassifier";
import { resolveColumn, toNumber, toText } from "./columnResolver";
import {
  extractInvoiceSummary,
  extractCategorySummary,
  extractByUserRows,
  extractByCustomerRows,
  extractCustomerProductRows,
  extractPeriodSummary,
  extractProductPerformanceSummary,
} from "@/lib/parsers/extractors";
import { buildProductCatalogMap } from "@/lib/pricing/productCatalog";
import type {
  KpiResult,
  BreakdownRow,
  CashierRow,
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

interface CategoryAgg {
  quantity: number;
  revenue: number;
  allPriced: boolean;
}

function emptyAgg(): CategoryAgg {
  return { quantity: 0, revenue: 0, allPriced: true };
}

function addToAgg(agg: CategoryAgg, quantity: number, unitPrice: number | null) {
  agg.quantity += quantity;
  if (unitPrice !== null) {
    agg.revenue += quantity * unitPrice;
  } else {
    agg.allPriced = false;
  }
}

function toBreakdown(map: Map<string, CategoryAgg>, totalRevenue: number | null): BreakdownRow[] {
  return Array.from(map.entries())
    .map(([label, v]): BreakdownRow => {
      const revenue = v.allPriced ? v.revenue : null;
      return {
        label,
        quantity: v.quantity,
        revenue,
        sharePct: revenue !== null && totalRevenue !== null ? pct(revenue, totalRevenue) : null,
      };
    })
    .sort((a, b) => (b.revenue ?? -1) - (a.revenue ?? -1) || b.quantity - a.quantity);
}

export function calculateKpis(
  imports: ImportedFile[],
  productMappings: Record<string, ProductMapping>,
  cashierDepartments: Record<string, string>,
  reconciliationTolerancePct: number
): KpiResult {
  const findFile = (type: ImportedFile["reportType"]) =>
    imports.find((f) => f.reportType === type && f.status !== "UNSUPPORTED");

  const invoiceSummaryFile = findFile("SALES_BY_INVOICE");
  const categorySummaryFile = findFile("SALES_BY_CATEGORY");
  const userFile = findFile("SALES_BY_USER");
  const customerFile = findFile("SALES_BY_CUSTOMER");
  const customerProductsFile = findFile("CUSTOMER_PRODUCTS");
  const paymentFile = findFile("SALES_BY_PAYMENT_METHOD");
  const periodFile = findFile("SALES_BY_PERIOD");
  const productPerformanceFile = findFile("PRODUCT_PERFORMANCE_SUMMARY");

  const missingFields: string[] = [];
  if (!invoiceSummaryFile) missingFields.push("لم يتم رفع تقرير \"المبيعات من كل فاتورة\" — إجمالي المبيعات وعدد الفواتير غير متاحة.");
  if (!userFile) missingFields.push("لم يتم رفع تقرير \"المبيعات حسب المستخدمين\" — أداء الكاشير غير متاح.");
  if (!customerProductsFile) missingFields.push("لم يتم رفع تقرير \"منتجات العملاء\" — عدد زيارات الأطفال وتوزيع التذاكر غير متاح.");

  const unclassifiedMap = new Map<string, UnclassifiedProduct>();
  const unknownCashiers = new Set<string>();

  const result: KpiResult = {
    hasInvoiceLevelData: false,
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
    cogs: null,
    grossProfit: null,
    vatTotal: null,
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

  // --- Invoice summary (single aggregate row: totals only, no line items) ---
  let invoiceSalesExVat: number | null = null;
  let distinctProductsInCustomerFile: number | null = null;
  if (invoiceSummaryFile) {
    const summary = extractInvoiceSummary(invoiceSummaryFile);
    if (summary) {
      invoiceSalesExVat = summary.totalSalesExVat;
      result.totalSalesInclVat = summary.totalSalesInclVat;
      result.netSales = summary.totalSalesExVat;
      result.transactions = summary.transactions;
      result.averageTransactionValue = summary.avgTransactionValue;
      result.returnsQuantity = summary.returnedQty;
      result.cogs = summary.cogs;
      result.grossProfit = summary.grossProfit;
      result.vatTotal = summary.vatTotal;
    }
  }

  // --- Cashier performance: read directly from the by-user report's own
  // revenue/COGS/profit columns — no line-item derivation needed or possible. ---
  if (userFile) {
    const rows = extractByUserRows(userFile);
    result.byCashier = rows
      .map((r): CashierRow => {
        if (!cashierDepartments[r.name]) unknownCashiers.add(r.name);
        return {
          cashierName: r.name,
          department: cashierDepartments[r.name] ?? "غير محدد",
          sales: r.salesInclVat,
          quantity: r.qtySold,
          returns: r.qtyReturned,
          salesSharePct: result.totalSalesInclVat ? pct(r.salesInclVat, result.totalSalesInclVat) : null,
        };
      })
      .sort((a, b) => b.sales - a.sales);
  }

  // --- Customer products: the only row-level report. Quantity per product,
  // no price/revenue — classified via the product mapping to derive child
  // visit counts (never from "quantity sold" in general, only ticket-type
  // products) and, where a unit price has been entered, revenue splits. ---
  if (customerProductsFile) {
    const rows = extractCustomerProductRows(customerProductsFile);
    // Rewaa's own product-catalog export (simple/variable products, if
    // uploaded) gives a real per-product price — used only when the user
    // hasn't manually overridden it in the classification page.
    const catalogPrices = buildProductCatalogMap(imports);
    const hasAnyManualPrice = Object.values(productMappings).some((m) => m.unitPrice !== null);
    if (catalogPrices.size === 0 && !hasAnyManualPrice) {
      missingFields.push(
        'لم يتم رفع كتالوج أسعار المنتجات من رواء ("simpleProducts.csv" و"variableProducts.csv") ولا إدخال أسعار يدوية — لذلك إيراد الفئات (الكوفي، الرسم على الوجه، الاشتراكات، إلخ) غير متاح رغم توفر الكميات المباعة. ارفعهما في صفحة الاستيراد لتفعيل هذه الحسابات.'
      );
    }

    const categoryMap = new Map<string, CategoryAgg>();
    const productMap = new Map<string, CategoryAgg>();
    const ticketMixMap = new Map<string, CategoryAgg>();

    let paidTicketEntries = 0;
    let secondVisitEntries = 0;
    let facePaintingCount = 0;
    let membershipSoldCount = 0;

    const categoryAgg: Record<string, CategoryAgg> = {};
    const getCategoryAgg = (key: string) => {
      if (!categoryAgg[key]) categoryAgg[key] = emptyAgg();
      return categoryAgg[key];
    };

    for (const row of rows) {
      const productName = row.productName;
      let mapping = productMappings[productName];
      if (!mapping) mapping = buildProductMapping(productName);
      const category = effectiveCategory(mapping);
      const unitPrice = mapping.unitPrice ?? catalogPrices.get(productName)?.retailPrice ?? null;
      const quantity = row.quantity;

      if (mapping.needsReview && mapping.manualCategory === null) {
        const existing = unclassifiedMap.get(productName);
        unclassifiedMap.set(productName, {
          productName,
          confidence: mapping.confidence,
          quantity: (existing?.quantity ?? 0) + quantity,
          revenue: existing?.revenue ?? 0,
        });
      }

      const catAgg = categoryMap.get(category) ?? emptyAgg();
      addToAgg(catAgg, quantity, unitPrice);
      categoryMap.set(category, catAgg);

      const prodAgg = productMap.get(productName) ?? emptyAgg();
      addToAgg(prodAgg, quantity, unitPrice);
      productMap.set(productName, prodAgg);

      addToAgg(getCategoryAgg(category), quantity, unitPrice);

      if (category === "TICKET") {
        paidTicketEntries += quantity;
        const m = ticketMixMap.get(productName) ?? emptyAgg();
        addToAgg(m, quantity, unitPrice);
        ticketMixMap.set(productName, m);
      } else if (category === "SECOND_VISIT") {
        secondVisitEntries += quantity;
        const m = ticketMixMap.get(productName) ?? emptyAgg();
        addToAgg(m, quantity, unitPrice);
        ticketMixMap.set(productName, m);
      } else if (category === "FACE_PAINTING") {
        facePaintingCount += quantity;
      } else if (category === "MEMBERSHIP") {
        membershipSoldCount += quantity;
        const m = ticketMixMap.get(productName) ?? emptyAgg();
        addToAgg(m, quantity, unitPrice);
        ticketMixMap.set(productName, m);
      }
    }

    // Direct assignment, not "|| null": we're inside the customerProductsFile
    // branch, so a computed 0 here (e.g. no second visits this period) is a
    // real answer and must render as 0, not be mislabeled "unavailable".
    const totalChildVisits = paidTicketEntries + secondVisitEntries;
    result.paidTicketEntries = paidTicketEntries;
    result.secondVisitEntries = secondVisitEntries;
    result.totalChildVisits = totalChildVisits;
    result.facePaintingCount = facePaintingCount;
    result.membershipSoldCount = membershipSoldCount;

    // Revenue-per-visit uses the REAL total sales aggregate (from the
    // invoice summary), not a sum of per-product revenue — so it stays
    // accurate even when most products have no unit price entered yet.
    result.revenuePerChildVisit =
      totalChildVisits > 0 && result.totalSalesInclVat !== null ? result.totalSalesInclVat / totalChildVisits : null;

    const ticketAgg = getCategoryAgg("TICKET");
    const cafeAgg = getCategoryAgg("CAFE");
    const facePaintingAgg = getCategoryAgg("FACE_PAINTING");
    const toyAgg = getCategoryAgg("TOY");
    const activityAgg = getCategoryAgg("ACTIVITY");
    const membershipAgg = getCategoryAgg("MEMBERSHIP");

    // "allPriced" alone is the right test — it's true by default on an
    // untouched (0-quantity) aggregate, so a category with no sales this
    // period correctly reports 0 revenue instead of being mislabeled
    // "unavailable" (that label is reserved for "has sales but no price").
    result.ticketRevenue = ticketAgg.allPriced ? ticketAgg.revenue : null;
    result.cafeRevenue = cafeAgg.allPriced ? cafeAgg.revenue : null;
    result.facePaintingRevenue = facePaintingAgg.allPriced ? facePaintingAgg.revenue : null;
    result.toyRevenue = toyAgg.allPriced ? toyAgg.revenue : null;
    result.activityRevenue = activityAgg.allPriced ? activityAgg.revenue : null;
    result.membershipRevenue = membershipAgg.allPriced ? membershipAgg.revenue : null;

    result.cafeRevenuePerChild =
      result.cafeRevenue !== null && totalChildVisits > 0 ? result.cafeRevenue / totalChildVisits : null;
    result.facePaintingPenetrationPct = totalChildVisits > 0 ? pct(facePaintingCount, totalChildVisits) : null;

    if (result.totalSalesInclVat !== null) {
      result.ticketRevenueSharePct = result.ticketRevenue !== null ? pct(result.ticketRevenue, result.totalSalesInclVat) : null;
      result.cafeRevenueSharePct = result.cafeRevenue !== null ? pct(result.cafeRevenue, result.totalSalesInclVat) : null;
      if (result.ticketRevenue !== null && result.cafeRevenue !== null) {
        const otherRevenue = result.totalSalesInclVat - result.ticketRevenue - result.cafeRevenue;
        result.otherRevenueSharePct = pct(otherRevenue, result.totalSalesInclVat);
      }
    }

    // Share-of-total-sales is meaningful once a row's own revenue is known,
    // even if other rows/categories still lack a price — so use the real
    // company-wide total (from the invoice summary) as the denominator
    // rather than requiring every category to be priced first.
    result.byCategory = toBreakdown(categoryMap, result.totalSalesInclVat);
    result.byProduct = toBreakdown(productMap, result.totalSalesInclVat).slice(0, 50);
    const ticketMixTotal =
      result.ticketRevenue !== null && result.membershipRevenue !== null
        ? result.ticketRevenue + result.membershipRevenue
        : null;
    result.ticketMix = toBreakdown(ticketMixMap, ticketMixTotal);

    result.categoryRevenue = Object.fromEntries(
      Object.entries(categoryAgg).map(([k, v]) => [k, v.allPriced ? v.revenue : 0])
    ) as never;

    distinctProductsInCustomerFile = productMap.size;
  }

  // --- Payment method breakdown: not confirmed against a real Rewaa file
  // yet, kept as a best-effort fallback for whichever shape gets uploaded. ---
  if (paymentFile) {
    const methodCol = resolveColumn(paymentFile.columns, "paymentMethod");
    const amountCol = resolveColumn(paymentFile.columns, "lineTotal");
    if (methodCol && amountCol) {
      const map = new Map<string, CategoryAgg>();
      for (const row of paymentFile.rows) {
        const method = toText(row[methodCol]);
        const amount = toNumber(row[amountCol]) ?? 0;
        if (!method) continue;
        const agg = map.get(method) ?? emptyAgg();
        agg.quantity += 1;
        agg.revenue += amount;
        map.set(method, agg);
      }
      const total = sumBy(Array.from(map.values()), (v) => v.revenue);
      result.byPaymentMethod = toBreakdown(map, total || null);
    }
  }

  // --- Reconciliation: cross-check the same "total sales" figure across
  // every independently-reported aggregate/entity file we have. ---
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

  if (categorySummaryFile) {
    const catSummary = extractCategorySummary(categorySummaryFile);
    if (catSummary) {
      addReconciliation("إجمالي المبيعات (بدون ضريبة): الفواتير مقابل ملخص الفئات", invoiceSalesExVat, catSummary.totalSalesExVat);
    }
  }
  if (userFile) {
    const rows = extractByUserRows(userFile);
    const sum = sumBy(rows, (r) => r.sales);
    addReconciliation("إجمالي المبيعات (بدون ضريبة): الفواتير مقابل المستخدمين", invoiceSalesExVat, sum);
  }
  if (customerFile) {
    const rows = extractByCustomerRows(customerFile);
    const sum = sumBy(rows, (r) => r.sales);
    addReconciliation("إجمالي المبيعات (بدون ضريبة): الفواتير مقابل العملاء", invoiceSalesExVat, sum);
  }
  if (paymentFile) {
    const amountCol = resolveColumn(paymentFile.columns, "lineTotal");
    if (amountCol) {
      const sum = sumBy(paymentFile.rows, (r) => toNumber(r[amountCol]) ?? 0);
      addReconciliation("إجمالي المبيعات: الفواتير مقابل طرق الدفع", result.totalSalesInclVat, sum);
    }
  }
  if (periodFile) {
    const periodSummary = extractPeriodSummary(periodFile);
    if (periodSummary) {
      addReconciliation("إجمالي المبيعات (بدون ضريبة): الفواتير مقابل ملخص الفترة الزمنية", invoiceSalesExVat, periodSummary.totalSalesExVat);
    }
  }
  if (productPerformanceFile) {
    const productSummary = extractProductPerformanceSummary(productPerformanceFile);
    if (productSummary) {
      addReconciliation("إجمالي المبيعات (بدون ضريبة): الفواتير مقابل تقرير أداء المنتج", invoiceSalesExVat, productSummary.totalSalesExVat);
      addReconciliation("عدد المنتجات: تقرير أداء المنتج مقابل منتجات العملاء", productSummary.totalProducts, distinctProductsInCustomerFile);
    }
  }

  result.reconciliation = reconciliation;
  result.unclassifiedProducts = Array.from(unclassifiedMap.values()).sort((a, b) => b.quantity - a.quantity);
  result.unknownCashiers = Array.from(unknownCashiers);
  result.missingFields = missingFields;

  return result;
}

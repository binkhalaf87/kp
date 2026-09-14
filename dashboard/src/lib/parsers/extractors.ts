import { normalizeColumnName } from "./reportSchemas";
import { toNumber, toText } from "@/lib/kpi/columnResolver";
import type { ImportedFile, ParsedRow } from "@/lib/types";

/**
 * Finds the column whose normalized name equals (not just contains) one of
 * the given candidates. Used because these report shapes are now confirmed
 * from real files, so exact matching (tolerant only of normalizeColumnName's
 * diacritic/whitespace folding) is safer than fuzzy substring matching —
 * e.g. "المبيعات" alone must NOT match "المبيعات (شاملة الضريبة)".
 */
function findExactColumn(columns: string[], candidates: string[]): string | null {
  const normCandidates = candidates.map(normalizeColumnName);
  for (const col of columns) {
    if (normCandidates.includes(normalizeColumnName(col))) return col;
  }
  return null;
}

function getNum(row: ParsedRow, col: string | null): number | null {
  if (!col) return null;
  return toNumber(row[col]);
}

function getText(row: ParsedRow, col: string | null): string | null {
  if (!col) return null;
  return toText(row[col]);
}

export interface InvoiceSummary {
  totalSalesExVat: number | null;
  transactions: number | null;
  avgTransactionValue: number | null;
  totalSalesInclVat: number | null;
  cogs: number | null;
  grossProfit: number | null;
  soldQty: number | null;
  returnedQty: number | null;
  vatTotal: number | null;
}

/** "تقرير المبيعات من كل فاتورة" — a single aggregate row, not itemized. */
export function extractInvoiceSummary(file: ImportedFile): InvoiceSummary | null {
  const row = file.rows[0];
  if (!row) return null;
  const cols = file.columns;
  return {
    totalSalesExVat: getNum(row, findExactColumn(cols, ["إجمالي المبيعات"])),
    transactions: getNum(row, findExactColumn(cols, ["إجمالي الفواتير"])),
    avgTransactionValue: getNum(row, findExactColumn(cols, ["متوسط مبيعات الفواتير"])),
    totalSalesInclVat: getNum(row, findExactColumn(cols, ["المبيعات (شاملة الضريبة)", "المبيعات (شامل الضريبة)"])),
    cogs: getNum(row, findExactColumn(cols, ["إجمالي تكلفة البضاعة المباعة"])),
    grossProfit: getNum(row, findExactColumn(cols, ["إجمالي قيمة الربح"])),
    soldQty: getNum(row, findExactColumn(cols, ["إجمالي الكميات المباعة"])),
    returnedQty: getNum(row, findExactColumn(cols, ["إجمالي الكميات المرتجعة"])),
    vatTotal: getNum(row, findExactColumn(cols, ["إجمالي الضريبة"])),
  };
}

export interface CategorySummary {
  totalSalesExVat: number | null;
  categoryCount: number | null;
  avgCategorySales: number | null;
  totalSalesInclVat: number | null;
  soldQty: number | null;
  returnedQty: number | null;
  cogs: number | null;
  grossProfit: number | null;
}

/** "ملخص المبيعات بحسب الفئة" — a single aggregate row (category COUNT, not a breakdown). */
export function extractCategorySummary(file: ImportedFile): CategorySummary | null {
  const row = file.rows[0];
  if (!row) return null;
  const cols = file.columns;
  return {
    totalSalesExVat: getNum(row, findExactColumn(cols, ["إجمالي المبيعات"])),
    categoryCount: getNum(row, findExactColumn(cols, ["إجمالي الفئات"])),
    avgCategorySales: getNum(row, findExactColumn(cols, ["متوسط مبيعات الفئات"])),
    totalSalesInclVat: getNum(row, findExactColumn(cols, ["إجمالي المبيعات (شاملة الضريبة)"])),
    soldQty: getNum(row, findExactColumn(cols, ["إجمالي الكميات المباعة"])),
    returnedQty: getNum(row, findExactColumn(cols, ["إجمالي الكميات المرتجعة"])),
    cogs: getNum(row, findExactColumn(cols, ["إجمالي تكلفة البضاعة المباعة"])),
    grossProfit: getNum(row, findExactColumn(cols, ["إجمالي قيمة الربح"])),
  };
}

export interface PeriodSummary {
  totalSalesExVat: number | null;
  vatTotal: number | null;
  totalSalesInclVat: number | null;
  soldQty: number | null;
  returnedQty: number | null;
  cogs: number | null;
  grossProfit: number | null;
}

/**
 * "ملخص المبيعات حسب الفترة الزمنية" — a single aggregate row for the whole
 * period, near-duplicate of the invoice summary. Its first column
 * ("إجمالي المبيعات (شاملة الضريبة)") is confirmed mislabeled in real
 * exports — it actually holds an invoice-count-like figure, not a sales
 * total — so it is deliberately never read here; every other column lines
 * up with its own name. Useful mainly as an independent reconciliation
 * cross-check against the invoice summary.
 */
export function extractPeriodSummary(file: ImportedFile): PeriodSummary | null {
  const row = file.rows[0];
  if (!row) return null;
  const cols = file.columns;
  return {
    totalSalesExVat: getNum(row, findExactColumn(cols, ["إجمالي المبيعات"])),
    vatTotal: getNum(row, findExactColumn(cols, ["ضريبة المبيعات"])),
    totalSalesInclVat: getNum(row, findExactColumn(cols, ["المبيعات (شامل الضريبة)", "المبيعات (شاملة الضريبة)"])),
    soldQty: getNum(row, findExactColumn(cols, ["إجمالي الكمية المباعة"])),
    returnedQty: getNum(row, findExactColumn(cols, ["إجمالي الكمية المرتجعة"])),
    cogs: getNum(row, findExactColumn(cols, ["إجمالي تكلفة البضاعة المباعة"])),
    grossProfit: getNum(row, findExactColumn(cols, ["إجمالي قيمة الربح"])),
  };
}

export interface ProductPerformanceSummary {
  totalSalesExVat: number | null;
  cogs: number | null;
  grossProfit: number | null;
  vatTotal: number | null;
  totalSalesInclVat: number | null;
  totalProducts: number | null;
  avgProductSales: number | null;
}

/**
 * "تقرير أداء المنتج" — a single aggregate row keyed by distinct PRODUCT
 * count (like the category summary is keyed by category count), no
 * per-product breakdown despite the name. "totalProducts" gives an
 * independent count of distinct products sold, cross-checkable against the
 * distinct product names seen in the customer-products file.
 */
export function extractProductPerformanceSummary(file: ImportedFile): ProductPerformanceSummary | null {
  const row = file.rows[0];
  if (!row) return null;
  const cols = file.columns;
  return {
    totalSalesExVat: getNum(row, findExactColumn(cols, ["إجمالي المبيعات"])),
    cogs: getNum(row, findExactColumn(cols, ["إجمالي تكلفة البضاعة المباعة"])),
    grossProfit: getNum(row, findExactColumn(cols, ["إجمالي قيمة الربح"])),
    vatTotal: getNum(row, findExactColumn(cols, ["إجمالي الضريبة"])),
    totalSalesInclVat: getNum(row, findExactColumn(cols, ["إجمالي المبيعات (شاملة الضريبة)"])),
    totalProducts: getNum(row, findExactColumn(cols, ["إجمالي المنتجات"])),
    avgProductSales: getNum(row, findExactColumn(cols, ["متوسط مبيعات المنتجات"])),
  };
}

export interface EntityRow {
  name: string;
  sales: number;
  cogs: number;
  profit: number;
  salesInclVat: number;
  qtySold: number;
  qtyReturned: number;
}

/** "المبيعات حسب المستخدمين" — one row per cashier/user. */
export function extractByUserRows(file: ImportedFile): EntityRow[] {
  const cols = file.columns;
  const nameCol = findExactColumn(cols, ["المستخدم / الوظيفة", "المستخدم/الوظيفة"]);
  const salesCol = findExactColumn(cols, ["المبيعات"]);
  const cogsCol = findExactColumn(cols, ["تكلفة البضاعة المباعة"]);
  const profitCol = findExactColumn(cols, ["قيمة الربح"]);
  const salesVatCol = findExactColumn(cols, ["المبيعات (شاملة الضريبة)", "المبيعات (شامل الضريبة)"]);
  const qtySoldCol = findExactColumn(cols, ["الكمية المباعة"]);
  const qtyReturnedCol = findExactColumn(cols, ["الكمية المرتجعة"]);

  return file.rows
    .map((row) => {
      const name = getText(row, nameCol);
      if (!name) return null;
      return {
        name,
        sales: getNum(row, salesCol) ?? 0,
        cogs: getNum(row, cogsCol) ?? 0,
        profit: getNum(row, profitCol) ?? 0,
        salesInclVat: getNum(row, salesVatCol) ?? 0,
        qtySold: getNum(row, qtySoldCol) ?? 0,
        qtyReturned: getNum(row, qtyReturnedCol) ?? 0,
      };
    })
    .filter((r): r is EntityRow => r !== null);
}

/** "المبيعات حسب العملاء" — one row per customer. Same shape as by-user. */
export function extractByCustomerRows(file: ImportedFile): EntityRow[] {
  const cols = file.columns;
  const nameCol = findExactColumn(cols, ["اسم العميل"]);
  const salesCol = findExactColumn(cols, ["المبيعات"]);
  const cogsCol = findExactColumn(cols, ["تكلفة البضاعة المباعة"]);
  const profitCol = findExactColumn(cols, ["قيمة الربح"]);
  const salesVatCol = findExactColumn(cols, ["المبيعات (شاملة الضريبة)", "المبيعات (شامل الضريبة)"]);
  const qtySoldCol = findExactColumn(cols, ["الكمية المباعة"]);
  const qtyReturnedCol = findExactColumn(cols, ["الكمية المرتجعة"]);

  return file.rows
    .map((row) => {
      const name = getText(row, nameCol);
      if (!name) return null;
      return {
        name,
        sales: getNum(row, salesCol) ?? 0,
        cogs: getNum(row, cogsCol) ?? 0,
        profit: getNum(row, profitCol) ?? 0,
        salesInclVat: getNum(row, salesVatCol) ?? 0,
        qtySold: getNum(row, qtySoldCol) ?? 0,
        qtyReturned: getNum(row, qtyReturnedCol) ?? 0,
      };
    })
    .filter((r): r is EntityRow => r !== null);
}

export interface ProductCatalogRow {
  productName: string;
  sku: string | null;
  category: string | null;
  cost: number | null;
  stockQuantity: number | null;
  retailPrice: number | null;
  wholesalePrice: number | null;
  onlinePrice: number | null;
  buyPrice: number | null;
}

/**
 * Rewaa's product-catalog export ("simpleProducts.csv" inside its
 * products_export zip) — master product data (name, cost, retail price,
 * current stock), one row per simple (non-variant) product. Not a sales
 * report: never used for KPI totals, only as a real price/cost source for
 * products that also appear in "منتجات العملاء".
 */
export function extractProductCatalogSimple(file: ImportedFile): ProductCatalogRow[] {
  const cols = file.columns;
  const nameCol = findExactColumn(cols, ["Product Name"]);
  const skuCol = findExactColumn(cols, ["Product SKU"]);
  const categoryCol = findExactColumn(cols, ["Category"]);
  const costCol = findExactColumn(cols, ["Cost"]);
  const stockCol = findExactColumn(cols, ["1 Quantity"]);
  const retailCol = findExactColumn(cols, ["1 Retail Price"]);
  const wholesaleCol = findExactColumn(cols, ["1 WholeSale Price"]);
  const onlineCol = findExactColumn(cols, ["1 Online Price"]);
  const buyCol = findExactColumn(cols, ["1 Buy Price"]);

  return file.rows
    .map((row) => {
      const productName = getText(row, nameCol);
      if (!productName) return null;
      return {
        productName,
        sku: getText(row, skuCol),
        category: getText(row, categoryCol),
        cost: getNum(row, costCol),
        stockQuantity: getNum(row, stockCol),
        retailPrice: getNum(row, retailCol),
        wholesalePrice: getNum(row, wholesaleCol),
        onlinePrice: getNum(row, onlineCol),
        buyPrice: getNum(row, buyCol),
      };
    })
    .filter((r): r is ProductCatalogRow => r !== null);
}

/**
 * Rewaa's "variableProducts.csv" — one row per VARIANT (e.g. each ticket
 * tier/duration combo). "Variant Name" is the exact product name string
 * used in "منتجات العملاء" for these products (e.g. "تذكرة لعب فردي-ساعة").
 */
export function extractProductCatalogVariable(file: ImportedFile): ProductCatalogRow[] {
  const cols = file.columns;
  const nameCol = findExactColumn(cols, ["Variant Name"]);
  const skuCol = findExactColumn(cols, ["Variant SKU"]);
  const categoryCol = findExactColumn(cols, ["Category"]);
  const costCol = findExactColumn(cols, ["Cost"]);
  const stockCol = findExactColumn(cols, ["1 Quantity"]);
  const retailCol = findExactColumn(cols, ["1 Retail Price"]);
  const wholesaleCol = findExactColumn(cols, ["1 WholeSale Price"]);
  const onlineCol = findExactColumn(cols, ["1 Online Price"]);
  const buyCol = findExactColumn(cols, ["1 Buy Price"]);

  return file.rows
    .map((row) => {
      const productName = getText(row, nameCol);
      if (!productName) return null;
      return {
        productName,
        sku: getText(row, skuCol),
        category: getText(row, categoryCol),
        cost: getNum(row, costCol),
        stockQuantity: getNum(row, stockCol),
        retailPrice: getNum(row, retailCol),
        wholesalePrice: getNum(row, wholesaleCol),
        onlinePrice: getNum(row, onlineCol),
        buyPrice: getNum(row, buyCol),
      };
    })
    .filter((r): r is ProductCatalogRow => r !== null);
}

export interface CustomerProductRow {
  customerName: string;
  phone: string | null;
  productName: string;
  productId: string | null;
  quantity: number;
}

/**
 * "منتجات العملاء" — the only row-level report available. Quantity per
 * customer+product, but NO price/revenue column — revenue-based metrics
 * need a manually-entered unit price (see classification page) to compute.
 */
export function extractCustomerProductRows(file: ImportedFile): CustomerProductRow[] {
  const cols = file.columns;
  const customerCol = findExactColumn(cols, ["اسم العميل"]);
  const phoneCol = findExactColumn(cols, ["رقم هاتف العميل"]);
  const productCol = findExactColumn(cols, ["اسم المنتج"]);
  const productIdCol = findExactColumn(cols, ["الرقم التعريفي"]);
  const qtyCol = findExactColumn(cols, ["الكمية"]);

  return file.rows
    .map((row) => {
      const customerName = getText(row, customerCol);
      const productName = getText(row, productCol);
      if (!productName) return null;
      return {
        customerName: customerName ?? "غير معروف",
        phone: getText(row, phoneCol),
        productName,
        productId: getText(row, productIdCol),
        quantity: getNum(row, qtyCol) ?? 0,
      };
    })
    .filter((r): r is CustomerProductRow => r !== null);
}

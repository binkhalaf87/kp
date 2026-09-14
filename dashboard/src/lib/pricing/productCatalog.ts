import type { ImportedFile } from "@/lib/types";
import {
  extractProductCatalogSimple,
  extractProductCatalogVariable,
  type ProductCatalogRow,
} from "@/lib/parsers/extractors";

/**
 * Merges Rewaa's product-catalog exports (simple + variable) into a single
 * lookup by exact product name — the same name strings used in "منتجات
 * العملاء" and in product classification. This is the one place that
 * bridges "what did Rewaa charge for this product" into the KPI engine;
 * everywhere else treats a product's price as unavailable unless it's here
 * or manually entered.
 */
export function buildProductCatalogMap(imports: ImportedFile[]): Map<string, ProductCatalogRow> {
  const map = new Map<string, ProductCatalogRow>();

  for (const file of imports) {
    if (file.status === "UNSUPPORTED") continue;
    if (file.reportType === "PRODUCT_CATALOG_SIMPLE") {
      for (const row of extractProductCatalogSimple(file)) map.set(row.productName, row);
    } else if (file.reportType === "PRODUCT_CATALOG_VARIABLE") {
      for (const row of extractProductCatalogVariable(file)) map.set(row.productName, row);
    }
  }

  return map;
}

"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useDashboardStore } from "@/lib/store";
import { buildProductMapping, effectiveCategory } from "@/lib/classification/productClassifier";
import { extractCustomerProductRows } from "@/lib/parsers/extractors";
import { buildProductCatalogMap } from "@/lib/pricing/productCatalog";
import { PRODUCT_CATEGORY_LABELS_AR, type ProductCategory } from "@/lib/types";
import { formatSar, formatNumber, UNAVAILABLE_LABEL } from "@/lib/utils/format";

const CATEGORIES = Object.keys(PRODUCT_CATEGORY_LABELS_AR) as ProductCategory[];

export default function ClassificationPage() {
  const imports = useDashboardStore((s) => s.imports);
  const productMappings = useDashboardStore((s) => s.productMappings);
  const upsertProductMapping = useDashboardStore((s) => s.upsertProductMapping);

  const productsFile = imports.find((f) => f.reportType === "CUSTOMER_PRODUCTS");
  const hasCatalog = imports.some(
    (f) => f.reportType === "PRODUCT_CATALOG_SIMPLE" || f.reportType === "PRODUCT_CATALOG_VARIABLE"
  );

  const productNames = useMemo(() => {
    if (!productsFile) return [];
    const names = new Set<string>();
    for (const row of extractCustomerProductRows(productsFile)) {
      names.add(row.productName);
    }
    return Array.from(names).sort();
  }, [productsFile]);

  const catalog = useMemo(() => buildProductCatalogMap(imports), [imports]);

  if (!productsFile) {
    return (
      <div>
        <PageHeader title="تصنيف المنتجات" description="يحتاج هذا القسم إلى تقرير 'منتجات العملاء' لعرض قائمة المنتجات." />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تصنيف المنتجات"
        description={
          '"مجموعة" في اسم التذكرة تصنيف سعري فقط — كل وحدة مباعة = دخول طفل واحد. ' +
          (hasCatalog
            ? "تم استيراد الأسعار تلقائيًا من كتالوج منتجات رواء (عمود \"السعر من رواء\"). عدّل \"سعر الوحدة اليدوي\" فقط لتجاوز سعر منتج معيّن."
            : "تقرير \"منتجات العملاء\" لا يحتوي على سعر لكل منتج — أدخل السعر يدويًا هنا، أو ارفع ملفي كتالوج المنتجات من رواء (simpleProducts.csv و variableProducts.csv) لملء الأسعار تلقائيًا.")
        }
      />

      <div className="kp-card overflow-x-auto">
        <table className="kp-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>التصنيف المكتشف</th>
              <th>التصنيف اليدوي</th>
              <th>يُحتسب كدخول طفل؟</th>
              <th>يُحتسب كزيارة ثانية؟</th>
              <th>القسم</th>
              <th>السعر من رواء</th>
              <th>التكلفة</th>
              <th>المخزون الحالي</th>
              <th>سعر الوحدة اليدوي (ر.س)</th>
            </tr>
          </thead>
          <tbody>
            {productNames.map((name) => {
              const mapping = productMappings[name] ?? buildProductMapping(name);
              const category = effectiveCategory(mapping);
              const catalogEntry = catalog.get(name) ?? null;
              return (
                <tr key={name} className={mapping.needsReview && !mapping.manualCategory ? "bg-amber-50" : undefined}>
                  <td className="font-bold">{name}</td>
                  <td>{PRODUCT_CATEGORY_LABELS_AR[mapping.detectedCategory]}</td>
                  <td>
                    <select
                      value={mapping.manualCategory ?? ""}
                      onChange={(e) =>
                        upsertProductMapping({
                          ...mapping,
                          manualCategory: (e.target.value || null) as ProductCategory | null,
                          needsReview: false,
                        })
                      }
                      className="border border-[#e3e7f5] rounded-lg px-2 py-1 text-sm"
                    >
                      <option value="">(استخدم التصنيف المكتشف)</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{PRODUCT_CATEGORY_LABELS_AR[c]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={mapping.countsAsChildEntry}
                      onChange={(e) =>
                        upsertProductMapping({ ...mapping, countsAsChildEntry: e.target.checked })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={mapping.countsAsSecondVisit}
                      onChange={(e) =>
                        upsertProductMapping({ ...mapping, countsAsSecondVisit: e.target.checked })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={mapping.department}
                      onChange={(e) => upsertProductMapping({ ...mapping, department: e.target.value })}
                      className="border border-[#e3e7f5] rounded-lg px-2 py-1 text-sm w-32"
                    />
                  </td>
                  <td className="text-sm">
                    {catalogEntry?.retailPrice != null ? formatSar(catalogEntry.retailPrice) : UNAVAILABLE_LABEL}
                  </td>
                  <td className="text-sm">
                    {catalogEntry?.cost != null ? formatSar(catalogEntry.cost) : UNAVAILABLE_LABEL}
                  </td>
                  <td className="text-sm">
                    {catalogEntry?.stockQuantity != null ? formatNumber(catalogEntry.stockQuantity) : UNAVAILABLE_LABEL}
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={catalogEntry?.retailPrice != null ? String(catalogEntry.retailPrice) : "غير محدد"}
                      value={mapping.unitPrice ?? ""}
                      onChange={(e) =>
                        upsertProductMapping({
                          ...mapping,
                          unitPrice: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="border border-[#e3e7f5] rounded-lg px-2 py-1 text-sm w-24"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted">
        الصفوف المظللة تحتاج مراجعة يدوية — التصنيف التلقائي غير واثق منها بدرجة كافية.
      </div>
    </div>
  );
}

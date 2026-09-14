"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useDashboardStore } from "@/lib/store";
import { buildProductMapping, effectiveCategory } from "@/lib/classification/productClassifier";
import { resolveColumn } from "@/lib/kpi/columnResolver";
import { PRODUCT_CATEGORY_LABELS_AR, type ProductCategory } from "@/lib/types";

const CATEGORIES = Object.keys(PRODUCT_CATEGORY_LABELS_AR) as ProductCategory[];

export default function ClassificationPage() {
  const imports = useDashboardStore((s) => s.imports);
  const productMappings = useDashboardStore((s) => s.productMappings);
  const upsertProductMapping = useDashboardStore((s) => s.upsertProductMapping);

  const invoiceFile = imports.find((f) => f.reportType === "SALES_BY_INVOICE");

  const productNames = useMemo(() => {
    if (!invoiceFile) return [];
    const productCol = resolveColumn(invoiceFile.columns, "product");
    if (!productCol) return [];
    const names = new Set<string>();
    for (const row of invoiceFile.rows) {
      const v = row[productCol];
      if (v) names.add(String(v).trim());
    }
    return Array.from(names).sort();
  }, [invoiceFile]);

  if (!invoiceFile) {
    return (
      <div>
        <PageHeader title="تصنيف المنتجات" description="يحتاج هذا القسم إلى تقرير 'المبيعات من كل فاتورة' لعرض قائمة المنتجات." />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تصنيف المنتجات"
        description={'"مجموعة" في اسم التذكرة تصنيف سعري فقط — كل وحدة مباعة = دخول طفل واحد.'}
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
            </tr>
          </thead>
          <tbody>
            {productNames.map((name) => {
              const mapping = productMappings[name] ?? buildProductMapping(name);
              const category = effectiveCategory(mapping);
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

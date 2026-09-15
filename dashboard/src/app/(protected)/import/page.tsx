"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dropzone } from "@/components/Dropzone";
import { PageHeader } from "@/components/PageHeader";
import { useDashboardStore } from "@/lib/store";
import { processUploadedFile } from "@/lib/parsers/processFile";
import { REPORT_TYPE_LABELS_AR, type FileStatus, type ImportedFile } from "@/lib/types";
import { formatNumber } from "@/lib/utils/format";

const STATUS_CONFIG: Record<FileStatus, { label: string; icon: string; className: string }> = {
  RECOGNIZED: { label: "تم التعرف عليه", icon: "✓", className: "text-emerald-700 bg-emerald-50" },
  NEEDS_REVIEW: { label: "يحتاج مراجعة", icon: "⚠", className: "text-amber-700 bg-amber-50" },
  UNSUPPORTED: { label: "ملف غير مدعوم", icon: "✕", className: "text-rose-700 bg-rose-50" },
  DUPLICATE: { label: "بيانات مكررة", icon: "⚠", className: "text-amber-700 bg-amber-50" },
};

export default function ImportPage() {
  const router = useRouter();
  const imports = useDashboardStore((s) => s.imports);
  const addImports = useDashboardStore((s) => s.addImports);
  const [pending, setPending] = useState<ImportedFile[]>([]);
  const [processing, setProcessing] = useState(false);

  async function handleFiles(files: File[]) {
    setProcessing(true);
    const results: ImportedFile[] = [];
    for (const file of files) {
      const processed = await processUploadedFile(file, [...imports, ...results]);
      results.push(processed);
    }
    setPending((prev) => [...prev, ...results]);
    setProcessing(false);
  }

  function commitAndAnalyze() {
    const usable = pending.filter((f) => f.status === "RECOGNIZED" || f.status === "NEEDS_REVIEW");
    addImports(usable);
    setPending([]);
    router.push("/");
  }

  const allRows = [...imports, ...pending];

  return (
    <div>
      <PageHeader
        title="استيراد تقارير رواء"
        description="ارفع ملفات المبيعات المُصدَّرة من نظام رواء (CSV / XLS / XLSX). يحتفظ النظام بالسجل ويعتمد أحدث فترة من كل نوع تلقائيًا دون جمع التقارير التراكمية."
      />

      <div className="kp-card mb-4 border-sky-200 bg-sky-50 text-sky-900">
        <div className="font-black text-sm">طريقة الرفع اليومي</div>
        <p className="text-xs mt-1">
          صدّر التقرير من أول الشهر حتى تاريخ اليوم. عند رفع نسخة أحدث سيستخدمها التحليل بدل النسخة السابقة، ولن تُجمع النسختان أو تتكرر المبيعات.
        </p>
      </div>

      <Dropzone onFiles={handleFiles} />

      {processing && <div className="mt-4 text-sm text-muted">جارٍ تحليل الملفات...</div>}

      {allRows.length > 0 && (
        <div className="kp-card mt-6 overflow-x-auto">
          <table className="kp-table">
            <thead>
              <tr>
                <th>اسم الملف</th>
                <th>نوع التقرير المكتشف</th>
                <th>الفترة</th>
                <th>عدد الصفوف</th>
                <th>حالة الملف</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map((f) => {
                const cfg = STATUS_CONFIG[f.status];
                return (
                  <tr key={f.id}>
                    <td className="font-bold">{f.fileName}</td>
                    <td>{REPORT_TYPE_LABELS_AR[f.reportType]}</td>
                    <td>
                      {f.periodStart && f.periodEnd
                        ? f.periodStart === f.periodEnd
                          ? f.periodStart
                          : `${f.periodStart} — ${f.periodEnd}`
                        : "—"}
                    </td>
                    <td>{formatNumber(f.rowCount) || "—"}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.className}`}>
                        <span>{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={commitAndAnalyze}
            className="rounded-full bg-navy text-white font-bold text-sm px-6 py-3 hover:opacity-90 transition"
          >
            تحليل وتحديث لوحة المؤشرات
          </button>
        </div>
      )}
    </div>
  );
}

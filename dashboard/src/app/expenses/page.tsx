"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { useDashboardStore } from "@/lib/store";
import { useKpis } from "@/lib/kpi/useKpis";
import { calculateOperatingProfit } from "@/lib/kpi/profit";
import { EXPENSE_CATEGORY_LABELS_AR, type ExpenseCategory } from "@/lib/types";
import { formatSar, formatPct } from "@/lib/utils/format";

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS_AR) as ExpenseCategory[];

export default function ExpensesPage() {
  const expenses = useDashboardStore((s) => s.expenses);
  const addExpense = useDashboardStore((s) => s.addExpense);
  const removeExpense = useDashboardStore((s) => s.removeExpense);
  const kpis = useKpis();

  const [date, setDate] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("RENT");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(false);

  const profit = calculateOperatingProfit(kpis.totalSalesInclVat, expenses);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!date || !amt) return;
    addExpense({ id: uuidv4(), date, category, description, amount: amt, recurring });
    setDate("");
    setDescription("");
    setAmount("");
    setRecurring(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="المصروفات والربحية" description="نظام رواء لا يحتوي كل المصروفات — أدخلها هنا لحساب الربح التشغيلي." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="الإيراد التشغيلي" value={kpis.totalSalesInclVat !== null ? formatSar(kpis.totalSalesInclVat) : null} />
        <KpiCard label="إجمالي المصروفات" value={profit.totalExpenses !== null ? formatSar(profit.totalExpenses) : null} />
        <KpiCard label="الربح التشغيلي" value={profit.operatingProfit !== null ? formatSar(profit.operatingProfit) : null} tone="primary" />
        <KpiCard label="هامش الربح التشغيلي" value={profit.operatingMarginPct !== null ? formatPct(profit.operatingMarginPct) : null} />
      </div>

      <form onSubmit={handleSubmit} className="form kp-card grid md:grid-cols-5 gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-navy">التاريخ</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="border border-[#e3e7f5] rounded-xl px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-navy">الفئة</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="border border-[#e3e7f5] rounded-xl px-3 py-2 text-sm">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS_AR[c]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-bold text-navy">الوصف</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="border border-[#e3e7f5] rounded-xl px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-navy">المبلغ (ر.س)</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="border border-[#e3e7f5] rounded-xl px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-navy">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          متكرر شهريًا
        </label>
        <button type="submit" className="rounded-full bg-navy text-white font-bold text-sm px-6 py-2.5 hover:opacity-90 transition md:col-span-1">
          إضافة مصروف
        </button>
      </form>

      <div className="kp-card overflow-x-auto">
        {expenses.length === 0 ? (
          <div className="text-sm text-muted">لا توجد مصروفات مسجّلة بعد.</div>
        ) : (
          <table className="kp-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الفئة</th>
                <th>الوصف</th>
                <th>المبلغ</th>
                <th>النوع</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{EXPENSE_CATEGORY_LABELS_AR[e.category]}</td>
                  <td>{e.description || "—"}</td>
                  <td className="font-bold">{formatSar(e.amount)}</td>
                  <td>{e.recurring ? "متكرر" : "لمرة واحدة"}</td>
                  <td>
                    <button onClick={() => removeExpense(e.id)} className="text-rose-600 text-xs font-bold hover:underline">
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

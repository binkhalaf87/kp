"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useDashboardStore } from "@/lib/store";

export default function SettingsPage() {
  const settings = useDashboardStore((s) => s.settings);
  const updateSettings = useDashboardStore((s) => s.updateSettings);
  const cashierDepartments = useDashboardStore((s) => s.cashierDepartments);
  const setCashierDepartment = useDashboardStore((s) => s.setCashierDepartment);
  const clearImports = useDashboardStore((s) => s.clearImports);

  const [newCashier, setNewCashier] = useState("");
  const [newDept, setNewDept] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الإعدادات" description="القيم هنا قابلة للتعديل بالكامل ولا ترتبط بالبرمجة الداخلية." />

      <div className="kp-card grid md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-navy">سعر شراء المشروع (Acquisition Cost)</label>
          <input
            type="number"
            value={settings.acquisitionCost}
            onChange={(e) => updateSettings({ acquisitionCost: Number(e.target.value) })}
            className="border border-[#e3e7f5] rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-navy">مبيعات نفس الشهر بالعام الماضي</label>
          <input
            type="number"
            value={settings.previousYearSameMonthSales}
            onChange={(e) => updateSettings({ previousYearSameMonthSales: Number(e.target.value) })}
            className="border border-[#e3e7f5] rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-navy">نسبة سماح التوفيق بين التقارير (%)</label>
          <input
            type="number"
            value={settings.reconciliationTolerancePct}
            onChange={(e) => updateSettings({ reconciliationTolerancePct: Number(e.target.value) })}
            className="border border-[#e3e7f5] rounded-xl px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="kp-card">
        <div className="font-black text-navy mb-3">تعيين الكاشير إلى الأقسام (Cashier → Department)</div>
        <table className="kp-table mb-4">
          <thead>
            <tr><th>الكاشير</th><th>القسم</th></tr>
          </thead>
          <tbody>
            {Object.entries(cashierDepartments).map(([name, dept]) => (
              <tr key={name}>
                <td className="font-bold">{name}</td>
                <td>
                  <input
                    type="text"
                    value={dept}
                    onChange={(e) => setCashierDepartment(name, e.target.value)}
                    className="border border-[#e3e7f5] rounded-lg px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="اسم الكاشير"
            value={newCashier}
            onChange={(e) => setNewCashier(e.target.value)}
            className="border border-[#e3e7f5] rounded-lg px-3 py-2 text-sm flex-1"
          />
          <input
            type="text"
            placeholder="القسم"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            className="border border-[#e3e7f5] rounded-lg px-3 py-2 text-sm flex-1"
          />
          <button
            onClick={() => {
              if (!newCashier || !newDept) return;
              setCashierDepartment(newCashier, newDept);
              setNewCashier("");
              setNewDept("");
            }}
            className="rounded-full bg-navy text-white font-bold text-sm px-5 py-2 hover:opacity-90"
          >
            إضافة
          </button>
        </div>
      </div>

      <div className="kp-card border-rose-200 bg-rose-50">
        <div className="font-bold text-rose-800 text-sm mb-2">منطقة الخطر</div>
        <p className="text-xs text-rose-700 mb-3">حذف كل التقارير المستوردة (لا يؤثر على المصروفات أو الأهداف أو التصنيفات).</p>
        <button
          onClick={() => {
            if (confirm("هل أنت متأكد من حذف كل التقارير المستوردة؟")) clearImports();
          }}
          className="rounded-full bg-rose-600 text-white font-bold text-sm px-5 py-2 hover:opacity-90"
        >
          حذف كل التقارير المستوردة
        </button>
      </div>
    </div>
  );
}

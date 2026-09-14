"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { DailyRow } from "@/lib/kpi/types";
import { formatSar } from "@/lib/utils/format";

export function DailySalesChart({ data }: { data: DailyRow[] }) {
  if (data.length === 0) {
    return <div className="text-sm text-muted">لا توجد تفاصيل يومية في التقارير الحالية.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0fa" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip formatter={(v: number) => formatSar(v)} labelStyle={{ direction: "rtl" }} />
        <Line type="monotone" dataKey="sales" name="المبيعات" stroke="#1737a7" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

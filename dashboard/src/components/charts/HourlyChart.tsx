"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { HourlyRow } from "@/lib/kpi/types";

export function HourlyChart({ data }: { data: HourlyRow[] }) {
  if (data.length === 0) {
    return <div className="text-sm text-muted">التقرير الحالي لا يحتوي تفاصيل يومية/ساعية.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0fa" />
        <XAxis dataKey="hour" fontSize={12} tickFormatter={(h) => `${h}:00`} />
        <YAxis fontSize={12} />
        <Tooltip labelFormatter={(h) => `الساعة ${h}:00`} />
        <Bar dataKey="childEntries" name="دخول الأطفال" fill="#24b8f2" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

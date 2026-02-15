"use client";

import type { MonthlyStats } from "@/lib/stats";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MonthlySalesChartProps {
  data: MonthlyStats[];
}

export function MonthlySalesChart({ data }: MonthlySalesChartProps) {
  return (
    <div className="w-full h-full">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">月別合計金額</h2>
      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis
            dataKey="month"
            className="text-gray-700"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-gray-700"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value) => [
              `¥${Number(value).toLocaleString("ja-JP")}`,
              "合計金額",
            ]}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
            labelStyle={{ color: "#000" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
            activeDot={{ r: 6 }}
            name="合計金額"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

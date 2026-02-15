"use client";

import type { CategoryStats } from "@/lib/stats";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "./constants";

interface CategoryChartProps {
  data: CategoryStats[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  return (
    <div className="w-full h-full">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">
        カテゴリ別合計金額
      </h2>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis
            type="number"
            className="text-gray-700"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            dataKey="categoryName"
            type="category"
            className="text-gray-700"
            tick={{ fontSize: 12 }}
            width={100}
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
          <Bar
            dataKey="total"
            fill={COLORS[0]}
            radius={[0, 8, 8, 0]}
            name="合計金額"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

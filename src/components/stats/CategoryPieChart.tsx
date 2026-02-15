"use client";

import type { CategoryStats } from "@/lib/stats";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type PieLabelRenderProps,
} from "recharts";
import { COLORS } from "./constants";

interface CategoryPieChartProps {
  data: CategoryStats[];
}

interface PieDataItem {
  name: string;
  value: number;
  percentage: string;
  fill: string;
}

const THRESHOLD = 3;

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const totalAmount = data.reduce((sum, item) => sum + item.total, 0);

  let pieData: PieDataItem[] = data.map((item, index) => ({
    name: item.categoryName,
    value: item.total,
    percentage:
      totalAmount > 0 ? ((item.total / totalAmount) * 100).toFixed(1) : "0",
    fill: COLORS[index % COLORS.length],
  }));

  const largeItems = pieData.filter(
    (item) => parseFloat(item.percentage) >= THRESHOLD,
  );
  const smallItems = pieData.filter(
    (item) => parseFloat(item.percentage) < THRESHOLD,
  );

  if (smallItems.length > 0) {
    const otherTotal = smallItems.reduce((sum, item) => sum + item.value, 0);
    const otherPercentage =
      totalAmount > 0 ? ((otherTotal / totalAmount) * 100).toFixed(1) : "0";

    pieData = [
      ...largeItems,
      {
        name: "その他",
        value: otherTotal,
        percentage: otherPercentage,
        fill: "#9ca3af",
      },
    ];
  }

  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    const RADIAN = Math.PI / 180;
    const numPercentage = (percent ?? 0) * 100;
    const angle = midAngle ?? 0;

    const isSmallSlice = numPercentage < 6;
    const radius = isSmallSlice
      ? outerRadius + 40
      : innerRadius + (outerRadius - innerRadius) * 0.5;

    const x = cx + radius * Math.cos(-angle * RADIAN);
    const y = cy + radius * Math.sin(-angle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="black"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="16"
        fontWeight="600"
      >
        {`${numPercentage.toFixed(1)}%`}
      </text>
    );
  };

  const renderCustomLegend = () => {
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "20px",
          paddingTop: "20px",
        }}
      >
        {pieData.map((entry, index) => (
          <div
            key={`legend-${index}`}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: entry.fill,
                borderRadius: "2px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#000" }}>
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">
        カテゴリ別割合
      </h2>
      <ResponsiveContainer width="100%" height={500}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            labelLine={false}
            label={renderCustomLabel}
            outerRadius="100%"
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
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
        </PieChart>
      </ResponsiveContainer>
      {renderCustomLegend()}
    </div>
  );
}

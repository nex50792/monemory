"use client";

import type { CategoryStats, MonthlyStats } from "@/lib/stats";
import { getDefaultDateRange } from "@/lib/stats";
import { useCallback, useEffect, useState } from "react";
import { CategoryChart } from "./CategoryChart";
import { CategoryPieChart } from "./CategoryPieChart";
import { DateRangePicker } from "./DateRangePicker";
import { MonthlySalesChart } from "./MonthlySalesChart";

export function ChartContainer() {
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      setError(null);

      const monthlyParams = new URLSearchParams({
        type: "monthly",
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });

      const monthlyRes = await fetch(`/api/stats?${monthlyParams}`);
      if (!monthlyRes.ok) {
        throw new Error("月別統計の取得に失敗しました");
      }
      const monthlyJson = await monthlyRes.json();
      setMonthlyData(monthlyJson.monthly || []);

      const categoryParams = new URLSearchParams({
        type: "category",
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });

      const categoryRes = await fetch(`/api/stats?${categoryParams}`);
      if (!categoryRes.ok) {
        throw new Error("カテゴリ別統計の取得に失敗しました");
      }
      const categoryJson = await categoryRes.json();
      setCategoryData(categoryJson.byCategory || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました",
      );
      setMonthlyData([]);
      setCategoryData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { startDate, endDate } = getDefaultDateRange();
    fetchStats(startDate, endDate);
  }, [fetchStats]);

  const handleDateRangeChange = useCallback(
    (startDate: Date, endDate: Date) => {
      fetchStats(startDate, endDate);
    },
    [fetchStats],
  );

  return (
    <div className="space-y-6">
      <DateRangePicker onDateRangeChange={handleDateRangeChange} />

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            {monthlyData.length > 0 ? (
              <MonthlySalesChart data={monthlyData} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                該当するデータがありません
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            {categoryData.length > 0 ? (
              <CategoryChart data={categoryData} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                該当するデータがありません
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            {categoryData.length > 0 ? (
              <CategoryPieChart data={categoryData} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                該当するデータがありません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

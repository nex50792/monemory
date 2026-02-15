"use client";

import { useCallback, useState } from "react";

interface DateRangePickerProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

export function DateRangePicker({ onDateRangeChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState<"1m" | "3m" | "6m" | "12m">("12m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = useCallback(
    (newPreset: "1m" | "3m" | "6m" | "12m") => {
      setPreset(newPreset);
      setShowCustom(false);

      const endDate = new Date();
      const startDate = new Date();

      switch (newPreset) {
        case "1m":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "3m":
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case "6m":
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case "12m":
          startDate.setMonth(startDate.getMonth() - 12);
          break;
      }

      onDateRangeChange(startDate, endDate);
    },
    [onDateRangeChange],
  );

  const handleCustomDateApply = useCallback(() => {
    if (!customStart || !customEnd) return;

    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      alert("有効な日付を入力してください");
      return;
    }

    onDateRangeChange(startDate, endDate);
    setPreset("12m");
  }, [customStart, customEnd, onDateRangeChange]);

  return (
    <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-900 mb-3">
          期間を選択
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handlePresetClick("1m")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              preset === "1m" && !showCustom
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            過去1ヶ月
          </button>
          <button
            onClick={() => handlePresetClick("3m")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              preset === "3m" && !showCustom
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            過去3ヶ月
          </button>
          <button
            onClick={() => handlePresetClick("6m")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              preset === "6m" && !showCustom
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            過去6ヶ月
          </button>
          <button
            onClick={() => handlePresetClick("12m")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              preset === "12m" && !showCustom
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            過去12ヶ月
          </button>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              showCustom
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            カスタム
          </button>
        </div>
      </div>

      {showCustom && (
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              開始日
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              終了日
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
            />
          </div>
          <button
            onClick={handleCustomDateApply}
            className="w-full sm:w-auto px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            適用
          </button>
        </div>
      )}
    </div>
  );
}

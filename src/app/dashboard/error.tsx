"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          ダッシュボード
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          支出の推移とカテゴリ別の分析
        </p>
      </div>

      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
          エラーが発生しました
        </h2>
        <p className="text-red-800 dark:text-red-300 mb-4">
          {error.message || "ダッシュボードの読み込みに失敗しました。"}
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
        >
          もう一度試す
        </button>
      </div>
    </main>
  );
}

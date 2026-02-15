export default function DashboardLoading() {
  const SKELETON_BUTTON_COUNT = 5;
  const SKELETON_CHART_COUNT = 3;

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

      <div className="space-y-6">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: SKELETON_BUTTON_COUNT }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"
              ></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: SKELETON_CHART_COUNT }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-80 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

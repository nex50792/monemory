import { ChartContainer } from "@/components/stats";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Auth error:", error);
    redirect("/sign-in");
  }

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-600 mt-2">支出の推移とカテゴリ別の分析</p>
      </div>

      <ChartContainer />
    </main>
  );
}

import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { calculateMonthlyStats } from "@/lib/stats";

export default async function MonthlyStatsPage() {
  const user = await getCurrentUser();

  const entries = await prisma.entry.findMany({
    where: { userId: user.id },
  });

  const monthlyStats = calculateMonthlyStats(entries);

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">月ごとの合計金額</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border">年月</th>
            <th className="py-2 px-4 border">合計金額</th>
          </tr>
        </thead>
        <tbody>
          {monthlyStats.map((row) => (
            <tr key={row.month}>
              <td className="py-2 px-4 border">{row.month}</td>
              <td className="py-2 px-4 border text-right">
                ¥{row.total.toLocaleString("ja-JP")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

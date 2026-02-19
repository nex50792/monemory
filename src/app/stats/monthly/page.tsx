import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { calculateMonthlyStats } from "@/lib/stats";
import Link from "next/link";

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
          {monthlyStats.map((row) => {
            const [year, month] = row.month.split("-");
            const startDate = `${year}-${month}-01`;
            const endDate = new Date(Number(year), Number(month), 0);
            const endDateStr = endDate.toISOString().slice(0, 10);
            const href = `/entries?startDate=${startDate}&endDate=${endDateStr}`;
            return (
              <tr key={row.month} className="hover:bg-gray-50">
                <td className="py-2 px-4 border">
                  <Link href={href} className="block text-blue-600 underline">
                    {row.month}
                  </Link>
                </td>
                <td className="py-2 px-4 border text-right">
                  <Link href={href} className="block text-blue-600 underline">
                    ¥{row.total.toLocaleString("ja-JP")}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

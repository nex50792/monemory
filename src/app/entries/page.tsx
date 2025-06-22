import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import Link from "next/link";

export default async function EntryList() {
  const user = await getCurrentUser();

  const entries = await prisma.entry.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <Link
          href="/"
          className="text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md shadow"
        >
          新規登録
        </Link>
      </div>
      <h1 className="text-xl font-bold mb-4 text-black">登録一覧</h1>
      <ul className="space-y-4">
        {entries.map(entry => (
          <li key={entry.id} className="border p-4 rounded shadow">
            <Link href={`/entries/${entry.id}`} className="text-blue-600 hover:underline">
              {entry.title || "(無題)"} - {entry.amount?.toLocaleString()}円
            </Link>
            <p className="text-sm text-gray-500">{new Date(entry.date ?? "").toLocaleDateString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

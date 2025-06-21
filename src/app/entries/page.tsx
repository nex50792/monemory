import Link from "next/link";
import { prisma } from '@/lib/prisma';

export default async function EntryList() {
  const entries = await prisma.entry.findMany({
    orderBy: { date: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-xl font-bold mb-4">登録一覧</h1>
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

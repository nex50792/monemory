import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EntryDetail({ params }: Props) { 
  const { id } = await params;
  const user = await getCurrentUser();

  const entry = await prisma.entry.findUnique({
    where: { id: id, userId: user.id },
  });

  if (!entry) {
    return <p>見つかりませんでした。</p>;
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <div className="mb-2">
        <Link href="/entries" className="text-blue-600 hover:underline">
          ← 一覧に戻る
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2 text-gray-700">{entry.title || "(無題)"}</h1>
      <p className="text-gray-700 mb-2">金額: {entry.amount?.toLocaleString()}円</p>
      <p className="text-gray-700 mb-2">日付: {new Date(entry.date ?? "").toLocaleDateString()}</p>
      <p className="text-gray-700 whitespace-pre-wrap">{entry.memo}</p>
    </div>
  );
}

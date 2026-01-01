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
    where: {
      id: id,
      userId: user.id,
    },
    include: {
      category: true,
      tags: true,
    },
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
      <div className="ml-4">
        <a id={`edit-link-${entry.id}`} href={`/entries/${entry.id}/edit`} className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white text-sm rounded-md shadow hover:bg-indigo-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="w-4 h-4">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 15.5V18h2.5l9.393-9.393-2.5-2.5L2 15.5z" clipRule="evenodd" />
          </svg>
          編集
        </a>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-gray-700">
        {entry.title || "(無題)"}
      </h1>

      <p className="text-gray-700 mb-2">
        金額: {entry.amount?.toLocaleString()}円
      </p>

      <p className="text-gray-700 mb-2">
        日付: {new Date(entry.date ?? "").toLocaleDateString()}
      </p>

      {/* カテゴリ */}
      {entry.category && (
        <p className="text-gray-700 mb-2">
          カテゴリ: <span className="font-medium">{entry.category.name}</span>
        </p>
      )}

      {/* タグ（複数） */}
      {entry.tags.length > 0 && (
        <p className="text-gray-700 mb-2">
          タグ:{" "}
          {entry.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-block bg-gray-200 text-gray-700 text-sm px-2 py-1 rounded mr-1"
            >
              {tag.name}
            </span>
          ))}
        </p>
      )}

      {/* メモ */}
      <p className="text-gray-700 whitespace-pre-wrap">{entry.memo}</p>
    </div>
  );
}

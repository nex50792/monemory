import { prisma } from "@/lib/prisma";

type Props = {
  params: { id: string };
};

export default async function EntryDetail({ params }: Props) {
  const entry = await prisma.entry.findUnique({
    where: { id: params.id },
  });

  if (!entry) {
    return <p>見つかりませんでした。</p>;
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-2">{entry.title || "(無題)"}</h1>
      <p className="text-lg mb-1">金額: {entry.amount?.toLocaleString()}円</p>
      <p className="text-sm text-gray-500 mb-4">日付: {new Date(entry.date ?? "").toLocaleDateString()}</p>
      <p className="text-gray-800 whitespace-pre-wrap">{entry.memo}</p>
    </div>
  );
}

import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import Form from "next/form";
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function Home() {
  async function createEntry(formData: FormData) {
    "use server";

    const user = await getCurrentUser();

    const title = formData.get("title") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const dateRaw = formData.get("date") as string;
    const date = dateRaw ? new Date(dateRaw) : undefined;
    const memo = formData.get("memo") as string;

    const newEntry = await prisma.entry.create({
      data: {
        userId: user.id,
        title,
        amount,
        date,
        memo,
      },
    });

    redirect(`/entries/${newEntry.id}`);
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <div className="mb-2">
        <Link href="/entries" className="text-blue-600 hover:underline">
          ← 一覧に戻る
        </Link>
      </div>
      <Form action={createEntry} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            タイトル
          </label>
          <input
            type="text"
            name="title"
            id="title"
            className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            金額
          </label>
          <input
            type="number"
            step="0.01"
            name="amount"
            id="amount"
            className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            日付
          </label>
          <input
            type="date"
            name="date"
            id="date"
            className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="memo" className="block text-sm font-medium text-gray-700">
            メモ
          </label>
          <textarea
            name="memo"
            id="memo"
            className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          登録
        </button>
      </Form>
    </div>
  );
}

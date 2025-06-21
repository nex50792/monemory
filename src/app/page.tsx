import { prisma } from '@/lib/prisma';
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import Form from "next/form";

export default function Home() {
  async function createEntry(formData: FormData) {
    "use server";

    const authRes = await auth();

    if (!authRes.userId) {
      throw new Error("ログインユーザーが存在しません");
    }

    const user = await prisma.user.findUnique({
      where: {
        clerkUserId: authRes.userId
      }
    })

    if (!user) {
      throw new Error("該当するユーザーが見つかりません");
    }

    const title = formData.get("title") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const dateRaw = formData.get("date") as string;
    const date = dateRaw ? new Date(dateRaw) : undefined;
    const memo = formData.get("memo") as string;

    await prisma.entry.create({
      data: {
        userId: user.id,
        title,
        amount,
        date,
        memo,
      },
    });

    revalidatePath("/");
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
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

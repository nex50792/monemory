"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createEntry } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={pending}
    >
      {pending ? '登録中...' : '登録'}
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setErrorMessage(null);

    const result = await createEntry(formData);

    if (result.success) {
      router.push(`/entries/${result.entryId}`);
    } else {
      setErrorMessage(result.message || "作成に失敗しました。");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <div className="mb-2">
        <Link href="/entries" className="text-blue-600 hover:underline">
          ← 一覧に戻る
        </Link>
      </div>
      <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmit(formData);
        }} className="space-y-4">
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
        {errorMessage && (
          <p className="text-red-500 text-sm">{errorMessage}</p>
        )}
        <SubmitButton />
      </form>
    </div>
  );
}
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(setCategories);
    fetch('/api/tags')
      .then(res => res.json())
      .then(setTags);
  }, []);

  const handleAddCategory = async () => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: newCategory }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const newCat = await res.json();
      setCategories((prev) => [...prev, newCat]);
      setNewCategory('');
    }
  };

  const handleAddTag = async () => {
    const res = await fetch('/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: newTag }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const newT = await res.json();
      setTags((prev) => [...prev, newT]);
      setSelectedTags((prev) => [...prev, newT.id]);
      setNewTag('');
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setErrorMessage(null);

    formData.set("tags", selectedTags.join(","));

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

        {/* タイトル */}
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

        {/* 金額 */}
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

        {/* 日付 */}
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

        {/* カテゴリ */}
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
            カテゴリ
          </label>
          <select
            name="categoryId"
            id="categoryId"
            className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          >
            <option value="">-- 選択してください --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <div className="flex mt-2 gap-2">
            <input
              type="text"
              placeholder="新規カテゴリ名を入力"
              className="text-black block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-3 py-2 bg-green-600 text-white rounded-md"
            >
              追加
            </button>
          </div>
        </div>

        {/* タグ（複数選択） */}
        <div>
          <label htmlFor="tagIds" className="block text-sm font-medium text-gray-700">
            タグ（複数選択）
          </label>
          <select
            id="tagIds"
            multiple
            className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            value={selectedTags}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              setSelectedTags(selected);
            }}
          >
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
          <div className="flex mt-2 gap-2">
            <input
              type="text"
              placeholder="新規タグ名を入力"
              className="text-black block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-2 bg-green-600 text-white rounded-md"
            >
              追加
            </button>
          </div>
        </div>

        {/* メモ */}
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

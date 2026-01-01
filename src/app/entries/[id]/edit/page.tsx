"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

function SubmitButton({ submitting }: { submitting: boolean }) {
  return (
    <button
      type="submit"
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
      disabled={submitting}
    >
      {submitting ? '更新中...' : '更新'}
    </button>
  );
}

type Entry = {
  id?: string;
  title: string | null;
  amount: number | null;
  date: string | null;
  memo: string | null;
  categoryId?: string | null;
  tags?: { id: string; name: string }[];
};

type Usable<T> = T | Promise<T>;

function isPromise<T>(v: Usable<T>): v is Promise<T> {
  return typeof (v as Promise<T>).then === 'function';
}

type Category = { id: string; name: string };
type Tag = { id: string; name: string };
type EntryResponse = {
  id: string;
  title: string | null;
  amount: number | null;
  date: string | null;
  memo: string | null;
  categoryId?: string | null;
  tags?: Tag[];
};

export default function EditEntryPage({ params }: { params: Usable<{ id: string }> }) {
  const [resolvedId, setResolvedId] = useState<string>(() => (isPromise(params) ? '' : params.id));
  useEffect(() => {
    if (isPromise(params)) {
      let mounted = true;
      (async () => {
        const p = await params;
        if (mounted) setResolvedId(p.id);
      })();
      return () => {
        mounted = false;
      };
    }
    return undefined;
  }, [params]);

  const router = useRouter();
  const dateRef = useRef<HTMLInputElement>(null);

  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formCategory, setFormCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [tagError, setTagError] = useState('');

  useEffect(() => {
    if (!resolvedId) return;
    const fetchData = async () => {
      try {
        const [catRes, tagRes, entryRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/tags'),
          fetch(`/api/entries/${resolvedId}`),
        ]);

        if (!entryRes.ok) throw new Error('取得に失敗しました');

        const catData = (await catRes.json()) as Category[];
        const tagData = (await tagRes.json()) as Tag[];
        const entryData = (await entryRes.json()) as EntryResponse;

        setCategories(catData);
        setTags(tagData);

        setEntry({
          id: entryData.id,
          title: entryData.title,
          amount: entryData.amount,
          date: entryData.date,
          memo: entryData.memo,
          categoryId: entryData.categoryId ?? null,
          tags: entryData.tags ?? [],
        });

        setFormCategory(entryData.categoryId ?? '');
        setSelectedTags((entryData.tags ?? ([] as Tag[])).map((t: Tag) => t.id));
      } catch (e: unknown) {
        if (e instanceof Error) {
          setErrorMessage(e.message);
        } else {
          setErrorMessage(String(e));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [resolvedId]);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setIsAddingCategory(true);
    setCategoryError('');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategory }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories((prev) => [...prev, newCat]);
        setNewCategory('');
      } else {
        const data = await res.json();
        setCategoryError(data.error || 'カテゴリの追加に失敗しました。');
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setCategoryError(e.message);
      } else {
        setCategoryError('ネットワークエラーが発生しました。');
      }
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    setIsAddingTag(true);
    setTagError('');
    try {
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
      } else {
        const data = await res.json();
        setTagError(data.error || 'タグの追加に失敗しました。');
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setTagError(e.message);
      } else {
        setTagError('ネットワークエラーが発生しました。');
      }
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setErrorMessage(null);
    formData.set('tags', selectedTags.join(','));
    formData.set('categoryId', formCategory);

    setSubmitting(true);
    try {
      const payload = {
        title: formData.get('title'),
        amount: Number(formData.get('amount')),
        date: formData.get('date'),
        memo: formData.get('memo'),
        categoryId: formData.get('categoryId') || null,
        tags: selectedTags,
      };

      const res = await fetch(`/api/entries/${resolvedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push(`/entries/${resolvedId}`);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || '更新に失敗しました。');
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErrorMessage(e.message);
      } else {
        setErrorMessage('更新中にエラーが発生しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Do not early-return on loading/empty: show header/title always,
  // and render the rest of the form conditionally below.

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <div className="mb-2">
        <Link href="/entries" className="text-blue-600 hover:underline">← 一覧に戻る</Link>
      </div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-black">記録編集</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmit(formData);
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">タイトル</label>
          <input
            name="title"
            defaultValue={entry?.title ?? ''}
            className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>

        {loading || !entry ? (
          <div className="py-4">
            <p className="text-sm text-gray-500">{loading ? 'データを読み込み中です...' : 'データが見つかりません。'}</p>
            <div className="mt-4">
              <SubmitButton submitting={true} />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">金額</label>
              <input
                name="amount"
                step="0.01"
                defaultValue={entry.amount ?? ''}
                className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">日付</label>
              <div className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                <input ref={dateRef} name="date" type="date" defaultValue={entry.date ?? ''} className="text-black w-full bg-transparent outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">カテゴリ</label>
              <div className="flex gap-2 items-center">
                <select
                  name="categoryId"
                  className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="">-- 選択してください --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {formCategory && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={async () => {
                      const category = categories.find(c => c.id === formCategory);
                      if (category && confirm(`「${category.name}」を削除しますか？`)) {
                        const res = await fetch(`/api/categories/${formCategory}`, { method: 'DELETE' });
                        if (res.ok) {
                          setCategories((prev) => prev.filter(c => c.id !== formCategory));
                          setFormCategory('');
                        } else {
                          const data = await res.json();
                          alert(data.error || '削除に失敗しました。');
                        }
                      }
                    }}
                  >削除</button>
                )}
              </div>
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
                  className="px-3 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
                  disabled={isAddingCategory}
                >{isAddingCategory ? '追加中...' : '追加'}</button>
              </div>
              {categoryError && <p className="text-red-500 text-sm mt-1">{categoryError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">タグ（複数選択）</label>
              <div className="flex flex-col gap-1">
                {selectedTags.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  return tag ? (
                    <div key={tag.id} className="flex items-center gap-2">
                      <span className="text-sm text-black">{tag.name}</span>
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={async () => {
                          if (confirm(`「${tag.name}」を削除しますか？`)) {
                            const res = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' });
                            if (res.ok) {
                              setTags(prev => prev.filter(t => t.id !== tag.id));
                              setSelectedTags(prev => prev.filter(id => id !== tag.id));
                            } else {
                              const data = await res.json();
                              alert(data.error || '削除に失敗しました。');
                            }
                          }
                        }}
                      >削除</button>
                    </div>
                  ) : null;
                })}
              </div>

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
                  className="px-3 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
                  disabled={isAddingTag}
                >{isAddingTag ? '追加中...' : '追加'}</button>
              </div>
              {tagError && <p className="text-red-500 text-sm mt-1">{tagError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">メモ</label>
              <textarea name="memo" defaultValue={entry.memo ?? ''} className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
            </div>

            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
            <SubmitButton submitting={submitting} />
          </>
        )}
      </form>
    </div>
  );
}

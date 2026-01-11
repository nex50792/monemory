
'use client';

import BackToListButton from '@/components/BackToListButton';
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

type Props = { id: string };

export default function EditEntryClient({ id }: Props) {
  const router = useRouter();
  const dateRef = useRef<HTMLInputElement>(null);

  const [entry, setEntry] = useState<EntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [deleteModeCategories, setDeleteModeCategories] = useState(false);
  const [categoriesToDelete, setCategoriesToDelete] = useState<string[]>([]);
  const [deleteModeTags, setDeleteModeTags] = useState(false);
  const [tagsToDelete, setTagsToDelete] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formCategory, setFormCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [tagError, setTagError] = useState('');

  const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [catRes, tagRes, entryRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/tags'),
          fetch(`/api/entries/${id}`),
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
          date: formatDateForInput(entryData.date),
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
  }, [id]);

  useEffect(() => {
    if (entry && dateRef.current) {
      dateRef.current.value = entry.date ?? '';
    }
  }, [entry]);

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

      const res = await fetch(`/api/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push(`/entries/${id}`);
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

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <div className="mb-2">
        <BackToListButton>← 一覧に戻る</BackToListButton>
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
            <p className="text-sm text-gray-500">データを読み込み中です...</p>
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
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">カテゴリ</label>
                <div>
                  <button
                    type="button"
                    title="削除モード"
                    aria-pressed={deleteModeCategories}
                    onClick={() => { setDeleteModeCategories((s) => !s); setCategoriesToDelete([]); }}
                    className={`ml-2 px-2 py-1 rounded ${deleteModeCategories ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (deleteModeCategories) {
                    } else {
                      setFormCategory('');
                    }
                  }}
                  className={`px-3 py-1 border rounded-md focus:outline-none ${!formCategory ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}`}
                >
                  全て
                </button>
                {categories.map((cat) => {
                  const selected = formCategory === cat.id;
                  const marked = categoriesToDelete.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (deleteModeCategories) {
                          setCategoriesToDelete(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]);
                        } else {
                          setFormCategory(selected ? '' : cat.id);
                        }
                      }}
                      className={`px-3 py-1 border rounded-md focus:outline-none ${deleteModeCategories ? (marked ? 'bg-red-100 text-red-800 border-red-200' : 'bg-white') : (selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white')}`}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
                {deleteModeCategories && categoriesToDelete.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 bg-red-600 text-white rounded"
                      onClick={async () => {
                        if (!confirm(`選択したカテゴリ(${categoriesToDelete.length})を削除しますか？`)) return;
                        const ids = [...categoriesToDelete];
                        const results = await Promise.all(ids.map(id => fetch(`/api/categories/${id}`, { method: 'DELETE' })));
                        const okIds: string[] = [];
                        results.forEach((r, i) => { if (r.ok) okIds.push(ids[i]); });
                        if (okIds.length > 0) {
                          setCategories(prev => prev.filter(c => !okIds.includes(c.id)));
                          if (okIds.includes(formCategory)) setFormCategory('');
                        }
                        setCategoriesToDelete([]);
                        setDeleteModeCategories(false);
                      }}
                    >選択したカテゴリを削除 ({categoriesToDelete.length})</button>
                    <button type="button" className="px-3 py-1 bg-gray-200 rounded" onClick={() => { setDeleteModeCategories(false); setCategoriesToDelete([]); }}>キャンセル</button>
                  </div>
                )}
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
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">タグ（複数選択）</label>
                <div>
                  <button
                    type="button"
                    title="削除モード"
                    aria-pressed={deleteModeTags}
                    onClick={() => { setDeleteModeTags((s) => !s); setTagsToDelete([]); }}
                    className={`ml-2 px-2 py-1 rounded ${deleteModeTags ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 sr-only">タグ（複数選択）</label>
              {/* selected-tags inline delete list removed — use delete-mode and tag chips */}

              <div className="mt-1 flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = selectedTags.includes(tag.id);
                  const marked = tagsToDelete.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (deleteModeTags) {
                          setTagsToDelete(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]);
                        } else {
                          if (selected) setSelectedTags(prev => prev.filter(id => id !== tag.id));
                          else setSelectedTags(prev => [...prev, tag.id]);
                        }
                      }}
                      className={`px-3 py-1 border rounded-md focus:outline-none ${deleteModeTags ? (marked ? 'bg-red-100 text-red-800 border-red-200' : 'bg-white') : (selected ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-white')}`}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
              {deleteModeTags && tagsToDelete.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 bg-red-600 text-white rounded"
                    onClick={async () => {
                      if (!confirm(`選択したタグ(${tagsToDelete.length})を削除しますか？`)) return;
                      const ids = [...tagsToDelete];
                      const results = await Promise.all(ids.map(id => fetch(`/api/tags/${id}`, { method: 'DELETE' })));
                      const okIds: string[] = [];
                      results.forEach((r, i) => { if (r.ok) okIds.push(ids[i]); });
                      if (okIds.length > 0) {
                        setTags(prev => prev.filter(t => !okIds.includes(t.id)));
                        setSelectedTags(prev => prev.filter(id => !okIds.includes(id)));
                      }
                      setTagsToDelete([]);
                      setDeleteModeTags(false);
                    }}
                  >選択したタグを削除 ({tagsToDelete.length})</button>
                  <button type="button" className="px-3 py-1 bg-gray-200 rounded" onClick={() => { setDeleteModeTags(false); setTagsToDelete([]); }}>キャンセル</button>
                </div>
              )}

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

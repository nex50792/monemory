"use client";

import BackToListButton from '@/components/BackToListButton';
import ConfirmModal from '@/components/ConfirmModal';
import GlobalMessage from '@/components/GlobalMessage';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  const dateRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => Promise<void> | void) | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [deleteModeCategories, setDeleteModeCategories] = useState(false);
  const [categoriesToDelete, setCategoriesToDelete] = useState<string[]>([]);
  const [deleteModeTags, setDeleteModeTags] = useState(false);
  const [tagsToDelete, setTagsToDelete] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formCategory, setFormCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagError, setTagError] = useState('');

  useEffect(() => {
    fetch('/api/categories').then(res => res.json()).then(setCategories);
    fetch('/api/tags').then(res => res.json()).then(setTags);
  }, []);

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
    } catch {
      setCategoryError('ネットワークエラーが発生しました。');
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
    } catch {
      setTagError('ネットワークエラーが発生しました。');
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setErrorMessage(null);
    formData.set("tags", selectedTags.join(","));
    formData.set("categoryId", formCategory);

    const result = await createEntry(formData);
    if (result.success) {
      router.push(`/entries/${result.entryId}`);
    } else {
      setErrorMessage(result.message || "作成に失敗しました。");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <GlobalMessage message={toast} onClose={() => setToast(null)} />
      <header className="mb-4">
          <h1 className="text-2xl font-bold text-black">新規記録作成</h1>
          <p className="mt-2 text-sm text-gray-500">支出や出来事を記録します。カテゴリやタグは任意で設定できます。</p>
      </header>
      <div className="mb-2">
        <BackToListButton>← 一覧に戻る</BackToListButton>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmit(formData);
        }}
        className="space-y-4"
      >
        <GlobalMessage message={toast} onClose={() => setToast(null)} />
        <ConfirmModal
          open={confirmOpen}
          message={confirmMessage}
          onConfirm={async () => { if (onConfirmAction) await onConfirmAction(); setConfirmOpen(false); }}
          onCancel={() => setConfirmOpen(false)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">タイトル</label>
          <input type="text" name="title" className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">金額</label>
          <input type="number" step="0.01" name="amount" className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">日付</label>
          <div className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
            <input ref={dateRef} type="date" name="date" className="text-black w-full bg-transparent outline-none" />
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
                onClick={() => {
                  setConfirmMessage(`選択したカテゴリ(${categoriesToDelete.length})を削除しますか？`);
                  setOnConfirmAction(() => async () => {
                    const ids = [...categoriesToDelete];
                    const results = await Promise.all(ids.map(id => fetch(`/api/categories/${id}`, { method: 'DELETE' })));
                    const okIds: string[] = [];
                    for (let i = 0; i < results.length; i++) {
                      const r = results[i];
                      if (r.ok) {
                        okIds.push(ids[i]);
                      } else {
                        try {
                          const data = await r.json();
                          setToast(data.error || '削除に失敗しました');
                        } catch {
                          setToast('削除に失敗しました');
                        }
                      }
                    }
                    if (okIds.length > 0) {
                      setCategories(prev => prev.filter(c => !okIds.includes(c.id)));
                      if (okIds.includes(formCategory)) setFormCategory('');
                    }
                    setCategoriesToDelete([]);
                    setDeleteModeCategories(false);
                  });
                  setConfirmOpen(true);
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
                onClick={() => {
                  setConfirmMessage(`選択したタグ(${tagsToDelete.length})を削除しますか？`);
                  setOnConfirmAction(() => async () => {
                    const ids = [...tagsToDelete];
                    const results = await Promise.all(ids.map(id => fetch(`/api/tags/${id}`, { method: 'DELETE' })));
                    const okIds: string[] = [];
                    for (let i = 0; i < results.length; i++) {
                      const r = results[i];
                      if (r.ok) {
                        okIds.push(ids[i]);
                      } else {
                        try {
                          const data = await r.json();
                          setToast(data.error || '削除に失敗しました');
                        } catch {
                          setToast('削除に失敗しました');
                        }
                      }
                    }
                    if (okIds.length > 0) {
                      setTags(prev => prev.filter(t => !okIds.includes(t.id)));
                      setSelectedTags(prev => prev.filter(id => !okIds.includes(id)));
                    }
                    setTagsToDelete([]);
                    setDeleteModeTags(false);
                  });
                  setConfirmOpen(true);
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
          <textarea name="memo" className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>

        {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
        <SubmitButton />
      </form>
    </div>
  );
}

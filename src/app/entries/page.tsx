'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Entry = {
  id: string;
  title: string | null;
  amount: number | null;
  date: string | null;
};

export default function EntryListClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [navigatingToId, setNavigatingToId] = useState<string | null>(null);
  const [isNavigatingNew, setIsNavigatingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/entries');
      if (!res.ok) throw new Error('一覧取得に失敗しました');
      const data = await res.json();
      setEntries(data);
      setError(null);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('不明なエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;
    setDeleteLoadingId(id);
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }
      await fetchEntries();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('不明なエラーが発生しました');
      }
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleNavigateToNew = () => {
    setIsNavigatingNew(true);
    router.push('/');
  };

  const handleNavigateToDetail = (id: string) => {
    setNavigatingToId(id);
    router.push(`/entries/${id}`);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleNavigateToNew}
          disabled={isNavigatingNew}
          className="text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md shadow disabled:opacity-50"
        >
          {isNavigatingNew ? '遷移中...' : '新規登録'}
        </button>
      </div>

      <h1 className="text-xl font-bold mb-4 text-black">記録一覧</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">データを読み込み中です...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">登録がありません。</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <li key={entry.id} className="border p-4 rounded shadow flex justify-between items-center">
              <div>
                <button
                  onClick={() => handleNavigateToDetail(entry.id)}
                  disabled={navigatingToId === entry.id}
                  className="text-left text-blue-600 hover:underline disabled:opacity-50"
                >
                  {navigatingToId === entry.id
                    ? `${entry.title || '(無題)'} - ${entry.amount == null ? '—' : `${entry.amount.toLocaleString()}円`} - 遷移中...`
                    : `${entry.title || '(無題)'} - ${entry.amount == null ? '—' : `${entry.amount.toLocaleString()}円`}`}
                </button>
                <p className="text-sm text-gray-500">
                  {new Date(entry.date ?? '').toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deleteLoadingId === entry.id}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoadingId === entry.id ? '削除中...' : '削除'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

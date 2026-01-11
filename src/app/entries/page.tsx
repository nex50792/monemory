'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Entry = {
  id: string;
  title: string | null;
  amount: number | null;
  date: string | null;
};

export default function EntryListClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filters, setFilters] = useState({
    q: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    sort: 'date_desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [navigatingToId, setNavigatingToId] = useState<string | null>(null);
  const [isNavigatingNew, setIsNavigatingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const router = useRouter();

  const fetchEntries = useCallback(async (useFilters?: typeof filters) => {
    setLoading(true);
    try {
      const base = '/api/entries';
      const params = new URLSearchParams();
      const f = useFilters ?? { q: '', startDate: '', endDate: '', minAmount: '', maxAmount: '', sort: 'date_desc' };
      if (f.q) params.set('q', f.q);
      if (f.startDate) params.set('startDate', f.startDate);
      if (f.endDate) params.set('endDate', f.endDate);
      if (f.minAmount) params.set('minAmount', f.minAmount);
      if (f.maxAmount) params.set('maxAmount', f.maxAmount);
      if (f.sort) params.set('sort', f.sort);

      const url = params.toString() ? `${base}?${params.toString()}` : base;

      const res = await fetch(url);
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
  }, [setEntries, setError, setLoading]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if ((target as Element).closest('[data-open-menu], [data-menu-button]')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
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

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-black">記録一覧</h1>
        <button
          onClick={() => setShowFilters((s) => !s)}
          aria-pressed={showFilters}
          className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
          title="フィルター"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 13.414V17a1 1 0 01-1.447.894L7 16v-2.586L3.293 7.707A1 1 0 013 7V5z" />
          </svg>
        </button>
      </div>

      {showFilters && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-sm text-gray-600">検索</label>
            <input
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              className="ml-2 px-2 py-1 border rounded"
              placeholder="タイトルで検索"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">期間（開始）</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="ml-2 px-2 py-1 border rounded"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">期間（終了）</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="ml-2 px-2 py-1 border rounded"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">金額（最小）</label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
              className="ml-2 px-2 py-1 border rounded w-28"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">金額（最大）</label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
              className="ml-2 px-2 py-1 border rounded w-28"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">並べ替え</label>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              className="ml-2 px-2 py-1 border rounded"
            >
              <option value="date_desc">日付: 新しい順</option>
              <option value="date_asc">日付: 古い順</option>
              <option value="amount_desc">金額: 大きい順</option>
              <option value="amount_asc">金額: 小さい順</option>
              <option value="title_asc">タイトル: 昇順</option>
              <option value="title_desc">タイトル: 降順</option>
            </select>
          </div>
          <div className="ml-2">
            <button onClick={() => fetchEntries(filters)} className="px-3 py-1 bg-indigo-600 text-white rounded mr-2">適用</button>
            <button onClick={() => { setFilters({ q: '', startDate: '', endDate: '', minAmount: '', maxAmount: '', sort: 'date_desc' }); fetchEntries(); }} className="px-3 py-1 bg-gray-200 rounded">クリア</button>
          </div>
          </div>
        </div>
      )}
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
                  {entry.date ? new Date(entry.date).toLocaleDateString() : '—'}
                </p>
              </div>

              <div className="ml-4 relative">
                <button
                  data-menu-button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newId = openMenuId === entry.id ? null : entry.id;
                    setTimeout(() => setOpenMenuId(newId), 0);
                  }}
                  aria-haspopup="true"
                  aria-expanded={openMenuId === entry.id}
                  className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                >
                  …
                </button>

                {openMenuId === entry.id && (
                  <div data-open-menu className="absolute right-0 mt-2 w-36 bg-white border rounded shadow-md z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        setNavigatingToId(entry.id);
                        router.push(`/entries/${entry.id}/edit`);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                    >
                      編集
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleDelete(entry.id); }}
                      disabled={deleteLoadingId === entry.id}
                      className="w-full text-left px-3 py-2 text-red-600 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {deleteLoadingId === entry.id ? '削除中...' : '削除'}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

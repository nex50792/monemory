"use client";

import ConfirmModal from "@/components/ConfirmModal";
import GlobalMessage from "@/components/GlobalMessage";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

type Entry = {
  id: string;
  title: string | null;
  amount: number | null;
  date: string | null;
};

export default function EntryListClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  type Filters = {
    q: string;
    startDate: string;
    endDate: string;
    minAmount: string;
    maxAmount: string;
    sort: string;
  };
  type UIFilters = Filters & { categoryId: string; tagIds: string[] };

  const [filters, setFilters] = useState<Filters>({
    q: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    sort: "date_desc",
  });

  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);

  const [uiFilters, setUiFilters] = useState<UIFilters>({
    ...filters,
    categoryId: "",
    tagIds: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [navigatingToId, setNavigatingToId] = useState<string | null>(null);
  const [isNavigatingNew, setIsNavigatingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [onConfirmAction, setOnConfirmAction] = useState<
    (() => Promise<void> | void) | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);

  const router = useRouter();

  const fetchEntries = useCallback(
    async (useFilters?: Filters, useUiFilters?: UIFilters) => {
      setLoading(true);
      try {
        const base = "/api/entries";
        const params = new URLSearchParams();
        const f: Filters = useFilters ?? {
          q: "",
          startDate: "",
          endDate: "",
          minAmount: "",
          maxAmount: "",
          sort: "date_desc",
        };
        const u: UIFilters = useUiFilters ?? {
          ...f,
          categoryId: "",
          tagIds: [],
        };
        if (f.q) params.set("q", f.q);
        if (f.startDate) params.set("startDate", f.startDate);
        if (f.endDate) params.set("endDate", f.endDate);
        if (f.minAmount) params.set("minAmount", f.minAmount);
        if (f.maxAmount) params.set("maxAmount", f.maxAmount);
        if (f.sort) params.set("sort", f.sort);
        if (u.categoryId) params.set("categoryId", u.categoryId);
        if (u.tagIds && u.tagIds.length > 0)
          params.set("tagIds", u.tagIds.join(","));

        const qs = params.toString();
        const url = qs ? `${base}?${qs}` : base;

        const fetchKey = url;
        if (lastFetchKey.current === fetchKey) {
          setLoading(false);
          return;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("一覧取得に失敗しました");
        const data = await res.json();
        setEntries(data);
        setError(null);
        lastFetchKey.current = fetchKey;
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("不明なエラーが発生しました");
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const lastFetchKey = useRef<string>("");

  const searchParamsStr = useSearchParams()?.toString() ?? "";

  useEffect(() => {
    const sp = new URLSearchParams(searchParamsStr);
    const q = sp.get("q") ?? "";
    const startDate = sp.get("startDate") ?? "";
    const endDate = sp.get("endDate") ?? "";
    const minAmount = sp.get("minAmount") ?? "";
    const maxAmount = sp.get("maxAmount") ?? "";
    const sort = sp.get("sort") ?? "date_desc";
    const categoryId = sp.get("categoryId") ?? "";
    const tagIdsParam = sp.get("tagIds") ?? "";
    const tagIds = tagIdsParam ? tagIdsParam.split(",").filter(Boolean) : [];

    const parsedFilters: Filters = {
      q,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sort,
    };
    const parsedUiFilters: UIFilters = { ...parsedFilters, categoryId, tagIds };

    setFilters(parsedFilters);
    setUiFilters(parsedUiFilters);
    fetchEntries(parsedFilters, parsedUiFilters);
  }, [searchParamsStr, fetchEntries]);

  useEffect(() => {
    if (!showFilters) return;
    let mounted = true;
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/tags"),
        ]);
        if (!cRes.ok || !tRes.ok) return;
        const [cJson, tJson] = await Promise.all([cRes.json(), tRes.json()]);
        if (!mounted) return;
        setCategories(cJson);
        setTags(tJson);
      } catch {
        // フィルター用データの取得失敗は無視（UIに影響なし）
      }
    })();
    return () => {
      mounted = false;
    };
  }, [showFilters]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if ((target as Element).closest("[data-open-menu], [data-menu-button]"))
        return;
      setOpenMenuId(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleDelete = async (id: string) => {
    setConfirmMessage("本当に削除しますか？");
    setOnConfirmAction(() => async () => {
      setDeleteLoadingId(id);
      try {
        const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "削除に失敗しました");
        }
        lastFetchKey.current = "";
        await fetchEntries(filters, uiFilters);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("不明なエラーが発生しました");
        }
      } finally {
        setDeleteLoadingId(null);
      }
    });
    setConfirmOpen(true);
  };

  const handleNavigateToNew = () => {
    setIsNavigatingNew(true);
    router.push("/");
  };

  const handleNavigateToDetail = (id: string) => {
    setNavigatingToId(id);
    router.push(`/entries/${id}`);
  };

  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto mt-10 p-6">
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <GlobalMessage
          message={toast ?? error}
          onClose={() => {
            setToast(null);
            setError(null);
          }}
        />
        <ConfirmModal
          open={confirmOpen}
          message={confirmMessage}
          onConfirm={async () => {
            if (onConfirmAction) await onConfirmAction();
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
        />
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handleNavigateToNew}
            disabled={isNavigatingNew}
            className="text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md shadow disabled:opacity-50"
          >
            {isNavigatingNew ? "遷移中..." : "新規登録"}
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 13.414V17a1 1 0 01-1.447.894L7 16v-2.586L3.293 7.707A1 1 0 013 7V5z" />
            </svg>
          </button>
        </div>

        {showFilters && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-sm text-gray-600">検索</label>
                <input
                  value={uiFilters.q}
                  onChange={(e) =>
                    setUiFilters({ ...uiFilters, q: e.target.value })
                  }
                  className="ml-2 px-2 py-1 border rounded"
                  placeholder="タイトルで検索"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">期間（開始）</label>
                <input
                  type="date"
                  value={uiFilters.startDate}
                  onChange={(e) =>
                    setUiFilters({ ...uiFilters, startDate: e.target.value })
                  }
                  className="ml-2 px-2 py-1 border rounded"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">期間（終了）</label>
                <input
                  type="date"
                  value={uiFilters.endDate}
                  onChange={(e) =>
                    setUiFilters({ ...uiFilters, endDate: e.target.value })
                  }
                  className="ml-2 px-2 py-1 border rounded"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">金額（最小）</label>
                <input
                  type="number"
                  value={uiFilters.minAmount}
                  onChange={(e) =>
                    setUiFilters({ ...uiFilters, minAmount: e.target.value })
                  }
                  className="ml-2 px-2 py-1 border rounded w-28"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">金額（最大）</label>
                <input
                  type="number"
                  value={uiFilters.maxAmount}
                  onChange={(e) =>
                    setUiFilters({ ...uiFilters, maxAmount: e.target.value })
                  }
                  className="ml-2 px-2 py-1 border rounded w-28"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">並べ替え</label>
                <select
                  value={uiFilters.sort}
                  onChange={(e) =>
                    setUiFilters({ ...uiFilters, sort: e.target.value })
                  }
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
              <div className="min-w-[220px]">
                <label className="text-sm text-gray-600">
                  カテゴリ（1つ選択）
                </label>
                <div
                  className="ml-2 flex gap-2 flex-wrap"
                  role="radiogroup"
                  aria-label="カテゴリ"
                >
                  <button
                    onClick={() =>
                      setUiFilters({ ...uiFilters, categoryId: "" })
                    }
                    role="radio"
                    aria-checked={!uiFilters.categoryId}
                    tabIndex={0}
                    className={`px-3 py-1 border rounded-md focus:outline-none transition ${!uiFilters.categoryId ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"}`}
                  >
                    全て
                  </button>
                  {categories.map((c) => {
                    const selected = uiFilters.categoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() =>
                          setUiFilters({
                            ...uiFilters,
                            categoryId: selected ? "" : c.id,
                          })
                        }
                        role="radio"
                        aria-checked={selected}
                        tabIndex={0}
                        className={`px-3 py-1 border rounded-md focus:outline-none transition ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"}`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="min-w-[220px]">
                <label className="text-sm text-gray-600">
                  タグ（複数選択可）
                </label>
                <div
                  className="ml-2 flex gap-2 flex-wrap"
                  role="group"
                  aria-label="タグ"
                >
                  {tags.map((t) => {
                    const selected = uiFilters.tagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          const current: string[] = uiFilters.tagIds || [];
                          if (current.includes(t.id)) {
                            setUiFilters({
                              ...uiFilters,
                              tagIds: current.filter((id) => id !== t.id),
                            });
                          } else {
                            setUiFilters({
                              ...uiFilters,
                              tagIds: [...current, t.id],
                            });
                          }
                        }}
                        aria-pressed={selected}
                        className={`px-3 py-1 border rounded-md focus:outline-none transition ${selected ? "bg-indigo-100 text-indigo-800 border-indigo-200" : "bg-white"}`}
                      >
                        <span>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="ml-2">
                <button
                  onClick={() => {
                    const newFilters: Filters = {
                      q: uiFilters.q,
                      startDate: uiFilters.startDate,
                      endDate: uiFilters.endDate,
                      minAmount: uiFilters.minAmount,
                      maxAmount: uiFilters.maxAmount,
                      sort: uiFilters.sort,
                    };
                    setFilters(newFilters);
                    void fetchEntries(newFilters, uiFilters);
                  }}
                  className="px-3 py-1 bg-indigo-600 text-white rounded mr-2"
                >
                  適用
                </button>
                <button
                  onClick={() => {
                    const resetFilters: Filters = {
                      q: "",
                      startDate: "",
                      endDate: "",
                      minAmount: "",
                      maxAmount: "",
                      sort: "date_desc",
                    };
                    setFilters(resetFilters);
                    setUiFilters({
                      q: "",
                      startDate: "",
                      endDate: "",
                      minAmount: "",
                      maxAmount: "",
                      sort: "date_desc",
                      categoryId: "",
                      tagIds: [],
                    });
                    void fetchEntries(resetFilters, {
                      q: "",
                      startDate: "",
                      endDate: "",
                      minAmount: "",
                      maxAmount: "",
                      sort: "date_desc",
                      categoryId: "",
                      tagIds: [],
                    });
                  }}
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  クリア
                </button>
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
              <li
                key={entry.id}
                className="border p-4 rounded shadow flex justify-between items-center"
              >
                <div>
                  <button
                    onClick={() => handleNavigateToDetail(entry.id)}
                    disabled={navigatingToId === entry.id}
                    className="text-left text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {navigatingToId === entry.id
                      ? `${entry.title || "(無題)"} - ${entry.amount == null ? "—" : `${entry.amount.toLocaleString()}円`} - 遷移中...`
                      : `${entry.title || "(無題)"} - ${entry.amount == null ? "—" : `${entry.amount.toLocaleString()}円`}`}
                  </button>
                  <p className="text-sm text-gray-500">
                    {entry.date
                      ? new Date(entry.date).toLocaleDateString()
                      : "—"}
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
                    <div
                      data-open-menu
                      className="absolute right-0 mt-2 w-36 bg-white border rounded shadow-md z-50"
                    >
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleDelete(entry.id);
                        }}
                        disabled={deleteLoadingId === entry.id}
                        className="w-full text-left px-3 py-2 text-red-600 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {deleteLoadingId === entry.id ? "削除中..." : "削除"}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Suspense>
  );
}

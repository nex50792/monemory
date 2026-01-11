"use client"

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Item = { id: string; name: string };

export default function GlobalMenu() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    function onPointer(e: PointerEvent) {
      const target = e.target as Node
      if (!menuRef.current) return
      const header = document.querySelector('header')
      if (header && header.contains(target)) return
      if (menuRef.current.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  useEffect(() => {
    function onToggle() {
      setOpen((s) => !s)
    }

    window.addEventListener('globalmenu-toggle', onToggle as EventListener)
    return () => window.removeEventListener('globalmenu-toggle', onToggle as EventListener)
  }, [])

  useEffect(() => {
    if (open) window.dispatchEvent(new CustomEvent('globalmenu-open'))
    else window.dispatchEvent(new CustomEvent('globalmenu-close'))
  }, [open])

  const isActive = (p: string) => {
    if (!pathname) return false

    const normalize = (s: string) => (s.endsWith("/") && s !== "/" ? s.slice(0, -1) : s)
    const np = normalize(p)
    const nn = normalize(pathname)

    if (np === "/") return nn === "/"

    return nn === np || nn.startsWith(np + "/")
  }

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-full w-32 md:w-56 bg-white border-r transform transition-transform duration-200 md:relative md:translate-x-0 z-40 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        aria-label="グローバルメニュー"
        ref={menuRef}
      >
        <div className="p-4 h-full flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Monemory</h2>
          <nav className="flex-1">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className={`block px-3 py-2 rounded ${isActive("/") ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  新規作成
                </Link>
              </li>
              <li>
                <Link
                  href="/entries"
                  className={`block px-3 py-2 rounded ${isActive("/entries") ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  一覧
                </Link>
              </li>
            </ul>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">カテゴリ</h3>
              <CategoryTagList kind="category" />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">タグ</h3>
              <CategoryTagList kind="tag" />
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}

function CategoryTagList({ kind }: { kind: 'category' | 'tag' }) {
  const [items, setItems] = useState<Item[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(kind === 'category' ? '/api/categories' : '/api/tags');
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        setItems(json.slice(0, 20));
      } catch (e) {
        console.error('GlobalMenu category/tag fetch error', e);
      }
    })();
    return () => { mounted = false };
  }, [kind]);

  const currentCategory = searchParams?.get('categoryId') ?? '';
  const currentTagIds = (searchParams?.get('tagIds') ?? '').split(',').filter(Boolean);

  const pushWithParams = (params: URLSearchParams) => {
    const qs = params.toString();
    const href = qs ? `/entries?${qs}` : '/entries';
    router.push(href);
    try { window.dispatchEvent(new CustomEvent('globalmenu-toggle')); } catch {}
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map(it => {
        const isCategory = kind === 'category';
        const active = isCategory ? currentCategory === it.id : currentTagIds.includes(it.id);
        return (
          <button
            key={it.id}
            className={`text-left px-2 py-1 rounded hover:bg-gray-100 text-sm ${active ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700'}`}
            onClick={() => {
              const params = new URLSearchParams(searchParams?.toString() ?? '');
              if (isCategory) {
                if (params.get('categoryId') === it.id) {
                  params.delete('categoryId');
                } else {
                  params.set('categoryId', it.id);
                }
              } else {
                const tagParam = params.get('tagIds') ?? '';
                const tags = tagParam ? tagParam.split(',').filter(Boolean) : [];
                const has = tags.includes(it.id);
                const newTags = has ? tags.filter(t => t !== it.id) : [...tags, it.id];
                if (newTags.length > 0) params.set('tagIds', newTags.join(','));
                else params.delete('tagIds');
              }
              pushWithParams(params);
            }}
          >
            {it.name}
          </button>
        )
      })}
    </div>
  );
}

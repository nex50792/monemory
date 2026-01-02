"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

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
          </nav>
        </div>
      </aside>
    </>
  )
}

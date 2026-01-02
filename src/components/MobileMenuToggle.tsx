"use client"

import { useEffect, useState } from 'react'

export default function MobileMenuToggle() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onToggle() {
      setOpen((s) => !s)
    }
    function onOpen() {
      setOpen(true)
    }
    function onClose() {
      setOpen(false)
    }

    window.addEventListener('globalmenu-toggle', onToggle as EventListener)
    window.addEventListener('globalmenu-open', onOpen as EventListener)
    window.addEventListener('globalmenu-close', onClose as EventListener)
    return () => {
      window.removeEventListener('globalmenu-toggle', onToggle as EventListener)
      window.removeEventListener('globalmenu-open', onOpen as EventListener)
      window.removeEventListener('globalmenu-close', onClose as EventListener)
    }
  }, [])

  function handleClick() {
    window.dispatchEvent(new CustomEvent('globalmenu-toggle'))
  }

  return (
    <button
      aria-expanded={open}
      aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
      className={`px-3 py-2 rounded inline-flex items-center gap-2 ${open ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}
      onClick={handleClick}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6h18M3 12h18M3 18h18" stroke={open ? '#fff' : '#111827'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="hidden sm:inline">メニュー</span>
    </button>
  )
}

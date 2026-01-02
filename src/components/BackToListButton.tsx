"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function BackToListButton({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    router.push('/entries')
  }

  return (
    <button onClick={handleClick} disabled={loading} className="text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed bg-transparent">
      {loading ? '← 一覧に戻る (遷移中...)' : children}
    </button>
  )
}

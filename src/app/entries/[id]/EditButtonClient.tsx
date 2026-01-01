"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function EditButtonClient({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    router.push(`/entries/${id}/edit`)
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm shadow bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed`}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="w-4 h-4">
          <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
          <path fillRule="evenodd" d="M2 15.5V18h2.5l9.393-9.393-2.5-2.5L2 15.5z" clipRule="evenodd" />
        </svg>
      )}
      {loading ? '読み込み中...' : '編集'}
    </button>
  )
}

"use client"

import ConfirmModal from '@/components/ConfirmModal'
import GlobalMessage from '@/components/GlobalMessage'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteButtonClient({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '削除に失敗しました')
      }
      router.push('/entries')
    } catch (err) {
      console.error('削除エラー', err)
      setToast((err as Error)?.message || '削除に失敗しました')
    } finally {
      setLoading(false)
      setOpenConfirm(false)
    }
  }

  return (
    <>
    <GlobalMessage message={toast} onClose={() => setToast(null)} />
    <ConfirmModal open={openConfirm} message="本当に削除しますか？" onConfirm={handleDelete} onCancel={() => setOpenConfirm(false)} />
    <button
      onClick={() => setOpenConfirm(true)}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm shadow bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed`}
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
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H3a1 1 0 100 2h14a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm2 6a1 1 0 112 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" />
        </svg>
      )}
      {loading ? '削除中...' : '削除'}
    </button>
    </>
  )
}

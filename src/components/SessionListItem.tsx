'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCategory } from '@/lib/categories'
import { deleteSession } from '@/lib/db'
import type { Session } from '@/types/chat'

function fmtDate(t: number) {
  return new Date(t).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  session: Session
}

export function SessionListItem({ session }: Props) {
  const cat = getCategory(session.category)
  const firstUser = session.messages.find((m) => m.role === 'user')?.content ?? '(空)'
  const statusLabel =
    session.status === 'active' ? '進行中'
      : session.status === 'completed' ? '已完成'
      : '已放下'

  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(t)
  }, [confirming])

  async function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirming) {
      setConfirming(true)
      return
    }
    if (session.id == null) return
    setBusy(true)
    try {
      await deleteSession(session.id)
      // useSessions liveQuery refresh removes this row automatically.
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <div className="flex items-stretch bg-zen-surface border border-zen-muted/20 hover:border-zen-accent rounded-lg overflow-hidden transition-colors">
      <Link
        href={`/history/detail?id=${session.id}`}
        className="flex-1 p-5 min-w-0"
      >
        <div className="flex justify-between text-xs text-zen-muted">
          <span>{cat.label}</span>
          <span>{fmtDate(session.startedAt)} · {statusLabel}</span>
        </div>
        <p className="mt-2 text-zen-text line-clamp-2">{firstUser}</p>
      </Link>
      <button
        type="button"
        onClick={handleDeleteClick}
        disabled={busy}
        aria-label={confirming ? '確認刪除這次對話' : '刪除這次對話'}
        className={`px-4 text-xs border-l transition-colors ${
          confirming
            ? 'bg-red-900/40 text-red-200 border-red-500/40 hover:bg-red-900/60'
            : 'text-zen-muted border-zen-muted/20 hover:text-red-300 hover:bg-red-900/10'
        } disabled:opacity-50`}
      >
        {busy ? '…' : confirming ? '確認刪除' : '刪除'}
      </button>
    </div>
  )
}

'use client'
import Link from 'next/link'
import { useSessions } from '@/hooks/useSessions'
import { SessionListItem } from '@/components/SessionListItem'

export default function HistoryPage() {
  const sessions = useSessions()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">心經行走的足跡</h1>
        <Link href="/categories" className="text-sm text-zen-muted hover:text-zen-accent">
          ← 返回
        </Link>
      </header>

      {sessions === undefined && <p className="text-zen-muted">載入中...</p>}
      {sessions && sessions.length === 0 && (
        <p className="text-zen-muted">尚未有任何對話。</p>
      )}
      {sessions && sessions.length > 0 && (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <SessionListItem key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  )
}

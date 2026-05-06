'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useSession } from '@/hooks/useSessions'
import { ChatMessage } from '@/components/ChatMessage'
import { getCategory } from '@/lib/categories'

function HistoryDetailInner() {
  const searchParams = useSearchParams()
  const idParam = searchParams.get('id')
  const id = Number(idParam)
  const session = useSession(idParam && Number.isFinite(id) ? id : null)

  if (session === undefined) return <p className="text-zen-muted">載入中...</p>
  if (session === null) return <p className="text-zen-muted">找不到此 session。</p>

  const cat = getCategory(session.category)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-xl">{cat.label}</h1>
        <Link href="/history" className="text-sm text-zen-muted hover:text-zen-accent">
          ← 返回歷史
        </Link>
      </header>
      <div className="flex flex-col gap-4">
        {session.messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
      </div>
    </div>
  )
}

export default function HistoryDetailPage() {
  return (
    <Suspense fallback={<p className="text-zen-muted">載入中...</p>}>
      <HistoryDetailInner />
    </Suspense>
  )
}

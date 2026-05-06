import Link from 'next/link'
import { getCategory } from '@/lib/categories'
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

  return (
    <Link
      href={`/history/detail?id=${session.id}`}
      className="block bg-zen-surface border border-zen-muted/20 hover:border-zen-accent rounded-lg p-5"
    >
      <div className="flex justify-between text-xs text-zen-muted">
        <span>{cat.label}</span>
        <span>{fmtDate(session.startedAt)} · {statusLabel}</span>
      </div>
      <p className="mt-2 text-zen-text line-clamp-2">{firstUser}</p>
    </Link>
  )
}

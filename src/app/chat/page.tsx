'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BreathingLoader } from '@/components/BreathingLoader'
import { ChatMessage } from '@/components/ChatMessage'
import { ChatInput } from '@/components/ChatInput'
import { RoundIndicator } from '@/components/RoundIndicator'
import { useApiKey } from '@/hooks/useApiKey'
import { useChatSession } from '@/hooks/useChatSession'
import { getSession } from '@/lib/db'
import { getCategory } from '@/lib/categories'
import type { CategoryId } from '@/types/chat'

function ChatPageInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const sessionIdParam = sp.get('sessionId')
  const sessionId = sessionIdParam ? Number(sessionIdParam) : NaN

  const { apiKey, loading: keyLoading } = useApiKey()
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(sessionId)) {
      router.replace('/categories')
      return
    }
    getSession(sessionId).then((s) => {
      if (!s) router.replace('/categories')
      else {
        setCategory(s.category)
        setResolved(true)
      }
    })
  }, [sessionId, router])

  if (keyLoading || !resolved || !apiKey || !category) {
    return <p className="text-zen-muted">載入中...</p>
  }

  return (
    <ChatBody sessionId={sessionId} apiKey={apiKey} category={category} />
  )
}

function ChatBody({
  sessionId,
  apiKey,
  category,
}: {
  sessionId: number
  apiKey: string
  category: CategoryId
}) {
  const router = useRouter()
  const { session, status, error, roundNumber, freshAssistantIndex, send, retry, finishSession } =
    useChatSession(sessionId, apiKey, category)

  if (!session) return <p className="text-zen-muted">準備中...</p>

  const completedRounds = session.messages.filter((m) => m.role === 'assistant').length
  const isCompleted = status === 'completed' || session.status === 'completed'

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <Link href="/categories" className="text-sm text-zen-muted hover:text-zen-accent">
          ← 返回
        </Link>
        <RoundIndicator current={roundNumber} completed={completedRounds} />
      </header>

      <div className="flex flex-col gap-4 min-h-[40vh]">
        {session.messages.map((m, i) => (
          <ChatMessage
            key={i}
            message={m}
            revealMode={i === freshAssistantIndex ? 'live' : 'static'}
          />
        ))}
        {status === 'sending' && (
          <div className="flex justify-start">
            <div className="bg-zen-surface rounded-lg px-8 py-6">
              <BreathingLoader />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-md p-4 text-sm flex flex-col gap-3">
          <p>
            {error.kind === 'AUTH_FAILED'
              ? 'API key 似乎無效，請更新後重試。'
              : error.kind === 'RATE_LIMIT'
              ? '請求過於頻繁，請稍候再試。'
              : error.kind === 'NETWORK'
              ? '網路連線失敗。'
              : 'AI 回覆異常，請再試一次。'}
          </p>
          <div className="flex gap-3">
            {error.retryable && (
              <button
                onClick={() => retry()}
                className="text-zen-accent hover:underline"
              >
                重試
              </button>
            )}
            {error.kind === 'AUTH_FAILED' && (
              <button
                onClick={() => router.push('/setup')}
                className="text-zen-accent hover:underline"
              >
                更新 API key
              </button>
            )}
          </div>
        </div>
      )}

      {isCompleted ? (
        <div className="flex flex-col gap-4 border-t border-zen-muted/20 pt-6">
          <p className="text-zen-muted">這次對話已完成。</p>
          <div className="flex gap-3">
            <Link
              href="/history"
              className="bg-zen-surface border border-zen-muted/30 hover:border-zen-accent px-5 py-3 rounded-md"
            >
              查看歷史
            </Link>
            <Link
              href="/categories"
              className="bg-zen-accent/80 hover:bg-zen-accent text-zen-bg font-medium px-5 py-3 rounded-md"
            >
              放下並重新開始
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ChatInput
            disabled={status === 'sending'}
            onSubmit={(text) => send(text)}
            placeholder={getCategory(category).placeholder}
          />
          {completedRounds > 0 && (
            <button
              onClick={finishSession}
              className="text-sm text-zen-muted hover:text-zen-accent self-start"
            >
              提早放下並結束
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<p className="text-zen-muted">載入中...</p>}>
      <ChatPageInner />
    </Suspense>
  )
}

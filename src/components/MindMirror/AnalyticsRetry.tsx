'use client'

import { useState } from 'react'
import { extractSessionAnalytics } from '@/lib/analytics-pipeline'
import { getSession } from '@/lib/db'
import type { GeminiError } from '@/lib/gemini'

interface Props {
  sessionId: number
  apiKey: string
}

type State = 'idle' | 'running' | 'error'

function describeError(err: unknown): string {
  const e = err as Partial<GeminiError> & { message?: string }
  if (e?.kind === 'AUTH_FAILED') return 'API key 似乎無效，請更新後再試。'
  if (e?.kind === 'RATE_LIMIT') return '請求過於頻繁，稍候再試。'
  if (e?.kind === 'NETWORK') return '網路連線失敗，稍後再試。'
  if (e?.kind === 'SERVICE_UNAVAILABLE') return '服務暫時不穩，稍候再試。'
  if (e?.kind === 'INVALID_RESPONSE') return '回應格式異常，再試一次。'
  if (e?.kind === 'UNKNOWN') return e?.message ?? '未知錯誤，再試一次。'
  return e?.message ?? '靜觀擷取失敗，再試一次。'
}

export function AnalyticsRetry({ sessionId, apiKey }: Props) {
  const [state, setState] = useState<State>('idle')
  const [errorText, setErrorText] = useState<string | null>(null)

  async function handleRetry() {
    setState('running')
    setErrorText(null)
    try {
      const session = await getSession(sessionId)
      if (!session) throw new Error('找不到對話紀錄。')
      await extractSessionAnalytics(apiKey, session)
      // useLiveQuery on /mirror will pick up the new analytics row and
      // this component will unmount on its own.
    } catch (err) {
      console.warn('[analytics] retry failed', err)
      setErrorText(describeError(err))
      setState('error')
    }
  }

  return (
    <section className="gold-frame p-6 text-center">
      <h3 className="text-sm tracking-widest text-zen-muted mb-3">
        今日心鏡尚未顯映
      </h3>
      <p className="text-zen-muted leading-loose tracking-[0.05em] mb-5">
        今日對話已圓滿，靜觀尚未擷取。輕觸下方再試一次。
      </p>
      <button
        type="button"
        onClick={handleRetry}
        disabled={state === 'running'}
        className="border border-zen-accent/60 text-zen-accent px-5 py-2 text-sm tracking-widest hover:bg-zen-accent/10 disabled:opacity-40"
      >
        {state === 'running' ? '靜觀中…' : '重新擷取'}
      </button>
      {errorText && (
        <p className="mt-4 text-xs text-red-400/80 leading-loose">
          {errorText}
        </p>
      )}
    </section>
  )
}

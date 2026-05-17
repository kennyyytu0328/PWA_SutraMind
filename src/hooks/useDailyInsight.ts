'use client'
import { useCallback, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useApiKey } from '@/hooks/useApiKey'
import { getDailyInsight, getRecentAnalytics } from '@/lib/db'
import { todayLocalISO } from '@/lib/date-utils'
import { requestDailyInsight, NoRecentDataError } from '@/lib/insight-pipeline'
import { GeminiError, type GeminiErrorKind } from '@/lib/gemini'
import { getSegmentById } from '@/lib/sutra'
import sutraDb from '@/data/sutra-db.json'
import type { DailyInsightRecord } from '@/types/analytics'
import type { SutraSegment } from '@/types/chat'

const SUTRA_DB = sutraDb as SutraSegment[]

export type InsightStatus = 'empty' | 'ready' | 'requesting' | 'shown' | 'error'

export interface InsightError {
  kind: GeminiErrorKind | 'NO_DATA'
  message: string
}

export interface UseDailyInsightReturn {
  status: InsightStatus
  insight: DailyInsightRecord | null
  segment: SutraSegment | null
  error: InsightError | null
  request: () => Promise<void>
  isFirstReveal: boolean
}

export function useDailyInsight(): UseDailyInsightReturn {
  const { apiKey } = useApiKey()
  const todayRow = useLiveQuery(() => getDailyInsight(todayLocalISO()), [])
  const recentRows = useLiveQuery(() => getRecentAnalytics(7), [])

  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<InsightError | null>(null)
  const firstRevealRef = useRef<string | null>(null)

  const request = useCallback(async () => {
    if (!apiKey || requesting) return
    setRequesting(true)
    setError(null)
    try {
      const row = await requestDailyInsight(apiKey)
      firstRevealRef.current = row.date
    } catch (err) {
      if (err instanceof NoRecentDataError) {
        setError({ kind: 'NO_DATA', message: '尚無近日紀錄' })
      } else if (err instanceof GeminiError) {
        setError({ kind: err.kind, message: messageFor(err.kind) })
      } else {
        setError({ kind: 'UNKNOWN', message: '靜觀片刻，明日再試' })
      }
    } finally {
      setRequesting(false)
    }
  }, [apiKey, requesting])

  // Resolve status
  let status: InsightStatus = 'ready'
  if (requesting) {
    status = 'requesting'
  } else if (todayRow) {
    status = 'shown'
  } else if (recentRows !== undefined && recentRows.length === 0) {
    status = 'empty'
  } else if (error) {
    status = 'error'
  }
  // status stays 'ready' while liveQueries are still loading

  const segment = todayRow ? getSegmentById(SUTRA_DB, todayRow.segmentId) ?? null : null
  const isFirstReveal = todayRow !== undefined && firstRevealRef.current === todayRow.date

  return {
    status,
    insight: todayRow ?? null,
    segment,
    error,
    request,
    isFirstReveal,
  }
}

function messageFor(kind: GeminiErrorKind): string {
  switch (kind) {
    case 'NETWORK': return '網路未連線，稍後再試'
    case 'RATE_LIMIT': return '呼吸片刻，稍後再試'
    case 'AUTH_FAILED': return 'API 金鑰無效，請至設定更新'
    case 'INVALID_RESPONSE': return '靜觀片刻，明日再試'
    case 'UNKNOWN':
    default: return '靜觀片刻，明日再試'
  }
}

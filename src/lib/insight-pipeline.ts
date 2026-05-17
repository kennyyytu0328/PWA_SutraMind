import sutraDb from '@/data/sutra-db.json'
import { callGeminiRaw } from '@/lib/gemini'
import { todayLocalISO } from '@/lib/date-utils'
import {
  getDailyInsight,
  getRecentAnalytics,
  saveDailyInsight,
} from '@/lib/db'
import { getSegmentById } from '@/lib/sutra'
import { buildInsightPrompt } from '@/lib/insight-prompt-builder'
import { parseInsightResponse } from '@/lib/insight-parser'
import { pickInsightSegment } from '@/lib/insight-segment-picker'
import type { DailyInsightRecord } from '@/types/analytics'
import type { SutraSegment } from '@/types/chat'

const SUTRA_DB = sutraDb as SutraSegment[]
const RECENT_WINDOW_DAYS = 7

export class NoRecentDataError extends Error {
  constructor() {
    super('No analytics in the last 7 days')
    this.name = 'NoRecentDataError'
  }
}

/**
 * Tap-to-request entry point for the Daily Insight card.
 *
 * - Same-day guard: returns existing row without calling Gemini.
 * - Throws NoRecentDataError if no analytics exist in the last 7 local days.
 * - Throws GeminiError (kind: NETWORK | RATE_LIMIT | AUTH_FAILED | INVALID_RESPONSE | UNKNOWN)
 *   on any failure path. No row is written on any error.
 *
 * Invariant: this is the ONLY non-chat Gemini call site besides
 * `pipelineChatToAnalytics`.
 */
export async function requestDailyInsight(
  apiKey: string
): Promise<DailyInsightRecord> {
  const today = todayLocalISO()

  const existing = await getDailyInsight(today)
  if (existing) return existing

  const rows = await getRecentAnalytics(RECENT_WINDOW_DAYS)
  const pick = pickInsightSegment(rows)
  if (pick === null) throw new NoRecentDataError()

  const segment = getSegmentById(SUTRA_DB, pick.segmentId)
  if (!segment) {
    throw new NoRecentDataError()
  }

  const payload = buildInsightPrompt({
    metrics7d: pick.metrics7d,
    dominantDim: pick.dominantDim,
    segment,
  })

  const raw = await callGeminiRaw(apiKey, payload)
  const parsed = parseInsightResponse(raw)

  const row: DailyInsightRecord = {
    date: today,
    segmentId: pick.segmentId,
    dominantDim: pick.dominantDim,
    reflection: parsed.reflection,
    metricsSnapshot: pick.metrics7d,
    createdAt: Date.now(),
  }
  await saveDailyInsight(row)
  return row
}

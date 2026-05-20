import type { Session } from '@/types/chat'
import { buildAnalyticsPrompt } from '@/lib/analytics-prompt-builder'
import { callGeminiRaw } from '@/lib/gemini'
import { parseAnalyticsResponse } from '@/lib/analytics-parser'
import { mergeDailyAnalytics } from '@/lib/db'
import { todayLocalISO } from '@/lib/date-utils'

/**
 * Throws on any failure (Gemini error, parse failure, no messages, etc.).
 * Use this from a user-initiated retry where errors should be visible.
 */
export async function extractSessionAnalytics(
  apiKey: string,
  session: Session
): Promise<void> {
  if (session.id == null) {
    throw new Error('Session has no id')
  }
  if (session.messages.length === 0) {
    throw new Error('Session has no messages')
  }
  const payload = buildAnalyticsPrompt({
    messages: session.messages,
    category: session.category,
  })
  const raw = await callGeminiRaw(apiKey, payload)
  const parsed = parseAnalyticsResponse(raw)
  await mergeDailyAnalytics(todayLocalISO(), {
    metrics: parsed.metrics,
    mind_summary: parsed.mind_summary,
    recommended_segment: parsed.recommended_segment,
    source_session_id: session.id,
  })
}

/**
 * Fire-and-forget wrapper used immediately after chat completion.
 * NEVER throws: any failure is swallowed with a console.warn so chat is
 * unaffected. The user-facing retry path on /mirror uses the throwing
 * variant above so errors are visible when the user explicitly asks.
 */
export async function pipelineChatToAnalytics(
  apiKey: string,
  session: Session
): Promise<void> {
  try {
    await extractSessionAnalytics(apiKey, session)
  } catch (err) {
    console.warn('[analytics] pipeline failed silently', err)
  }
}

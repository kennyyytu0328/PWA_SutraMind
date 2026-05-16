import type { Session } from '@/types/chat'
import { buildAnalyticsPrompt } from '@/lib/analytics-prompt-builder'
import { callGeminiRaw } from '@/lib/gemini'
import { parseAnalyticsResponse } from '@/lib/analytics-parser'
import { mergeDailyAnalytics } from '@/lib/db'
import { todayLocalISO } from '@/lib/date-utils'

/**
 * Fire-and-forget analytics extraction. NEVER throws to the caller:
 * any failure is swallowed with a console.warn so chat is unaffected.
 */
export async function pipelineChatToAnalytics(
  apiKey: string,
  session: Session
): Promise<void> {
  try {
    if (session.id == null || session.messages.length === 0) return
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
  } catch (err) {
    console.warn('[analytics] pipeline failed silently', err)
  }
}

import { GeminiError } from '@/lib/gemini'
import { EMOTION_DIMENSIONS } from '@/types/analytics'
import type { EmotionMetrics } from '@/types/analytics'

export interface ParsedAnalytics {
  metrics: EmotionMetrics
  mind_summary: string
  recommended_segment: string | null
}

const SEGMENT_RE = /^segment_[1-9]$/

function extractJsonObject(raw: string): string {
  // Find the first '{' and walk braces to find the matching '}'.
  // Tolerates markdown fences (```json ... ```) and surrounding prose.
  const start = raw.indexOf('{')
  if (start === -1) {
    throw new GeminiError('INVALID_RESPONSE', 'No JSON object found in response', true)
  }
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  throw new GeminiError('INVALID_RESPONSE', 'Unbalanced braces in response', true)
}

function clampDim(v: unknown): number {
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new GeminiError('INVALID_RESPONSE', 'Dimension is not a number', true)
  }
  return Math.min(10, Math.max(0, Math.round(v)))
}

export function parseAnalyticsResponse(raw: string): ParsedAnalytics {
  const jsonStr = extractJsonObject(raw)
  let obj: unknown
  try {
    obj = JSON.parse(jsonStr)
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Analytics JSON failed to parse', true)
  }
  if (!obj || typeof obj !== 'object') {
    throw new GeminiError('INVALID_RESPONSE', 'Analytics root is not an object', true)
  }
  const root = obj as Record<string, unknown>
  const metricsRaw = root.metrics
  if (!metricsRaw || typeof metricsRaw !== 'object') {
    throw new GeminiError('INVALID_RESPONSE', 'Analytics metrics missing', true)
  }
  const mRaw = metricsRaw as Record<string, unknown>
  const metrics = {} as EmotionMetrics
  for (const dim of EMOTION_DIMENSIONS) {
    if (mRaw[dim] === undefined) {
      throw new GeminiError('INVALID_RESPONSE', `Metrics dimension ${dim} missing`, true)
    }
    metrics[dim] = clampDim(mRaw[dim])
  }
  if (typeof root.mind_summary !== 'string') {
    throw new GeminiError('INVALID_RESPONSE', 'Analytics mind_summary missing', true)
  }
  const rec = root.recommended_segment
  const recommended_segment =
    typeof rec === 'string' && SEGMENT_RE.test(rec) ? rec : null
  return {
    metrics,
    mind_summary: root.mind_summary,
    recommended_segment,
  }
}

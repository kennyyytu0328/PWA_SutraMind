import { GeminiError } from '@/lib/gemini'

export interface ParsedInsight {
  reflection: string
}

const MIN_LEN = 10
const MAX_LEN = 120

function extractJsonObject(raw: string): string {
  // Walk from first '{' to matching '}', string-aware. Tolerates markdown fences
  // and prose. Mirrors analytics-parser.ts exactly.
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
  throw new GeminiError('INVALID_RESPONSE', 'Unbalanced braces in insight response', true)
}

export function parseInsightResponse(raw: string): ParsedInsight {
  const jsonStr = extractJsonObject(raw)
  let obj: unknown
  try {
    obj = JSON.parse(jsonStr)
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Insight JSON failed to parse', true)
  }
  if (!obj || typeof obj !== 'object') {
    throw new GeminiError('INVALID_RESPONSE', 'Insight root is not an object', true)
  }
  const root = obj as Record<string, unknown>
  if (typeof root.reflection !== 'string') {
    throw new GeminiError('INVALID_RESPONSE', 'Insight reflection missing or non-string', true)
  }
  const trimmed = root.reflection.trim()
  const len = Array.from(trimmed).length
  if (len === 0) {
    throw new GeminiError('INVALID_RESPONSE', 'Insight reflection is empty', true)
  }
  if (len < MIN_LEN || len > MAX_LEN) {
    throw new GeminiError(
      'INVALID_RESPONSE',
      `Insight reflection length ${len} outside [${MIN_LEN}, ${MAX_LEN}]`,
      true
    )
  }
  return { reflection: trimmed }
}

import { GoogleGenAI } from '@google/genai'
import type { GeminiPayload } from '@/lib/prompt-builder'
import type { GeminiStructuredResponse } from '@/types/chat'

export type GeminiErrorKind =
  | 'AUTH_FAILED'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN'

export class GeminiError extends Error {
  constructor(
    public kind: GeminiErrorKind,
    message: string,
    public retryable: boolean
  ) {
    super(message)
    this.name = 'GeminiError'
  }
}

function extractStatus(err: unknown): number | undefined {
  const anyErr = err as { status?: unknown; code?: unknown; message?: unknown }
  if (typeof anyErr?.status === 'number') return anyErr.status
  if (typeof anyErr?.code === 'number') return anyErr.code
  const msg = typeof anyErr?.message === 'string' ? anyErr.message : ''
  const m = msg.match(/status:\s*(\d{3})/i) ?? msg.match(/"code"\s*:\s*(\d{3})/)
  return m ? Number(m[1]) : undefined
}

function looksLikeBadApiKey(message: string): boolean {
  return (
    /api[_\s-]?key/i.test(message) &&
    /(invalid|not valid|expired|denied)/i.test(message)
  ) || /API_KEY_INVALID/i.test(message)
}

export function classifyGeminiError(err: unknown): GeminiError {
  if (err instanceof TypeError) {
    return new GeminiError('NETWORK', err.message, true)
  }
  const message =
    typeof (err as { message?: unknown })?.message === 'string'
      ? ((err as { message: string }).message)
      : 'Unknown error'
  const status = extractStatus(err)

  if (status === 401 || status === 403) {
    return new GeminiError('AUTH_FAILED', message, false)
  }
  // Google returns 400 (not 401) for invalid API keys with a body like
  // {"error":{"code":400,"message":"API key not valid...","status":"INVALID_ARGUMENT"}}
  if (status === 400 && looksLikeBadApiKey(message)) {
    return new GeminiError('AUTH_FAILED', message, false)
  }
  if (status === 429) {
    return new GeminiError('RATE_LIMIT', message, true)
  }
  return new GeminiError('UNKNOWN', message, true)
}

export const DEFAULT_MODEL = 'gemma-4-31b-it'

export async function callGemini(
  apiKey: string,
  payload: GeminiPayload
): Promise<GeminiStructuredResponse> {
  let raw: string
  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: payload.contents,
      config: {
        systemInstruction: payload.systemInstruction,
        responseMimeType: payload.generationConfig.responseMimeType,
        responseSchema: payload.responseSchema,
        temperature: payload.generationConfig.temperature,
      },
    })
    raw = response.text ?? ''
  } catch (err) {
    throw classifyGeminiError(err)
  }

  let parsed: GeminiStructuredResponse
  try {
    parsed = JSON.parse(raw) as GeminiStructuredResponse
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Gemini returned non-JSON', true)
  }

  if (
    !Array.isArray(parsed.referenced_segment_ids) ||
    typeof parsed.response_text !== 'string'
  ) {
    throw new GeminiError(
      'INVALID_RESPONSE',
      'Gemini response missing required fields',
      true
    )
  }
  return parsed
}

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

export function classifyGeminiError(err: unknown): GeminiError {
  if (err instanceof TypeError) {
    return new GeminiError('NETWORK', err.message, true)
  }
  const anyErr = err as { status?: number; message?: string }
  const status = anyErr?.status
  const message = anyErr?.message ?? 'Unknown error'
  if (status === 401 || status === 403) {
    return new GeminiError('AUTH_FAILED', message, false)
  }
  if (status === 429) {
    return new GeminiError('RATE_LIMIT', message, true)
  }
  return new GeminiError('UNKNOWN', message, true)
}

export const DEFAULT_MODEL = 'gemini-2.5-flash'

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

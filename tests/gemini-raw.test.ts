import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the SDK at the boundary so we don't make real network calls.
const generateContentMock = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock }
  },
}))

import { callGeminiRaw, callGemini, GeminiError, classifyGeminiError, DEFAULT_MODEL } from '@/lib/gemini'
import type { GeminiPayload } from '@/lib/prompt-builder'

const payload: GeminiPayload = {
  systemInstruction: 'sys',
  contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
  responseSchema: { type: 'object' },
  generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
}

beforeEach(() => {
  generateContentMock.mockReset()
})

describe('DEFAULT_MODEL', () => {
  it('is gemma-4-31b-it', () => {
    expect(DEFAULT_MODEL).toBe('gemma-4-31b-it')
  })
})

describe('callGeminiRaw', () => {
  it('returns response.text on success', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '{"hello":"world"}' })
    const out = await callGeminiRaw('key', payload)
    expect(out).toBe('{"hello":"world"}')
    expect(generateContentMock).toHaveBeenCalledTimes(1)
  })

  it('returns empty string when response.text is undefined', async () => {
    generateContentMock.mockResolvedValueOnce({})
    const out = await callGeminiRaw('key', payload)
    expect(out).toBe('')
  })

  it('throws AUTH_FAILED (non-retryable) on 401', async () => {
    generateContentMock.mockRejectedValueOnce({ status: 401, message: 'unauth' })
    await expect(callGeminiRaw('key', payload)).rejects.toMatchObject({
      kind: 'AUTH_FAILED',
      retryable: false,
    })
    expect(generateContentMock).toHaveBeenCalledTimes(1) // no retry
  })

  it('throws RATE_LIMIT (does not auto-retry per shouldAutoRetry policy)', async () => {
    generateContentMock.mockRejectedValue({ status: 429, message: 'rate' })
    await expect(callGeminiRaw('key', payload)).rejects.toMatchObject({
      kind: 'RATE_LIMIT',
    })
    expect(generateContentMock).toHaveBeenCalledTimes(1)
  })
})

describe('callGemini (chat-specific wrapper) — behavior unchanged', () => {
  const chatJson = JSON.stringify({
    referenced_segment_ids: ['segment_4'],
    response_text: '請觀照呼吸',
    closing_practice: null,
  })

  it('parses + returns the validated chat shape on happy path', async () => {
    generateContentMock.mockResolvedValueOnce({ text: chatJson })
    const r = await callGemini('key', payload)
    expect(r.referenced_segment_ids).toEqual(['segment_4'])
    expect(r.response_text).toBe('請觀照呼吸')
  })

  it('throws INVALID_RESPONSE on non-JSON text', async () => {
    generateContentMock.mockResolvedValueOnce({ text: 'not json' })
    await expect(callGemini('key', payload)).rejects.toMatchObject({
      kind: 'INVALID_RESPONSE',
    })
  })

  it('throws INVALID_RESPONSE when response_text is missing', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({ referenced_segment_ids: ['segment_4'] }),
    })
    await expect(callGemini('key', payload)).rejects.toMatchObject({
      kind: 'INVALID_RESPONSE',
    })
  })
})

describe('classifyGeminiError — unchanged from pre-refactor', () => {
  it('classifies TypeError as NETWORK', () => {
    expect(classifyGeminiError(new TypeError('fetch failed')).kind).toBe('NETWORK')
  })

  it('classifies 400 + "API key invalid" as AUTH_FAILED', () => {
    expect(
      classifyGeminiError({ status: 400, message: 'API key not valid' }).kind
    ).toBe('AUTH_FAILED')
  })

  it('classifies unknown errors as UNKNOWN (retryable)', () => {
    const e = classifyGeminiError({ status: 500, message: 'server' })
    expect(e.kind).toBe('UNKNOWN')
    expect(e.retryable).toBe(true)
  })
})

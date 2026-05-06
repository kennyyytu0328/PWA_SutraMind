import { describe, it, expect } from 'vitest'
import { classifyGeminiError, GeminiError } from '@/lib/gemini'

describe('classifyGeminiError', () => {
  it('classifies 401 as AUTH_FAILED', () => {
    const e = classifyGeminiError({ status: 401, message: 'unauthorized' })
    expect(e).toBeInstanceOf(GeminiError)
    expect(e.kind).toBe('AUTH_FAILED')
    expect(e.retryable).toBe(false)
  })

  it('classifies 403 as AUTH_FAILED', () => {
    const e = classifyGeminiError({ status: 403, message: 'forbidden' })
    expect(e.kind).toBe('AUTH_FAILED')
  })

  it('classifies 429 as RATE_LIMIT (retryable)', () => {
    const e = classifyGeminiError({ status: 429, message: 'too many' })
    expect(e.kind).toBe('RATE_LIMIT')
    expect(e.retryable).toBe(true)
  })

  it('classifies network TypeError as NETWORK (retryable)', () => {
    const e = classifyGeminiError(new TypeError('Failed to fetch'))
    expect(e.kind).toBe('NETWORK')
    expect(e.retryable).toBe(true)
  })

  it('falls back to UNKNOWN', () => {
    const e = classifyGeminiError({ status: 500, message: 'oops' })
    expect(e.kind).toBe('UNKNOWN')
    expect(e.retryable).toBe(true)
  })

  it('classifies 400 with "API key not valid" as AUTH_FAILED (Google idiom)', () => {
    const e = classifyGeminiError({
      status: 400,
      message: 'API key not valid. Please pass a valid API key.',
    })
    expect(e.kind).toBe('AUTH_FAILED')
    expect(e.retryable).toBe(false)
  })

  it('classifies 400 with API_KEY_INVALID body as AUTH_FAILED', () => {
    const e = classifyGeminiError({
      status: 400,
      message:
        'got status: 400 Bad Request. {"error":{"code":400,"message":"API key not valid","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}',
    })
    expect(e.kind).toBe('AUTH_FAILED')
    expect(e.retryable).toBe(false)
  })

  it('classifies 400 with non-auth message as UNKNOWN', () => {
    const e = classifyGeminiError({
      status: 400,
      message: 'malformed request: missing field foo',
    })
    expect(e.kind).toBe('UNKNOWN')
    expect(e.retryable).toBe(true)
  })

  it('extracts status from error message when status property is absent', () => {
    const e = classifyGeminiError({
      message: 'got status: 401 Unauthorized. {"error":{"code":401}}',
    })
    expect(e.kind).toBe('AUTH_FAILED')
  })

  it('uses err.code when err.status is absent', () => {
    const e = classifyGeminiError({ code: 429, message: 'rate' })
    expect(e.kind).toBe('RATE_LIMIT')
  })
})

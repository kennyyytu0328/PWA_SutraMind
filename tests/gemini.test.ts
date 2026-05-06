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
})

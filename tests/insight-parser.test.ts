import { describe, it, expect } from 'vitest'
import { parseInsightResponse } from '@/lib/insight-parser'
import { GeminiError } from '@/lib/gemini'

describe('parseInsightResponse', () => {
  it('parses bare JSON', () => {
    const got = parseInsightResponse('{"reflection":"你近日心緒繫於形相試觀色與空本是一處。"}')
    expect(got.reflection).toBe('你近日心緒繫於形相試觀色與空本是一處。')
  })

  it('parses markdown-fenced JSON', () => {
    const raw = '```json\n{"reflection":"你近日心緒繫於形相試觀色與空本是一處。"}\n```'
    expect(parseInsightResponse(raw).reflection).toContain('你近日')
  })

  it('parses JSON wrapped in prose', () => {
    const raw = 'Here is the result:\n{"reflection":"你近日心緒繫於形相試觀色與空本是一處。"}\nThanks.'
    expect(parseInsightResponse(raw).reflection).toContain('你近日')
  })

  it('trims surrounding whitespace from reflection', () => {
    const got = parseInsightResponse('{"reflection":"  你近日心緒繫於形相試觀色與空本是一處。  "}')
    expect(got.reflection.startsWith(' ')).toBe(false)
    expect(got.reflection.endsWith(' ')).toBe(false)
  })

  it('rejects when no JSON object', () => {
    expect(() => parseInsightResponse('no braces here'))
      .toThrowError(GeminiError)
  })

  it('rejects when reflection field missing', () => {
    expect(() => parseInsightResponse('{"other":"x"}'))
      .toThrowError(GeminiError)
  })

  it('rejects when reflection is empty string', () => {
    expect(() => parseInsightResponse('{"reflection":""}'))
      .toThrowError(GeminiError)
  })

  it('rejects when reflection is non-string', () => {
    expect(() => parseInsightResponse('{"reflection":42}'))
      .toThrowError(GeminiError)
  })

  it('rejects when length < 10 chars (CJK code points)', () => {
    expect(() => parseInsightResponse('{"reflection":"太短了"}'))
      .toThrowError(GeminiError)
  })

  it('rejects when length > 120 chars', () => {
    const long = '阿'.repeat(121)
    expect(() => parseInsightResponse(`{"reflection":"${long}"}`))
      .toThrowError(GeminiError)
  })

  it('counts CJK code points, not UTF-16 units', () => {
    const exactly20 = '阿'.repeat(20)
    expect(parseInsightResponse(`{"reflection":"${exactly20}"}`).reflection).toBe(exactly20)
  })
})

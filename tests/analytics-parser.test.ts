import { describe, it, expect } from 'vitest'
import { parseAnalyticsResponse } from '@/lib/analytics-parser'
import { GeminiError } from '@/lib/gemini'

const valid = {
  metrics: {
    work_anxiety: 3,
    relationship_clinging: 7,
    existential_emptiness: 1,
    health_fear: 4,
    acute_emotion: 8,
  },
  mind_summary: '心緒翻湧，多在關係與情緒高峰之處執著',
  recommended_segment: 'segment_4',
}

describe('parseAnalyticsResponse — happy paths', () => {
  it('parses clean JSON', () => {
    const r = parseAnalyticsResponse(JSON.stringify(valid))
    expect(r.metrics).toEqual(valid.metrics)
    expect(r.mind_summary).toBe(valid.mind_summary)
    expect(r.recommended_segment).toBe('segment_4')
  })

  it('parses markdown-fenced JSON', () => {
    const raw = '```json\n' + JSON.stringify(valid) + '\n```'
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics).toEqual(valid.metrics)
  })

  it('parses JSON with prefix text and fence', () => {
    const raw = '這裡是分析結果：\n```json\n' + JSON.stringify(valid) + '\n```'
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics).toEqual(valid.metrics)
  })

  it('parses JSON with prefix text and no fence (brace extraction)', () => {
    const raw = 'preface\n' + JSON.stringify(valid) + '\ntrailing'
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics).toEqual(valid.metrics)
  })
})

describe('parseAnalyticsResponse — clamping', () => {
  it('clamps out-of-range dimensions to [0,10]', () => {
    const raw = JSON.stringify({
      ...valid,
      metrics: { ...valid.metrics, work_anxiety: 15, health_fear: -2 },
    })
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics.work_anxiety).toBe(10)
    expect(r.metrics.health_fear).toBe(0)
  })

  it('rounds floats to integers', () => {
    const raw = JSON.stringify({
      ...valid,
      metrics: { ...valid.metrics, work_anxiety: 3.7, acute_emotion: 4.2 },
    })
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics.work_anxiety).toBe(4)
    expect(r.metrics.acute_emotion).toBe(4)
  })
})

describe('parseAnalyticsResponse — optional fields', () => {
  it('returns null for missing recommended_segment', () => {
    const { recommended_segment: _, ...rest } = valid
    const r = parseAnalyticsResponse(JSON.stringify(rest))
    expect(r.recommended_segment).toBeNull()
  })

  it('returns null when recommended_segment is invalid (not segment_N)', () => {
    const r = parseAnalyticsResponse(JSON.stringify({ ...valid, recommended_segment: 'segment_99' }))
    expect(r.recommended_segment).toBeNull()
  })

  it('returns null when recommended_segment is gibberish', () => {
    const r = parseAnalyticsResponse(JSON.stringify({ ...valid, recommended_segment: 'foo' }))
    expect(r.recommended_segment).toBeNull()
  })
})

describe('parseAnalyticsResponse — invalid input throws GeminiError(INVALID_RESPONSE)', () => {
  it('throws when no JSON object can be located', () => {
    expect(() => parseAnalyticsResponse('totally not json')).toThrow(GeminiError)
    try {
      parseAnalyticsResponse('totally not json')
    } catch (e) {
      expect((e as GeminiError).kind).toBe('INVALID_RESPONSE')
    }
  })

  it('throws when metrics object is missing', () => {
    const { metrics: _, ...rest } = valid
    expect(() => parseAnalyticsResponse(JSON.stringify(rest))).toThrow(GeminiError)
  })

  it('throws when a required dimension is missing from metrics', () => {
    const broken = { ...valid, metrics: { ...valid.metrics, work_anxiety: undefined } }
    expect(() => parseAnalyticsResponse(JSON.stringify(broken))).toThrow(GeminiError)
  })

  it('throws when mind_summary is missing', () => {
    const { mind_summary: _, ...rest } = valid
    expect(() => parseAnalyticsResponse(JSON.stringify(rest))).toThrow(GeminiError)
  })

  it('throws when JSON parse itself fails on malformed braces', () => {
    expect(() => parseAnalyticsResponse('{ "metrics": { bad')).toThrow(GeminiError)
  })
})

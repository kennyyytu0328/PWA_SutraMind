import { describe, it, expect } from 'vitest'
import { pickInsightSegment } from '@/lib/insight-segment-picker'
import type { DailyAnalytics } from '@/types/analytics'

function row(date: string, m: Partial<DailyAnalytics['metrics']> = {}): DailyAnalytics {
  return {
    date,
    metrics: {
      work_anxiety: 0,
      relationship_clinging: 0,
      existential_emptiness: 0,
      health_fear: 0,
      acute_emotion: 0,
      ...m,
    },
    mind_summary: '',
    recommended_segment: null,
    updated_at: 0,
    source_session_ids: [],
  }
}

describe('pickInsightSegment', () => {
  it('returns null on empty rows', () => {
    expect(pickInsightSegment([])).toBeNull()
  })

  it('single row: mean equals that row, picks segment_3 when health_fear dominates', () => {
    const got = pickInsightSegment([row('2026-05-17', { health_fear: 8, work_anxiety: 3 })])
    expect(got).not.toBeNull()
    expect(got!.dominantDim).toBe('health_fear')
    expect(got!.segmentId).toBe('segment_3')
    expect(got!.metrics7d.health_fear).toBe(8)
    expect(got!.metrics7d.work_anxiety).toBe(3)
  })

  it('multi-row: aggregates by mean', () => {
    const rows = [
      row('2026-05-15', { work_anxiety: 9 }),
      row('2026-05-16', { work_anxiety: 3 }),
      row('2026-05-17', { work_anxiety: 6 }),
    ]
    const got = pickInsightSegment(rows)
    expect(got!.metrics7d.work_anxiety).toBe(6) // (9+3+6)/3
    expect(got!.dominantDim).toBe('work_anxiety')
    expect(got!.segmentId).toBe('segment_5')
  })

  it('maps each dominant dim to the correct segment', () => {
    const cases: Array<[keyof DailyAnalytics['metrics'], string]> = [
      ['work_anxiety', 'segment_5'],
      ['relationship_clinging', 'segment_1'],
      ['existential_emptiness', 'segment_7'],
      ['health_fear', 'segment_3'],
      ['acute_emotion', 'segment_2'],
    ]
    for (const [dim, seg] of cases) {
      const got = pickInsightSegment([row('2026-05-17', { [dim]: 9 })])
      expect(got!.dominantDim).toBe(dim)
      expect(got!.segmentId).toBe(seg)
    }
  })

  it('all-zero rows: priority order wins (health_fear → segment_3)', () => {
    const got = pickInsightSegment([row('2026-05-17')])
    expect(got!.dominantDim).toBe('health_fear')
    expect(got!.segmentId).toBe('segment_3')
  })

  it('two-way tie: priority order wins', () => {
    // health_fear and acute_emotion both 5; priority puts health_fear first
    const got = pickInsightSegment([
      row('2026-05-17', { health_fear: 5, acute_emotion: 5 }),
    ])
    expect(got!.dominantDim).toBe('health_fear')
  })

  it('tie between acute_emotion and relationship_clinging: acute_emotion wins', () => {
    const got = pickInsightSegment([
      row('2026-05-17', { acute_emotion: 4, relationship_clinging: 4 }),
    ])
    expect(got!.dominantDim).toBe('acute_emotion')
  })

  it('rounds means to one decimal in metrics7d for stable prompts', () => {
    const rows = [
      row('2026-05-15', { work_anxiety: 1 }),
      row('2026-05-16', { work_anxiety: 2 }),
      row('2026-05-17', { work_anxiety: 2 }),
    ]
    // (1+2+2)/3 = 1.6666... → 1.7
    expect(pickInsightSegment(rows)!.metrics7d.work_anxiety).toBe(1.7)
  })
})

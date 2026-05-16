import { describe, it, expect } from 'vitest'
import {
  attachmentIndex,
  last7Days,
  last30Days,
  aggregateMetricsMax,
} from '@/lib/mirror-stats'
import type { DailyAnalytics, EmotionMetrics } from '@/types/analytics'

const m = (over: Partial<EmotionMetrics> = {}): EmotionMetrics => ({
  work_anxiety: 0,
  relationship_clinging: 0,
  existential_emptiness: 0,
  health_fear: 0,
  acute_emotion: 0,
  ...over,
})

const row = (date: string, metrics: EmotionMetrics): DailyAnalytics => ({
  date,
  metrics,
  mind_summary: '',
  recommended_segment: null,
  updated_at: 0,
  source_session_ids: [],
})

describe('attachmentIndex', () => {
  it('returns 0 for all-zero metrics', () => {
    expect(attachmentIndex(m())).toBe(0)
  })

  it('returns 10 for all-max metrics', () => {
    expect(
      attachmentIndex(
        m({
          work_anxiety: 10,
          relationship_clinging: 10,
          existential_emptiness: 10,
          health_fear: 10,
          acute_emotion: 10,
        })
      )
    ).toBe(10)
  })

  it('averages 5 dimensions correctly', () => {
    // (3+7+0+0+4)/5 = 2.8
    expect(attachmentIndex(m({ work_anxiety: 3, relationship_clinging: 7, acute_emotion: 4 }))).toBe(2.8)
  })
})

describe('last7Days / last30Days', () => {
  const rows = [
    row('2026-05-10', m()),
    row('2026-05-11', m()),
    row('2026-05-12', m()),
    row('2026-05-13', m()),
    row('2026-05-14', m()),
    row('2026-05-15', m()),
    row('2026-05-16', m()),
    row('2026-05-17', m()),
    row('2026-05-18', m()),
  ]

  it('last7Days returns the 7 most-recent rows (by trailing slice)', () => {
    const r = last7Days(rows)
    expect(r).toHaveLength(7)
    expect(r[0].date).toBe('2026-05-12')
    expect(r[6].date).toBe('2026-05-18')
  })

  it('last7Days returns all rows when fewer than 7', () => {
    const r = last7Days(rows.slice(0, 3))
    expect(r).toHaveLength(3)
  })

  it('last30Days returns up to 30 rows', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      row(`2026-04-${String(i + 1).padStart(2, '0')}`, m())
    )
    expect(last30Days(many)).toHaveLength(30)
  })

  it('last30Days returns empty for empty input', () => {
    expect(last30Days([])).toEqual([])
  })
})

describe('aggregateMetricsMax', () => {
  it('returns all-zero for empty input', () => {
    expect(aggregateMetricsMax([])).toEqual(m())
  })

  it('per-dimension max across rows', () => {
    const r = aggregateMetricsMax([
      row('a', m({ work_anxiety: 3, relationship_clinging: 8 })),
      row('b', m({ work_anxiety: 7, existential_emptiness: 5 })),
      row('c', m({ acute_emotion: 9 })),
    ])
    expect(r).toEqual({
      work_anxiety: 7,
      relationship_clinging: 8,
      existential_emptiness: 5,
      health_fear: 0,
      acute_emotion: 9,
    })
  })
})

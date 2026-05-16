import { describe, it, expect, beforeEach } from 'vitest'
import {
  db,
  getDailyAnalytics,
  listAnalytics,
  mergeDailyAnalytics,
  getProfile,
  setProfile,
} from '@/lib/db'
import type { EmotionMetrics } from '@/types/analytics'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const baseMetrics: EmotionMetrics = {
  work_anxiety: 3,
  relationship_clinging: 2,
  existential_emptiness: 1,
  health_fear: 0,
  acute_emotion: 4,
}

describe('mergeDailyAnalytics — first write', () => {
  it('inserts a new row when date has no prior data', async () => {
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics,
      mind_summary: 'first summary',
      recommended_segment: 'segment_4',
      source_session_id: 101,
    })
    const row = await getDailyAnalytics('2026-05-16')
    expect(row).toBeDefined()
    expect(row!.metrics).toEqual(baseMetrics)
    expect(row!.mind_summary).toBe('first summary')
    expect(row!.recommended_segment).toBe('segment_4')
    expect(row!.source_session_ids).toEqual([101])
    expect(row!.updated_at).toBeTypeOf('number')
  })
})

describe('mergeDailyAnalytics — same-day merge', () => {
  it('takes per-dimension max', async () => {
    await mergeDailyAnalytics('2026-05-16', {
      metrics: { work_anxiety: 3, relationship_clinging: 8, existential_emptiness: 1, health_fear: 0, acute_emotion: 4 },
      mind_summary: 'first',
      recommended_segment: 'segment_4',
      source_session_id: 1,
    })
    await mergeDailyAnalytics('2026-05-16', {
      metrics: { work_anxiety: 7, relationship_clinging: 2, existential_emptiness: 5, health_fear: 6, acute_emotion: 4 },
      mind_summary: 'second',
      recommended_segment: 'segment_1',
      source_session_id: 2,
    })
    const row = await getDailyAnalytics('2026-05-16')
    expect(row!.metrics).toEqual({
      work_anxiety: 7,            // max(3,7)
      relationship_clinging: 8,   // max(8,2)
      existential_emptiness: 5,   // max(1,5)
      health_fear: 6,             // max(0,6)
      acute_emotion: 4,           // max(4,4)
    })
  })

  it('overwrites mind_summary with the latest', async () => {
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'old', recommended_segment: 'segment_1', source_session_id: 1,
    })
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'new', recommended_segment: 'segment_2', source_session_id: 2,
    })
    const row = await getDailyAnalytics('2026-05-16')
    expect(row!.mind_summary).toBe('new')
    expect(row!.recommended_segment).toBe('segment_2')
  })

  it('appends source_session_ids with dedupe', async () => {
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'a', recommended_segment: null, source_session_id: 1,
    })
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'b', recommended_segment: null, source_session_id: 2,
    })
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'c', recommended_segment: null, source_session_id: 1, // duplicate
    })
    const row = await getDailyAnalytics('2026-05-16')
    expect(row!.source_session_ids).toEqual([1, 2])
  })
})

describe('listAnalytics', () => {
  it('returns rows in ascending date order', async () => {
    await mergeDailyAnalytics('2026-05-16', { metrics: baseMetrics, mind_summary: 'b', recommended_segment: null, source_session_id: 2 })
    await mergeDailyAnalytics('2026-05-15', { metrics: baseMetrics, mind_summary: 'a', recommended_segment: null, source_session_id: 1 })
    await mergeDailyAnalytics('2026-05-17', { metrics: baseMetrics, mind_summary: 'c', recommended_segment: null, source_session_id: 3 })
    const rows = await listAnalytics()
    expect(rows.map((r) => r.date)).toEqual(['2026-05-15', '2026-05-16', '2026-05-17'])
  })

  it('returns empty array when none stored', async () => {
    expect(await listAnalytics()).toEqual([])
  })
})

describe('profile kv', () => {
  it('returns null for missing key', async () => {
    expect(await getProfile('missing')).toBeNull()
  })

  it('round-trips a string value', async () => {
    await setProfile('cultivation_rank', 'beginner')
    expect(await getProfile<string>('cultivation_rank')).toBe('beginner')
  })

  it('round-trips an object value', async () => {
    await setProfile('settings', { bell: true, theme: 'dark' })
    expect(await getProfile<{ bell: boolean; theme: string }>('settings')).toEqual({
      bell: true,
      theme: 'dark',
    })
  })

  it('overwrites on second set', async () => {
    await setProfile('k', 1)
    await setProfile('k', 2)
    expect(await getProfile<number>('k')).toBe(2)
  })
})

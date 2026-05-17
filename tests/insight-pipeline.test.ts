import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  db,
  saveDailyInsight,
  getDailyInsight,
  mergeDailyAnalytics,
} from '@/lib/db'
import * as gemini from '@/lib/gemini'
import { GeminiError } from '@/lib/gemini'
import { todayLocalISO } from '@/lib/date-utils'
import { requestDailyInsight, NoRecentDataError } from '@/lib/insight-pipeline'

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>()
  return {
    ...actual,
    callGeminiRaw: vi.fn(),
  }
})

const mockCall = vi.mocked(gemini.callGeminiRaw)

beforeEach(async () => {
  await db.delete()
  await db.open()
  mockCall.mockReset()
})

async function seedAnalytics(date: string, healthFear = 7) {
  await mergeDailyAnalytics(date, {
    metrics: {
      work_anxiety: 1,
      relationship_clinging: 1,
      existential_emptiness: 1,
      health_fear: healthFear,
      acute_emotion: 1,
    },
    mind_summary: 'seed',
    recommended_segment: null,
    source_session_id: 1,
  })
}

describe('requestDailyInsight', () => {
  it('throws NoRecentDataError when no analytics exist', async () => {
    await expect(requestDailyInsight('FAKE_KEY')).rejects.toBeInstanceOf(NoRecentDataError)
    expect(mockCall).not.toHaveBeenCalled()
  })

  it('happy path: persists a row and returns it', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockResolvedValueOnce(
      '{"reflection":"你近日畏懼身體之變試觀此身亦非實有不必驚不必逃。"}'
    )
    const row = await requestDailyInsight('FAKE_KEY')
    expect(row.date).toBe(todayLocalISO())
    expect(row.dominantDim).toBe('health_fear')
    expect(row.segmentId).toBe('segment_3')
    expect(row.reflection).toContain('你近日')
    expect(await getDailyInsight(todayLocalISO())).toEqual(row)
  })

  it('same-day guard: returns existing row without calling Gemini', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    await saveDailyInsight({
      date: todayLocalISO(),
      segmentId: 'segment_3',
      dominantDim: 'health_fear',
      reflection: '舊有的靜觀內容靜默不變如山岳常住。',
      metricsSnapshot: {
        work_anxiety: 0, relationship_clinging: 0, existential_emptiness: 0,
        health_fear: 0, acute_emotion: 0,
      },
      createdAt: 1,
    })
    const row = await requestDailyInsight('FAKE_KEY')
    expect(row.reflection).toContain('舊有的靜觀')
    expect(mockCall).not.toHaveBeenCalled()
  })

  it('Gemini NETWORK error: does not write a row', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockRejectedValueOnce(new GeminiError('NETWORK', 'offline', true))
    await expect(requestDailyInsight('FAKE_KEY')).rejects.toMatchObject({
      kind: 'NETWORK',
    })
    expect(await getDailyInsight(todayLocalISO())).toBeUndefined()
  })

  it('parser INVALID_RESPONSE: does not write a row', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockResolvedValueOnce('not json at all')
    await expect(requestDailyInsight('FAKE_KEY')).rejects.toMatchObject({
      kind: 'INVALID_RESPONSE',
    })
    expect(await getDailyInsight(todayLocalISO())).toBeUndefined()
  })

  it('AUTH_FAILED: does not write a row', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockRejectedValueOnce(new GeminiError('AUTH_FAILED', 'bad key', false))
    await expect(requestDailyInsight('FAKE_KEY')).rejects.toMatchObject({
      kind: 'AUTH_FAILED',
    })
    expect(await getDailyInsight(todayLocalISO())).toBeUndefined()
  })

  it('passes 7-day mean to the prompt', async () => {
    const yesterday = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1)
      return d.toLocaleDateString('sv-SE')
    })()
    await seedAnalytics(yesterday, 4)
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockResolvedValueOnce(
      '{"reflection":"你近日畏懼身體之變試觀此身亦非實有不必驚不必逃。"}'
    )
    await requestDailyInsight('FAKE_KEY')
    expect(mockCall).toHaveBeenCalledTimes(1)
    const payload = mockCall.mock.calls[0][1]
    // mean of 4 and 8 → 6.0
    expect(payload.systemInstruction).toContain('健康恐懼：6.0')
  })
})

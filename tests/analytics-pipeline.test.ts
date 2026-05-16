import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  db,
  getDailyAnalytics,
} from '@/lib/db'
import { pipelineChatToAnalytics } from '@/lib/analytics-pipeline'
import { GeminiError } from '@/lib/gemini'
import type { Session } from '@/types/chat'

vi.mock('@/lib/gemini', async () => {
  const actual = await vi.importActual<typeof import('@/lib/gemini')>('@/lib/gemini')
  return {
    ...actual,
    callGeminiRaw: vi.fn(),
  }
})

import * as gemini from '@/lib/gemini'

beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.resetAllMocks()
})

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 42,
    category: 'emotion_relation',
    startedAt: 1,
    messages: [
      { role: 'user', content: '我很焦慮', timestamp: 1 },
      { role: 'assistant', content: '深呼吸', referencedSegmentIds: ['segment_4'], timestamp: 2 },
    ],
    status: 'completed',
    ...overrides,
  }
}

const validRaw = JSON.stringify({
  metrics: {
    work_anxiety: 5,
    relationship_clinging: 2,
    existential_emptiness: 1,
    health_fear: 0,
    acute_emotion: 7,
  },
  mind_summary: '焦慮主導，情緒突發',
  recommended_segment: 'segment_4',
})

describe('pipelineChatToAnalytics — happy path', () => {
  it('writes analytics for today after Gemma returns valid JSON', async () => {
    vi.mocked(gemini.callGeminiRaw).mockResolvedValueOnce(validRaw)
    await pipelineChatToAnalytics('test-key', makeSession())
    const rows = await db.analytics.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].metrics.acute_emotion).toBe(7)
    expect(rows[0].mind_summary).toBe('焦慮主導，情緒突發')
    expect(rows[0].source_session_ids).toEqual([42])
  })
})

describe('pipelineChatToAnalytics — failure modes (must not throw)', () => {
  it('swallows AUTH_FAILED silently', async () => {
    vi.mocked(gemini.callGeminiRaw).mockRejectedValueOnce(
      new GeminiError('AUTH_FAILED', 'bad key', false)
    )
    await expect(
      pipelineChatToAnalytics('test-key', makeSession())
    ).resolves.toBeUndefined()
    expect(await db.analytics.count()).toBe(0)
  })

  it('swallows RATE_LIMIT silently', async () => {
    vi.mocked(gemini.callGeminiRaw).mockRejectedValueOnce(
      new GeminiError('RATE_LIMIT', '429', true)
    )
    await expect(
      pipelineChatToAnalytics('test-key', makeSession())
    ).resolves.toBeUndefined()
    expect(await db.analytics.count()).toBe(0)
  })

  it('swallows INVALID_RESPONSE when raw is not JSON', async () => {
    vi.mocked(gemini.callGeminiRaw).mockResolvedValueOnce('totally not json')
    await expect(
      pipelineChatToAnalytics('test-key', makeSession())
    ).resolves.toBeUndefined()
    expect(await db.analytics.count()).toBe(0)
  })

  it('swallows NETWORK errors', async () => {
    vi.mocked(gemini.callGeminiRaw).mockRejectedValueOnce(
      new GeminiError('NETWORK', 'offline', true)
    )
    await expect(
      pipelineChatToAnalytics('test-key', makeSession())
    ).resolves.toBeUndefined()
  })

  it('does nothing when session has no id', async () => {
    vi.mocked(gemini.callGeminiRaw).mockResolvedValueOnce(validRaw)
    await pipelineChatToAnalytics('test-key', makeSession({ id: undefined }))
    // Pipeline should not run a Gemini call without an id (avoids orphan rows).
    expect(gemini.callGeminiRaw).not.toHaveBeenCalled()
    expect(await db.analytics.count()).toBe(0)
  })

  it('does nothing when session has zero messages', async () => {
    vi.mocked(gemini.callGeminiRaw).mockResolvedValueOnce(validRaw)
    await pipelineChatToAnalytics('test-key', makeSession({ messages: [] }))
    expect(gemini.callGeminiRaw).not.toHaveBeenCalled()
    expect(await db.analytics.count()).toBe(0)
  })
})

describe('pipelineChatToAnalytics — same-day merge integration', () => {
  it('merges per-dim max on second call with same date', async () => {
    vi.mocked(gemini.callGeminiRaw)
      .mockResolvedValueOnce(JSON.stringify({
        metrics: { work_anxiety: 3, relationship_clinging: 8, existential_emptiness: 0, health_fear: 0, acute_emotion: 2 },
        mind_summary: 'a',
        recommended_segment: 'segment_4',
      }))
      .mockResolvedValueOnce(JSON.stringify({
        metrics: { work_anxiety: 9, relationship_clinging: 1, existential_emptiness: 5, health_fear: 4, acute_emotion: 2 },
        mind_summary: 'b',
        recommended_segment: 'segment_1',
      }))
    await pipelineChatToAnalytics('k', makeSession({ id: 1 }))
    await pipelineChatToAnalytics('k', makeSession({ id: 2 }))
    const rows = await db.analytics.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].metrics).toEqual({
      work_anxiety: 9,
      relationship_clinging: 8,
      existential_emptiness: 5,
      health_fear: 4,
      acute_emotion: 2,
    })
    expect(rows[0].mind_summary).toBe('b')
    expect(rows[0].source_session_ids).toEqual([1, 2])
  })
})

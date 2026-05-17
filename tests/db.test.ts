import { describe, it, expect, beforeEach } from 'vitest'
import {
  db,
  saveApiKey,
  loadApiKey,
  clearApiKey,
  createSession,
  appendMessage,
  completeSession,
  listSessions,
  getSession,
  deleteSession,
  getDailyInsight,
  saveDailyInsight,
} from '@/lib/db'
import type { DailyInsightRecord } from '@/types/analytics'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('apiKey CRUD', () => {
  it('returns null when no key is stored', async () => {
    expect(await loadApiKey()).toBeNull()
  })

  it('saves and loads a key', async () => {
    await saveApiKey('AIza-test-key')
    expect(await loadApiKey()).toBe('AIza-test-key')
  })

  it('overwrites previous key on save', async () => {
    await saveApiKey('first')
    await saveApiKey('second')
    expect(await loadApiKey()).toBe('second')
  })

  it('clears the key', async () => {
    await saveApiKey('to-clear')
    await clearApiKey()
    expect(await loadApiKey()).toBeNull()
  })
})

describe('sessions CRUD', () => {
  it('creates a session with status active', async () => {
    const id = await createSession('emotion_relation')
    const s = await getSession(id)
    expect(s?.status).toBe('active')
    expect(s?.category).toBe('emotion_relation')
    expect(s?.messages).toEqual([])
  })

  it('appends messages immutably', async () => {
    const id = await createSession('emotion_relation')
    await appendMessage(id, {
      role: 'user', content: 'hi', timestamp: Date.now(),
    })
    const s = await getSession(id)
    expect(s?.messages).toHaveLength(1)
    expect(s?.messages[0].content).toBe('hi')
  })

  it('completes a session', async () => {
    const id = await createSession('emotion_relation')
    await completeSession(id)
    const s = await getSession(id)
    expect(s?.status).toBe('completed')
    expect(s?.endedAt).toBeTypeOf('number')
  })

  it('lists sessions newest first', async () => {
    const a = await createSession('emotion_relation')
    await new Promise((r) => setTimeout(r, 5))
    const b = await createSession('emotion_relation')
    const list = await listSessions()
    expect(list[0].id).toBe(b)
    expect(list[1].id).toBe(a)
  })

  it('deletes a session by id', async () => {
    const a = await createSession('emotion_relation')
    const b = await createSession('emotion_relation')
    await deleteSession(a)
    expect(await getSession(a)).toBeUndefined()
    expect(await getSession(b)).toBeDefined()
    const list = await listSessions()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(b)
  })

  it('deleteSession is a no-op for missing ids', async () => {
    await expect(deleteSession(99999)).resolves.toBeUndefined()
  })
})

describe('dailyInsight CRUD', () => {
  const sample: DailyInsightRecord = {
    date: '2026-05-17',
    segmentId: 'segment_3',
    dominantDim: 'health_fear',
    reflection: '你近日畏懼身體之變，試觀此身亦非實有。',
    metricsSnapshot: {
      work_anxiety: 1,
      relationship_clinging: 2,
      existential_emptiness: 1,
      health_fear: 7,
      acute_emotion: 3,
    },
    createdAt: 1_700_000_000_000,
  }

  it('returns undefined when no insight exists for the date', async () => {
    expect(await getDailyInsight('2026-05-17')).toBeUndefined()
  })

  it('saves and reads a daily insight row', async () => {
    await saveDailyInsight(sample)
    const got = await getDailyInsight('2026-05-17')
    expect(got).toEqual(sample)
  })

  it('put-semantics: same date overwrites', async () => {
    await saveDailyInsight(sample)
    await saveDailyInsight({ ...sample, reflection: '改寫的反思內容' })
    const got = await getDailyInsight('2026-05-17')
    expect(got?.reflection).toBe('改寫的反思內容')
  })

  it('different dates do not collide', async () => {
    await saveDailyInsight(sample)
    await saveDailyInsight({ ...sample, date: '2026-05-18' })
    expect((await getDailyInsight('2026-05-17'))?.date).toBe('2026-05-17')
    expect((await getDailyInsight('2026-05-18'))?.date).toBe('2026-05-18')
  })
})

import Dexie, { type EntityTable } from 'dexie'
import type {
  ApiKeyRecord,
  Session,
  ChatMessage,
  CategoryId,
} from '@/types/chat'
import type {
  DailyAnalytics,
  EmotionMetrics,
  ProfileRecord,
} from '@/types/analytics'
import { EMOTION_DIMENSIONS } from '@/types/analytics'

class SutraMindDB extends Dexie {
  apiKey!: EntityTable<ApiKeyRecord, 'id'>
  sessions!: EntityTable<Session, 'id'>
  analytics!: EntityTable<DailyAnalytics, 'date'>
  profile!: EntityTable<ProfileRecord, 'key'>

  constructor() {
    super('SutraMindDB')
    this.version(1).stores({
      apiKey: '++id',
      sessions: '++id, category, startedAt',
    })
    this.version(2).stores({
      apiKey: '++id',
      sessions: '++id, category, startedAt',
      analytics: 'date',
      profile: 'key',
    })
  }
}

export const db = new SutraMindDB()

// ── apiKey CRUD ─────────────────────────────────────────────
export async function saveApiKey(value: string): Promise<void> {
  await db.transaction('rw', db.apiKey, async () => {
    await db.apiKey.clear()
    await db.apiKey.add({ value, savedAt: Date.now() })
  })
}

export async function loadApiKey(): Promise<string | null> {
  const row = await db.apiKey.toCollection().first()
  return row?.value ?? null
}

export async function clearApiKey(): Promise<void> {
  await db.apiKey.clear()
}

// ── sessions CRUD ───────────────────────────────────────────
export async function createSession(category: CategoryId): Promise<number> {
  return (await db.sessions.add({
    category,
    startedAt: Date.now(),
    messages: [],
    status: 'active',
  })) as number
}

export async function getSession(id: number): Promise<Session | undefined> {
  return db.sessions.get(id)
}

export async function appendMessage(
  id: number,
  message: ChatMessage
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const s = await db.sessions.get(id)
    if (!s) throw new Error(`Session ${id} not found`)
    await db.sessions.update(id, { messages: [...s.messages, message] })
  })
}

export async function completeSession(id: number): Promise<void> {
  await db.sessions.update(id, {
    status: 'completed',
    endedAt: Date.now(),
  })
}

export async function abandonStaleActiveSessions(): Promise<void> {
  const active = await db.sessions.where('status').equals('active').toArray()
  for (const s of active) {
    if (s.id != null) {
      await db.sessions.update(s.id, { status: 'abandoned', endedAt: Date.now() })
    }
  }
}

export async function listSessions(): Promise<Session[]> {
  return db.sessions.orderBy('startedAt').reverse().toArray()
}

export async function deleteSession(id: number): Promise<void> {
  await db.sessions.delete(id)
}

// ── analytics CRUD ──────────────────────────────────────────
export async function getDailyAnalytics(
  date: string
): Promise<DailyAnalytics | undefined> {
  return db.analytics.get(date)
}

export async function listAnalytics(): Promise<DailyAnalytics[]> {
  return db.analytics.orderBy('date').toArray()
}

export async function mergeDailyAnalytics(
  date: string,
  incoming: {
    metrics: EmotionMetrics
    mind_summary: string
    recommended_segment: string | null
    source_session_id: number
  }
): Promise<void> {
  await db.transaction('rw', db.analytics, async () => {
    const existing = await db.analytics.get(date)
    if (!existing) {
      await db.analytics.put({
        date,
        metrics: { ...incoming.metrics },
        mind_summary: incoming.mind_summary,
        recommended_segment: incoming.recommended_segment,
        updated_at: Date.now(),
        source_session_ids: [incoming.source_session_id],
      })
      return
    }
    const mergedMetrics = {} as EmotionMetrics
    for (const dim of EMOTION_DIMENSIONS) {
      mergedMetrics[dim] = Math.max(existing.metrics[dim], incoming.metrics[dim])
    }
    const dedupedIds = Array.from(
      new Set([...existing.source_session_ids, incoming.source_session_id])
    )
    await db.analytics.put({
      date,
      metrics: mergedMetrics,
      mind_summary: incoming.mind_summary,
      recommended_segment: incoming.recommended_segment,
      updated_at: Date.now(),
      source_session_ids: dedupedIds,
    })
  })
}

// ── profile kv ──────────────────────────────────────────────
export async function getProfile<T = unknown>(key: string): Promise<T | null> {
  const row = await db.profile.get(key)
  return row ? (row.value as T) : null
}

export async function setProfile(key: string, value: unknown): Promise<void> {
  await db.profile.put({ key, value })
}

import Dexie, { type EntityTable } from 'dexie'
import type {
  ApiKeyRecord,
  Session,
  ChatMessage,
  CategoryId,
} from '@/types/chat'

class SutraMindDB extends Dexie {
  apiKey!: EntityTable<ApiKeyRecord, 'id'>
  sessions!: EntityTable<Session, 'id'>

  constructor() {
    super('SutraMindDB')
    this.version(1).stores({
      apiKey: '++id',
      sessions: '++id, category, startedAt',
    })
  }
}

export const db = new SutraMindDB()

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

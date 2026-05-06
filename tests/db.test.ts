import { describe, it, expect, beforeEach } from 'vitest'
import { db, saveApiKey, loadApiKey, clearApiKey,
         createSession, appendMessage, completeSession, listSessions,
         getSession, deleteSession } from '@/lib/db'

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

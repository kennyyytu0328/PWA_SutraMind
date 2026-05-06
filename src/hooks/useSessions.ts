'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Session } from '@/types/chat'

export function useSessions(): Session[] | undefined {
  return useLiveQuery(() =>
    db.sessions.orderBy('startedAt').reverse().toArray()
  )
}

export function useSession(id: number | null): Session | undefined {
  return useLiveQuery(
    () => (id == null ? undefined : db.sessions.get(id)),
    [id]
  )
}

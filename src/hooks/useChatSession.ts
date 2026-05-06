'use client'
import { useCallback, useEffect, useState } from 'react'
import sutraDB from '@/data/sutra-db.json'
import { buildPrompt } from '@/lib/prompt-builder'
import { callGemini, GeminiError } from '@/lib/gemini'
import { appendMessage, completeSession, getSession } from '@/lib/db'
import { validateSegmentIds } from '@/lib/sutra'
import type {
  CategoryId,
  ChatMessage,
  RoundNumber,
  Session,
  SutraSegment,
} from '@/types/chat'

const db = sutraDB as SutraSegment[]

export type ChatStatus =
  | 'idle'
  | 'sending'
  | 'awaiting_user'
  | 'completed'
  | 'error'

export interface UseChatSessionResult {
  session: Session | null
  status: ChatStatus
  error: GeminiError | null
  roundNumber: RoundNumber
  send: (text: string) => Promise<void>
  retry: () => Promise<void>
  finishSession: () => Promise<void>
}

export function useChatSession(
  sessionId: number,
  apiKey: string,
  category: CategoryId
): UseChatSessionResult {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [error, setError] = useState<GeminiError | null>(null)
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)

  useEffect(() => {
    getSession(sessionId).then((s) => setSession(s ?? null))
  }, [sessionId])

  const userTurnsCompleted = session
    ? session.messages.filter((m) => m.role === 'assistant').length
    : 0
  const roundNumber = (Math.min(userTurnsCompleted + 1, 3)) as RoundNumber

  async function refresh() {
    setSession((await getSession(sessionId)) ?? null)
  }

  const performSend = useCallback(
    async (text: string) => {
      setStatus('sending')
      setError(null)

      const userMsg: ChatMessage = {
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }
      await appendMessage(sessionId, userMsg)
      const fresh = await getSession(sessionId)
      if (!fresh) throw new Error('Session vanished')
      setSession(fresh)

      const historyExcludingPending = fresh.messages.slice(0, -1)

      try {
        const payload = buildPrompt({
          category,
          history: historyExcludingPending,
          userMessage: text,
          sutraDB: db,
          roundNumber: (Math.min(
            historyExcludingPending.filter((m) => m.role === 'assistant').length + 1,
            3
          )) as RoundNumber,
        })
        const reply = await callGemini(apiKey, payload)
        const cleanIds = validateSegmentIds(db, reply.referenced_segment_ids)

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: reply.response_text,
          referencedSegmentIds: cleanIds,
          closingPractice: reply.closing_practice ?? null,
          timestamp: Date.now(),
        }
        await appendMessage(sessionId, assistantMsg)
        const updated = await getSession(sessionId)
        setSession(updated ?? null)

        const assistantCount =
          updated?.messages.filter((m) => m.role === 'assistant').length ?? 0
        if (assistantCount >= 3) {
          await completeSession(sessionId)
          await refresh()
          setStatus('completed')
        } else {
          setStatus('awaiting_user')
        }
      } catch (err) {
        // The user turn is already persisted. retry() will reuse it without
        // re-appending. Round counter only advances on a successful assistant turn.
        setPendingUserMessage(text)
        setError(err as GeminiError)
        setStatus('error')
      }
    },
    [sessionId, apiKey, category]
  )

  const send = useCallback(
    async (text: string) => {
      if (status === 'sending' || status === 'completed') return
      await performSend(text)
    },
    [performSend, status]
  )

  const retry = useCallback(async () => {
    if (!pendingUserMessage) return
    const fresh = await getSession(sessionId)
    if (!fresh) return
    const lastUser = fresh.messages[fresh.messages.length - 1]
    if (lastUser?.role !== 'user') return
    setStatus('sending')
    setError(null)
    try {
      const historyExcludingLast = fresh.messages.slice(0, -1)
      const payload = buildPrompt({
        category,
        history: historyExcludingLast,
        userMessage: lastUser.content,
        sutraDB: db,
        roundNumber: (Math.min(
          historyExcludingLast.filter((m) => m.role === 'assistant').length + 1,
          3
        )) as RoundNumber,
      })
      const reply = await callGemini(apiKey, payload)
      const cleanIds = validateSegmentIds(db, reply.referenced_segment_ids)
      await appendMessage(sessionId, {
        role: 'assistant',
        content: reply.response_text,
        referencedSegmentIds: cleanIds,
        closingPractice: reply.closing_practice ?? null,
        timestamp: Date.now(),
      })
      await refresh()
      const after = await getSession(sessionId)
      const assistants = after?.messages.filter((m) => m.role === 'assistant').length ?? 0
      if (assistants >= 3) {
        await completeSession(sessionId)
        await refresh()
        setStatus('completed')
      } else {
        setStatus('awaiting_user')
      }
      setPendingUserMessage(null)
    } catch (err) {
      setError(err as GeminiError)
      setStatus('error')
    }
  }, [sessionId, apiKey, category, pendingUserMessage])

  const finishSession = useCallback(async () => {
    await completeSession(sessionId)
    await refresh()
    setStatus('completed')
  }, [sessionId])

  return { session, status, error, roundNumber, send, retry, finishSession }
}

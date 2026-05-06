import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChatSession } from '@/hooks/useChatSession'
import { createSession } from '@/lib/db'

vi.mock('@/lib/gemini', () => ({
  callGemini: vi.fn(async () => ({
    response_text: '心無罣礙故，無有恐怖。',
    referenced_segment_ids: ['segment_4'],
    closing_practice: null,
  })),
  GeminiError: class GeminiError extends Error {
    kind: string
    retryable: boolean
    constructor(kind: string, message: string, retryable: boolean) {
      super(message)
      this.kind = kind
      this.retryable = retryable
    }
  },
  DEFAULT_MODEL: 'gemini-2.5-flash',
}))

describe('useChatSession.freshAssistantIndex', () => {
  it('is null before any send', async () => {
    const id = await createSession('emotion_relation')
    const { result } = renderHook(() =>
      useChatSession(id, 'fake-key', 'emotion_relation')
    )
    await waitFor(() => expect(result.current.session).not.toBeNull())
    expect(result.current.freshAssistantIndex).toBeNull()
  })

  it('points at the latest assistant message after a successful send', async () => {
    const id = await createSession('emotion_relation')
    const { result } = renderHook(() =>
      useChatSession(id, 'fake-key', 'emotion_relation')
    )
    await waitFor(() => expect(result.current.session).not.toBeNull())
    await act(async () => {
      await result.current.send('我感到難過')
    })
    // After 1 user + 1 assistant, assistant is at index 1.
    expect(result.current.freshAssistantIndex).toBe(1)
  })

  it('clears to null when the next send begins', async () => {
    const id = await createSession('emotion_relation')
    const { result } = renderHook(() =>
      useChatSession(id, 'fake-key', 'emotion_relation')
    )
    await waitFor(() => expect(result.current.session).not.toBeNull())
    await act(async () => {
      await result.current.send('第一次')
    })
    expect(result.current.freshAssistantIndex).toBe(1)
    await act(async () => {
      await result.current.send('第二次')
    })
    // After 2 user + 2 assistant, latest assistant is at index 3.
    expect(result.current.freshAssistantIndex).toBe(3)
  })
})

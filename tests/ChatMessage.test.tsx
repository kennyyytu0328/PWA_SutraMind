import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ChatMessage } from '@/components/ChatMessage'
import { setMatchMediaMatches } from './setup'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

const assistantMsg: ChatMessageType = {
  role: 'assistant',
  content: '心無罣礙',
  referencedSegmentIds: ['segment_4'],
  closingPractice: null,
  timestamp: 0,
}

const userMsg: ChatMessageType = {
  role: 'user',
  content: '我感到難過',
  timestamp: 0,
}

describe('ChatMessage', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })

  it('defaults to static mode (no per-char spans for assistant)', () => {
    const { container } = render(<ChatMessage message={assistantMsg} />)
    expect(container.querySelectorAll('[data-char]')).toHaveLength(0)
    expect(container.textContent).toContain('心無罣礙')
  })

  it('renders per-char spans when revealMode="live"', () => {
    const { container } = render(
      <ChatMessage message={assistantMsg} revealMode="live" />
    )
    expect(container.querySelectorAll('[data-char]').length).toBeGreaterThan(0)
  })

  it('snaps to final state when the bubble is clicked in live mode', () => {
    const { container } = render(
      <ChatMessage message={assistantMsg} revealMode="live" />
    )
    const bubble = container.querySelector('[data-testid="msg-bubble"]')!
    fireEvent.click(bubble)
    const spans = container.querySelectorAll('[data-char]')
    spans.forEach((s) => {
      expect((s as HTMLElement).className).toMatch(/ink-char-skipped/)
    })
  })

  it('does not enable click-to-skip on user messages', () => {
    const { container } = render(
      <ChatMessage message={userMsg} revealMode="live" />
    )
    // User messages render through their own path; no data-char spans regardless.
    expect(container.querySelectorAll('[data-char]')).toHaveLength(0)
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { InkDropText } from '@/components/InkDropText'
import { setMatchMediaMatches } from './setup'

describe('InkDropText — static mode', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })

  it('renders the full text immediately', () => {
    const { getByText } = render(<InkDropText text="心無罣礙" mode="static" />)
    expect(getByText('心無罣礙')).toBeInTheDocument()
  })

  it('preserves whitespace and line breaks', () => {
    const { container } = render(<InkDropText text={'第一行\n第二行'} mode="static" />)
    expect(container.textContent).toBe('第一行\n第二行')
  })
})

describe('InkDropText — live mode', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('wraps each character in its own span with a stagger delay', () => {
    const { container } = render(
      <InkDropText text="心無罣礙" mode="live" />
    )
    const spans = container.querySelectorAll('[data-char]')
    expect(spans).toHaveLength(4)
    // First char: 0ms; subsequent chars get cumulative delay.
    expect((spans[0] as HTMLElement).style.animationDelay).toBe('0ms')
    expect((spans[1] as HTMLElement).style.animationDelay).not.toBe('0ms')
  })

  it('caps total animation time near 6s for long text via stagger compression', () => {
    const long = 'あ'.repeat(300)
    const { container } = render(<InkDropText text={long} mode="live" />)
    const spans = container.querySelectorAll('[data-char]')
    const lastDelay = parseFloat(
      (spans[spans.length - 1] as HTMLElement).style.animationDelay
    )
    expect(lastDelay).toBeLessThanOrEqual(6000)
  })

  it('fires onComplete after the staggered reveal finishes', () => {
    const onComplete = vi.fn()
    render(
      <InkDropText text="abc" mode="live" onComplete={onComplete} />
    )
    expect(onComplete).not.toHaveBeenCalled()
    // 3 chars * 40ms stagger + 350ms duration = 470ms total
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('snaps to final state when skip flips to true', () => {
    const onComplete = vi.fn()
    const { container, rerender } = render(
      <InkDropText text="abc" mode="live" skip={false} onComplete={onComplete} />
    )
    rerender(
      <InkDropText text="abc" mode="live" skip={true} onComplete={onComplete} />
    )
    const spans = container.querySelectorAll('[data-char]')
    spans.forEach((s) => {
      expect((s as HTMLElement).className).toMatch(/ink-char-skipped/)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('renders text as plain string (no per-char spans) under reduced motion and fires onComplete synchronously', () => {
    setMatchMediaMatches(true)
    const onComplete = vi.fn()
    const { container } = render(
      <InkDropText text="心無罣礙" mode="live" onComplete={onComplete} />
    )
    expect(container.querySelectorAll('[data-char]')).toHaveLength(0)
    expect(container.textContent).toBe('心無罣礙')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})

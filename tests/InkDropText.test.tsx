import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { InkDropText } from '@/components/InkDropText'
import { setMatchMediaMatches, getLatestObserver, clearObservers } from './setup'

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
    // 2 * 40ms stagger + 350ms duration = 430ms total; advance 500 to have margin
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

  it('does not reset the reveal timer when an inline onComplete prop changes between renders', () => {
    const onComplete = vi.fn()
    const Wrapper = ({ counter }: { counter: number }) => (
      // counter forces re-render; inline arrow rebuilds onComplete each render
      <InkDropText text="abc" mode="live" onComplete={() => onComplete(counter)} />
    )
    const { rerender } = render(<Wrapper counter={0} />)
    // Halfway through the 430ms reveal, parent re-renders.
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender(<Wrapper counter={1} />)
    act(() => {
      vi.advanceTimersByTime(300) // 200 + 300 = 500 > 430, so onComplete should have fired
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})

describe('InkDropText — replay mode', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
    clearObservers()
  })

  it('renders an element without the bloom-show class until intersected', () => {
    const { container } = render(<InkDropText text="心無罣礙" mode="replay" />)
    const bloom = container.querySelector('[data-testid="ink-bloom"]')
    expect(bloom).not.toBeNull()
    expect(bloom?.className).not.toMatch(/ink-bloom-show/)
  })

  it('adds the bloom-show class once on first intersection', () => {
    const { container } = render(<InkDropText text="心無罣礙" mode="replay" />)
    act(() => {
      getLatestObserver().trigger(true)
    })
    const bloom = container.querySelector('[data-testid="ink-bloom"]')
    expect(bloom?.className).toMatch(/ink-bloom-show/)
  })

  it('does not re-animate on subsequent intersections', () => {
    const { container } = render(<InkDropText text="心無罣礙" mode="replay" />)
    act(() => {
      getLatestObserver().trigger(true)
    })
    const cls1 = container.querySelector('[data-testid="ink-bloom"]')?.className
    act(() => {
      getLatestObserver().trigger(false)
      getLatestObserver().trigger(true)
    })
    const cls2 = container.querySelector('[data-testid="ink-bloom"]')?.className
    expect(cls2).toBe(cls1)
  })

  it('renders text immediately under reduced motion (no observer attached)', () => {
    setMatchMediaMatches(true)
    const { container } = render(<InkDropText text="心無罣礙" mode="replay" />)
    expect(container.textContent).toBe('心無罣礙')
    // No observer should have been created.
    expect(() => getLatestObserver()).toThrow()
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { SandArtExit } from '@/components/SandArtExit'
import { setMatchMediaMatches } from './setup'

describe('SandArtExit', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children when visible', () => {
    const { getByText } = render(
      <SandArtExit visible={true} onExited={() => {}}>
        <div>row content</div>
      </SandArtExit>
    )
    expect(getByText('row content')).toBeInTheDocument()
  })

  it('calls onExited after the exit animation duration when visible flips to false', () => {
    const onExited = vi.fn()
    const { rerender } = render(
      <SandArtExit visible={true} onExited={onExited}>
        <div>row content</div>
      </SandArtExit>
    )
    rerender(
      <SandArtExit visible={false} onExited={onExited}>
        <div>row content</div>
      </SandArtExit>
    )
    expect(onExited).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(onExited).toHaveBeenCalledTimes(1)
  })

  it('calls onExited on next tick under reduced motion (no animation wait)', () => {
    setMatchMediaMatches(true)
    const onExited = vi.fn()
    const { rerender } = render(
      <SandArtExit visible={true} onExited={onExited}>
        <div>row content</div>
      </SandArtExit>
    )
    rerender(
      <SandArtExit visible={false} onExited={onExited}>
        <div>row content</div>
      </SandArtExit>
    )
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(onExited).toHaveBeenCalledTimes(1)
  })
})

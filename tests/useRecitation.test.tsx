import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecitation } from '@/hooks/useRecitation'
import { phraseDurationMs, type RecitationPhrase } from '@/lib/recitation'

const phrases: RecitationPhrase[] = [
  { index: 0, text: '般若波羅蜜多心經', segmentId: 'title' },
  { index: 1, text: '觀自在菩薩，', segmentId: 'segment_1' },
  { index: 2, text: '行深般若波羅蜜多時，', segmentId: 'segment_1' },
  { index: 3, text: '度一切苦厄。', segmentId: 'segment_1' },
]

const d = (i: number, speed: '緩' | '中' | '疾' = '中') =>
  phraseDurationMs(phrases[i], speed)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useRecitation', () => {
  it('starts idle with no current phrase and speed 中', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    expect(result.current.status).toBe('idle')
    expect(result.current.current).toBeNull()
    expect(result.current.speed).toBe('中')
    expect(result.current.progress).toBe(0)
  })

  it('start() plays from index 0 and advances after the phrase duration', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    expect(result.current.status).toBe('playing')
    expect(result.current.current?.index).toBe(0)

    act(() => vi.advanceTimersByTime(d(0) - 1))
    expect(result.current.index).toBe(0)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(1)
  })

  it('toggle() pauses (no advance) and resumes', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    act(() => result.current.toggle())
    expect(result.current.status).toBe('paused')
    act(() => vi.advanceTimersByTime(d(0) * 3))
    expect(result.current.index).toBe(0)

    act(() => result.current.toggle())
    expect(result.current.status).toBe('playing')
    act(() => vi.advanceTimersByTime(d(0)))
    expect(result.current.index).toBe(1)
  })

  it('toggle() is a no-op when idle', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.toggle())
    expect(result.current.status).toBe('idle')
  })

  it('setSpeed mid-phrase reschedules using the new duration', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.setSpeed('疾'))
    expect(result.current.speed).toBe('疾')
    act(() => vi.advanceTimersByTime(d(0, '疾') - 1))
    expect(result.current.index).toBe(0)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(1)
  })

  it('reaches done after the last phrase and start() restarts at 0', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    for (let i = 0; i < phrases.length; i++) {
      act(() => vi.advanceTimersByTime(d(i)))
    }
    expect(result.current.status).toBe('done')
    expect(result.current.current).toBeNull()
    expect(result.current.progress).toBe(1)

    act(() => result.current.start())
    expect(result.current.status).toBe('playing')
    expect(result.current.index).toBe(0)
  })

  it('recent holds at most the 2 previous phrases, oldest first', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    expect(result.current.recent).toEqual([])
    act(() => vi.advanceTimersByTime(d(0)))
    expect(result.current.recent.map((p) => p.index)).toEqual([0])
    act(() => vi.advanceTimersByTime(d(1)))
    act(() => vi.advanceTimersByTime(d(2)))
    expect(result.current.index).toBe(3)
    expect(result.current.recent.map((p) => p.index)).toEqual([1, 2])
  })

  it('pauses when the document becomes hidden', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    const hiddenSpy = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.status).toBe('paused')
    hiddenSpy.mockRestore()
  })

  it('clears the timer on unmount', () => {
    const { result, unmount } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

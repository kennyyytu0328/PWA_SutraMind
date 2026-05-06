import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { setMatchMediaMatches } from './setup'

describe('useReducedMotion', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })

  it('returns false when prefers-reduced-motion is not set', () => {
    setMatchMediaMatches(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when prefers-reduced-motion: reduce matches', () => {
    setMatchMediaMatches(true)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })
})

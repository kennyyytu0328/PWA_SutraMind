import { describe, it, expect } from 'vitest'
import { todayLocalISO } from '@/lib/date-utils'

describe('todayLocalISO', () => {
  it('returns YYYY-MM-DD for a given Date in local TZ', () => {
    // 2026-05-16 noon local
    const d = new Date(2026, 4, 16, 12, 0, 0)
    expect(todayLocalISO(d)).toBe('2026-05-16')
  })

  it('handles single-digit month/day with zero padding', () => {
    const d = new Date(2026, 0, 5, 9, 0, 0) // Jan 5
    expect(todayLocalISO(d)).toBe('2026-01-05')
  })

  it('uses local date (not UTC) — late-night case', () => {
    // 23:30 local on May 16; in many TZs this is May 17 UTC.
    // The helper must report local date = 2026-05-16.
    const d = new Date(2026, 4, 16, 23, 30, 0)
    expect(todayLocalISO(d)).toBe('2026-05-16')
  })

  it('uses current date when called with no argument', () => {
    const result = todayLocalISO()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

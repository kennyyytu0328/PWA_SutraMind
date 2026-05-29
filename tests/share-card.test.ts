import { describe, it, expect } from 'vitest'
import { wrapText } from '@/lib/share-card'

// measure = 1 width unit per character → maxWidth behaves like "max chars"
const byChar = (s: string) => Array.from(s).length

describe('wrapText', () => {
  it('returns [] for empty text', () => {
    expect(wrapText('', 5, byChar)).toEqual([])
  })

  it('keeps text on one line when it fits', () => {
    expect(wrapText('觀自在', 10, byChar)).toEqual(['觀自在'])
  })

  it('keeps text on one line when it fits exactly', () => {
    expect(wrapText('一二三', 3, byChar)).toEqual(['一二三'])
  })

  it('wraps at the measured boundary', () => {
    expect(wrapText('一二三四五六', 3, byChar)).toEqual(['一二三', '四五六'])
  })

  it('never drops a character even if a single char exceeds maxWidth', () => {
    expect(wrapText('一二三', 0, byChar)).toEqual(['一', '二', '三'])
  })
})

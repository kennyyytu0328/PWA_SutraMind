import { describe, it, expect } from 'vitest'
import { CATEGORIES, getCategory } from '@/lib/categories'
import { buildPrompt } from '@/lib/prompt-builder'
import sutraDB from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'

describe('CATEGORIES metadata', () => {
  it('exposes 5 categories', () => {
    expect(CATEGORIES).toHaveLength(5)
  })

  it('all 5 categories are enabled', () => {
    expect(CATEGORIES.every((c) => c.enabled)).toBe(true)
  })

  it('every category has a non-empty placeholder', () => {
    for (const c of CATEGORIES) {
      expect(typeof c.placeholder).toBe('string')
      expect(c.placeholder.length).toBeGreaterThan(0)
    }
  })

  it('emotion_relation has chinese label and strategy hints', () => {
    const c = getCategory('emotion_relation')
    expect(c.label).toBe('情感與關係')
    expect(c.strategy).toMatch(/心無罣礙/)
    expect(c.likelySegments).toContain('segment_4')
    expect(c.likelySegments).toContain('segment_6')
  })

  it.each(CATEGORIES.map((c) => [c.id, c] as const))(
    'system instruction for %s injects label, strategy, and every likelySegment',
    (_id, c) => {
      const payload = buildPrompt({
        category: c.id,
        history: [],
        userMessage: '測試',
        sutraDB: sutraDB as SutraSegment[],
        roundNumber: 1,
      })
      expect(payload.systemInstruction).toContain(c.label)
      expect(payload.systemInstruction).toContain(c.strategy)
      for (const seg of c.likelySegments) {
        expect(payload.systemInstruction).toContain(seg)
      }
    }
  )
})

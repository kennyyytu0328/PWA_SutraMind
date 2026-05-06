import { describe, it, expect } from 'vitest'
import { CATEGORIES, getCategory, isCategoryEnabled } from '@/lib/categories'

describe('categories', () => {
  it('exposes 5 categories', () => {
    expect(CATEGORIES).toHaveLength(5)
  })

  it('only emotion_relation is enabled in skeleton', () => {
    expect(isCategoryEnabled('emotion_relation')).toBe(true)
    expect(isCategoryEnabled('career_achievement')).toBe(false)
    expect(isCategoryEnabled('self_existence')).toBe(false)
    expect(isCategoryEnabled('health_pain')).toBe(false)
    expect(isCategoryEnabled('sudden_emotion')).toBe(false)
  })

  it('emotion_relation has chinese label and strategy hints', () => {
    const c = getCategory('emotion_relation')
    expect(c.label).toBe('情感與關係')
    expect(c.strategy).toMatch(/心無罣礙/)
    expect(c.likelySegments).toContain('segment_4')
    expect(c.likelySegments).toContain('segment_6')
  })
})

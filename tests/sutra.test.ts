import { describe, it, expect } from 'vitest'
import sutraDB from '@/data/sutra-db.json'
import { getSegmentById, validateSegmentIds, isKnownSegmentId } from '@/lib/sutra'
import type { SutraSegment } from '@/types/chat'

const db = sutraDB as SutraSegment[]

describe('sutra helpers', () => {
  it('getSegmentById returns the matching segment', () => {
    const s = getSegmentById(db, 'segment_4')
    expect(s).toBeDefined()
    expect(s?.id).toBe('segment_4')
    expect(s?.original).toMatch(/眼耳鼻舌身意/)
  })

  it('getSegmentById returns undefined for unknown id', () => {
    expect(getSegmentById(db, 'segment_99')).toBeUndefined()
  })

  it('isKnownSegmentId returns true for valid ids', () => {
    expect(isKnownSegmentId(db, 'segment_1')).toBe(true)
    expect(isKnownSegmentId(db, 'segment_99')).toBe(false)
  })

  it('validateSegmentIds filters out unknowns and preserves order', () => {
    const result = validateSegmentIds(db, ['segment_99', 'segment_4', 'bogus', 'segment_1'])
    expect(result).toEqual(['segment_4', 'segment_1'])
  })
})

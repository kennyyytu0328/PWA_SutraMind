import { describe, it, expect } from 'vitest'
import sutraDb from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'
import {
  splitPhrases,
  phraseDurationMs,
  RECITATION_SPEEDS,
  SUTRA_TITLE,
} from '@/lib/recitation'

const SEGMENTS = sutraDb as SutraSegment[]

const mini: SutraSegment[] = [
  {
    id: 'segment_1',
    original: '觀自在菩薩，行深般若波羅蜜多時，照見五蘊皆空，度一切苦厄。',
    vernacular: '',
    keywords: [],
    therapeutic_focus: '',
  },
  {
    id: 'segment_9',
    original: '揭諦揭諦，波羅揭諦，波羅僧揭諦，菩提薩婆訶。',
    vernacular: '',
    keywords: [],
    therapeutic_focus: '',
  },
]

describe('splitPhrases', () => {
  it('prepends the title as phrase 0 with segmentId "title"', () => {
    const phrases = splitPhrases(mini)
    expect(phrases[0]).toEqual({ index: 0, text: SUTRA_TITLE, segmentId: 'title' })
  })

  it('splits on ，、；。！ keeping punctuation attached to the phrase end', () => {
    const texts = splitPhrases(mini).map((p) => p.text)
    expect(texts).toEqual([
      SUTRA_TITLE,
      '觀自在菩薩，',
      '行深般若波羅蜜多時，',
      '照見五蘊皆空，',
      '度一切苦厄。',
      '揭諦揭諦，',
      '波羅揭諦，',
      '波羅僧揭諦，',
      '菩提薩婆訶。',
    ])
  })

  it('assigns sequential indices and the source segmentId', () => {
    const phrases = splitPhrases(mini)
    expect(phrases.map((p) => p.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(phrases[1].segmentId).toBe('segment_1')
    expect(phrases[5].segmentId).toBe('segment_9')
  })

  it('handles ！ and drops empty fragments', () => {
    const phrases = splitPhrases([
      { id: 's', original: '舍利子！ 色不異空。 ', vernacular: '', keywords: [], therapeutic_focus: '' },
    ])
    expect(phrases.map((p) => p.text)).toEqual([SUTRA_TITLE, '舍利子！', '色不異空。'])
  })

  it('returns only the title for an empty segment list', () => {
    expect(splitPhrases([])).toHaveLength(1)
  })

  it('produces a stable phrase count for the real sutra', () => {
    const phrases = splitPhrases(SEGMENTS)
    expect(phrases.length).toBeGreaterThan(40)
    expect(phrases.length).toBeLessThan(70)
    expect(phrases.every((p) => p.text.trim().length > 0)).toBe(true)
  })
})

describe('phraseDurationMs', () => {
  const phrase = { index: 1, text: '觀自在菩薩，', segmentId: 'segment_1' }

  it('uses baseMs + perCharMs × chars, excluding punctuation', () => {
    expect(phraseDurationMs(phrase, '中')).toBe(1600 + 120 * 5)
    expect(phraseDurationMs(phrase, '緩')).toBe(2200 + 180 * 5)
    expect(phraseDurationMs(phrase, '疾')).toBe(1000 + 80 * 5)
  })

  it('exposes the three speeds', () => {
    expect(Object.keys(RECITATION_SPEEDS)).toEqual(['緩', '中', '疾'])
  })
})

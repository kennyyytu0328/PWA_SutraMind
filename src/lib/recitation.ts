import type { SutraSegment } from '@/types/chat'

export type RecitationSpeed = '緩' | '中' | '疾'

export const RECITATION_SPEEDS: Record<
  RecitationSpeed,
  { baseMs: number; perCharMs: number }
> = {
  緩: { baseMs: 2200, perCharMs: 180 },
  中: { baseMs: 1600, perCharMs: 120 },
  疾: { baseMs: 1000, perCharMs: 80 },
}

export const SUTRA_TITLE = '般若波羅蜜多心經'

export interface RecitationPhrase {
  index: number
  text: string
  segmentId: string
}

const PUNCTUATION = /[，、；。！]/g
// Split *after* each punctuation mark so it stays attached to the phrase.
const SPLIT_AFTER = /(?<=[，、；。！])/

function splitSegment(segment: SutraSegment): Array<Omit<RecitationPhrase, 'index'>> {
  return segment.original
    .split(SPLIT_AFTER)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((text) => ({ text, segmentId: segment.id }))
}

export function splitPhrases(segments: SutraSegment[]): RecitationPhrase[] {
  const body = segments.flatMap(splitSegment)
  return [{ text: SUTRA_TITLE, segmentId: 'title' }, ...body].map((p, index) => ({
    ...p,
    index,
  }))
}

export function phraseDurationMs(
  phrase: RecitationPhrase,
  speed: RecitationSpeed
): number {
  const { baseMs, perCharMs } = RECITATION_SPEEDS[speed]
  const chars = phrase.text.replace(PUNCTUATION, '').length
  return baseMs + perCharMs * chars
}

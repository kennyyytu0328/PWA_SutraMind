import type { SutraSegment } from '@/types/chat'

export function getSegmentById(
  db: SutraSegment[],
  id: string
): SutraSegment | undefined {
  return db.find((s) => s.id === id)
}

export function isKnownSegmentId(db: SutraSegment[], id: string): boolean {
  return db.some((s) => s.id === id)
}

export function validateSegmentIds(db: SutraSegment[], ids: string[]): string[] {
  return ids.filter((id) => isKnownSegmentId(db, id))
}

import { EMOTION_DIMENSIONS } from '@/types/analytics'
import type {
  DailyAnalytics,
  EmotionDimension,
  EmotionMetrics,
} from '@/types/analytics'

export interface InsightSegmentPick {
  dominantDim: EmotionDimension
  segmentId: string
  metrics7d: EmotionMetrics
}

const DIM_PRIORITY: readonly EmotionDimension[] = [
  'health_fear',
  'acute_emotion',
  'relationship_clinging',
  'work_anxiety',
  'existential_emptiness',
] as const

const DOMINANT_DIM_TO_SEGMENT: Record<EmotionDimension, string> = {
  work_anxiety: 'segment_5',
  relationship_clinging: 'segment_1',
  existential_emptiness: 'segment_7',
  health_fear: 'segment_3',
  acute_emotion: 'segment_2',
}

function roundTo1dp(n: number): number {
  return Math.round(n * 10) / 10
}

export function pickInsightSegment(
  rows: DailyAnalytics[]
): InsightSegmentPick | null {
  if (rows.length === 0) return null

  const metrics7d = {} as EmotionMetrics
  for (const dim of EMOTION_DIMENSIONS) {
    const sum = rows.reduce((acc, r) => acc + r.metrics[dim], 0)
    metrics7d[dim] = roundTo1dp(sum / rows.length)
  }

  let bestDim = DIM_PRIORITY[0]
  let bestVal = metrics7d[bestDim]
  for (const dim of DIM_PRIORITY.slice(1)) {
    if (metrics7d[dim] > bestVal) {
      bestVal = metrics7d[dim]
      bestDim = dim
    }
  }

  return {
    dominantDim: bestDim,
    segmentId: DOMINANT_DIM_TO_SEGMENT[bestDim],
    metrics7d,
  }
}

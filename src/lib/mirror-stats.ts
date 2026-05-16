import {
  EMOTION_DIMENSIONS,
  type DailyAnalytics,
  type EmotionMetrics,
} from '@/types/analytics'

export function attachmentIndex(m: EmotionMetrics): number {
  const sum =
    m.work_anxiety +
    m.relationship_clinging +
    m.existential_emptiness +
    m.health_fear +
    m.acute_emotion
  return sum / 5
}

export function last7Days(rows: DailyAnalytics[]): DailyAnalytics[] {
  return rows.slice(-7)
}

export function last30Days(rows: DailyAnalytics[]): DailyAnalytics[] {
  return rows.slice(-30)
}

export function aggregateMetricsMax(rows: DailyAnalytics[]): EmotionMetrics {
  const out: EmotionMetrics = {
    work_anxiety: 0,
    relationship_clinging: 0,
    existential_emptiness: 0,
    health_fear: 0,
    acute_emotion: 0,
  }
  for (const r of rows) {
    for (const dim of EMOTION_DIMENSIONS) {
      if (r.metrics[dim] > out[dim]) out[dim] = r.metrics[dim]
    }
  }
  return out
}

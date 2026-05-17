import type { EmotionMetrics } from '@/types/analytics'

export const DIMENSION_LABELS: Record<keyof EmotionMetrics, string> = {
  work_anxiety: '職場焦慮',
  relationship_clinging: '關係執著',
  existential_emptiness: '存在虛無',
  health_fear: '健康恐懼',
  acute_emotion: '突發情緒',
}

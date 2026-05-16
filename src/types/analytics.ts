export interface EmotionMetrics {
  work_anxiety: number          // 職場焦慮 0-10
  relationship_clinging: number // 關係執著 0-10
  existential_emptiness: number // 存在虛無 / 年齡焦慮 0-10
  health_fear: number           // 健康 / 病痛恐懼 0-10
  acute_emotion: number         // 突發性情緒衝擊 0-10
}

export const EMOTION_DIMENSIONS = [
  'work_anxiety',
  'relationship_clinging',
  'existential_emptiness',
  'health_fear',
  'acute_emotion',
] as const

export type EmotionDimension = (typeof EMOTION_DIMENSIONS)[number]

export interface DailyAnalytics {
  date: string                       // PK, local-TZ YYYY-MM-DD
  metrics: EmotionMetrics
  mind_summary: string               // <=80 chars
  recommended_segment: string | null // segment_1 .. segment_9
  updated_at: number                 // epoch ms
  source_session_ids: number[]
}

export interface ProfileRecord {
  key: string
  value: unknown
}

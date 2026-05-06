export type CategoryId =
  | 'emotion_relation'
  | 'career_achievement'
  | 'self_existence'
  | 'health_pain'
  | 'sudden_emotion'

export type RoundNumber = 1 | 2 | 3

export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  referencedSegmentIds?: string[]
  closingPractice?: string | null
  timestamp: number
}

export interface Session {
  id?: number
  category: CategoryId
  startedAt: number
  endedAt?: number
  messages: ChatMessage[]
  status: SessionStatus
}

export interface ApiKeyRecord {
  id?: number
  value: string
  savedAt: number
}

export interface SutraSegment {
  id: string
  original: string
  vernacular: string
  keywords: string[]
  therapeutic_focus: string
}

export interface GeminiStructuredResponse {
  referenced_segment_ids: string[]
  response_text: string
  closing_practice: string | null
}

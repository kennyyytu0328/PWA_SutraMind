import type { CategoryId, ChatMessage } from '@/types/chat'
import type { GeminiContent, GeminiPayload } from '@/lib/prompt-builder'

export interface BuildAnalyticsPromptInput {
  messages: ChatMessage[]
  category: CategoryId
}

const ROLE_BLOCK = `
[Role]
你是專精心經與情緒量化分析的 observer。理性、客觀地把對話內容
抽取成 5 維情緒指標。不評論、不安慰、不勸誡。
`.trim()

const DIMENSION_BLOCK = `
[Dimension Definitions]
- work_anxiety           職場 / 工作 / 成就焦慮
- relationship_clinging  關係 / 親密 / 人際執著
- existential_emptiness  存在虛無 / 年齡 / 意義匱乏
- health_fear            身體病痛 / 死亡 / 失能恐懼
- acute_emotion          突發性情緒高峰（憤怒、悲慟、恐慌）
`.trim()

const SCORING_BLOCK = `
[Scoring Rules]
- 每維 0-10 整數
- 0 = 對話完全未觸及；3 = 隱約提及；6 = 明確困擾；9-10 = 強烈痛苦
- 評估「使用者本人」的狀態，不評估 AI 回覆
`.trim()

const SUTRA_HINT_BLOCK = `
[Sutra Hint]
從 segment_1 .. segment_9 挑 1 個最對應使用者主要痛苦的段落
`.trim()

const OUTPUT_CONTRACT_BLOCK = `
[Output Contract]
你 MUST 回傳單一 JSON 物件，符合此 schema：
{
  "metrics": {
    "work_anxiety": int (0-10),
    "relationship_clinging": int (0-10),
    "existential_emptiness": int (0-10),
    "health_fear": int (0-10),
    "acute_emotion": int (0-10)
  },
  "mind_summary": string,        // <=80 字，第三人稱客觀觀察，無安慰語
  "recommended_segment": string  // "segment_1" .. "segment_9"
}
`.trim()

function categoryBlock(category: CategoryId): string {
  return `[Session Category]\n${category}`
}

function formatHistory(messages: ChatMessage[]): GeminiContent[] {
  return messages.map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: m.content }],
  }))
}

export function buildAnalyticsPrompt(
  input: BuildAnalyticsPromptInput
): GeminiPayload {
  const systemInstruction = [
    ROLE_BLOCK,
    DIMENSION_BLOCK,
    SCORING_BLOCK,
    SUTRA_HINT_BLOCK,
    categoryBlock(input.category),
    OUTPUT_CONTRACT_BLOCK,
  ].join('\n\n')

  return {
    systemInstruction,
    contents: formatHistory(input.messages),
    responseSchema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'object',
          properties: {
            work_anxiety: { type: 'integer' },
            relationship_clinging: { type: 'integer' },
            existential_emptiness: { type: 'integer' },
            health_fear: { type: 'integer' },
            acute_emotion: { type: 'integer' },
          },
          required: [
            'work_anxiety',
            'relationship_clinging',
            'existential_emptiness',
            'health_fear',
            'acute_emotion',
          ],
        },
        mind_summary: { type: 'string' },
        recommended_segment: { type: 'string' },
      },
      required: ['metrics', 'mind_summary'],
    },
    generationConfig: {
      temperature: 0.3, // low for stable extraction
      responseMimeType: 'application/json',
    },
  }
}

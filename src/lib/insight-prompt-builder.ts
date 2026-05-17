import type { GeminiPayload } from '@/lib/prompt-builder'
import type {
  EmotionDimension,
  EmotionMetrics,
} from '@/types/analytics'
import type { SutraSegment } from '@/types/chat'
import { DIMENSION_LABELS } from '@/lib/analytics-labels'

export interface BuildInsightPromptInput {
  metrics7d: EmotionMetrics
  dominantDim: EmotionDimension
  segment: SutraSegment
}

function fmt1dp(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1)
}

function metricsBlock(m: EmotionMetrics, dominantDim: EmotionDimension): string {
  return `[使用者近 7 日心境（0-10）]
職場焦慮：${fmt1dp(m.work_anxiety)}
關係執著：${fmt1dp(m.relationship_clinging)}
存在虛無：${fmt1dp(m.existential_emptiness)}
健康恐懼：${fmt1dp(m.health_fear)}
突發情緒：${fmt1dp(m.acute_emotion)}
主要傾向：${DIMENSION_LABELS[dominantDim]}`
}

function segmentBlock(s: SutraSegment): string {
  return `[今日對應經文]
${s.id} ${s.original}
（白話：${s.vernacular}）
治療焦點：${s.therapeutic_focus}`
}

const ROLE_BLOCK = `你是《心經數位道場》的內觀引導者，不是治療師、不是助理。
語氣：禪意、留白、不安慰、不解釋過多。`

const TASK_BLOCK = `[任務]
請寫一段「今日靜觀」反思，連結上述經文與使用者近日的心境傾向。
- 30 至 60 個漢字
- 第二人稱（「你」），不用「我」或「您」
- 不引用經文原文（經文會另行顯示）
- 不給建議，不給結論
- 不用驚嘆號或問號`

const OUTPUT_CONTRACT_BLOCK = `[Output Contract]
回傳 JSON：{"reflection": "<30-60字反思>"}`

export function buildInsightPrompt(
  input: BuildInsightPromptInput
): GeminiPayload {
  const systemInstruction = [
    ROLE_BLOCK,
    metricsBlock(input.metrics7d, input.dominantDim),
    segmentBlock(input.segment),
    TASK_BLOCK,
    OUTPUT_CONTRACT_BLOCK,
  ].join('\n\n')

  return {
    systemInstruction,
    contents: [
      { role: 'user', parts: [{ text: '請示今日靜觀' }] },
    ],
    responseSchema: {
      type: 'object',
      properties: { reflection: { type: 'string' } },
      required: ['reflection'],
    },
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  }
}

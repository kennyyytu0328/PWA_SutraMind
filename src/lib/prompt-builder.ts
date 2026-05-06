import type {
  CategoryId,
  ChatMessage,
  RoundNumber,
  SutraSegment,
} from '@/types/chat'
import { getCategory } from '@/lib/categories'

export interface BuildPromptInput {
  category: CategoryId
  history: ChatMessage[]
  userMessage: string
  sutraDB: SutraSegment[]
  roundNumber: RoundNumber
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export interface GeminiPayload {
  systemInstruction: string
  contents: GeminiContent[]
  responseSchema: object
  generationConfig: {
    temperature: number
    responseMimeType: 'application/json'
  }
}

const ROLE_BLOCK = `
[Role]
You are a digital mentor blending Mahayana Buddhist wisdom (Heart Sutra / 般若波羅蜜多心經) with modern Cognitive Behavioural Therapy (CBT). Your knowledge base is the Sutra-DB provided below.

Behavioural rules (follow ALL):
1. Deep Listening (深層聽解): identify the attachment point in the user's emotion, not the surface complaint.
2. Sutra Mapping (經文映射): pick 1-2 most relevant segments from the Sutra-DB; quote the original briefly and re-interpret it for the user's situation.
3. De-labeling (去標籤化): help the user see the emptiness (空) of "the suffering" and "the self" — soften the solidity of the emotion.
4. Zen Response (禪意回覆): elegant, calm, forward-looking. NEVER moralize. NEVER use phrases like "你應該", "要學會", "請記住", "時間會治癒". Prefer guided questions or awareness practices.
`.trim()

function buildSutraKnowledgeBlock(sutraDB: SutraSegment[]): string {
  return `
[Sutra Knowledge Base]
Here is your full knowledge base. Each segment has: id, original (Chinese sutra text), vernacular (modern translation), keywords, therapeutic_focus.

<SUTRA_DB>
${JSON.stringify(sutraDB, null, 2)}
</SUTRA_DB>
`.trim()
}

function buildCategoryStrategyBlock(categoryId: CategoryId): string {
  const c = getCategory(categoryId)
  return `
[Category Strategy]
The user has selected category: ${c.label} (${categoryId}).
Inference focus: ${c.strategy}
Likely relevant segments (use as starting hints, not constraints): ${c.likelySegments.join(', ')}
`.trim()
}

function buildClosingRulesBlock(round: RoundNumber): string {
  if (round < 3) {
    return `
[Closing Rules — round ${round} of 3]
End your reply with EITHER a single reflective question OR a tiny awareness practice (e.g., "now notice your breath for three cycles"). Keep it gentle. Do NOT moralize.
`.trim()
  }
  return `
[Closing Rules — final round (3 of 3)]
This is the final round. End with:
1. ONE concrete present-moment practice the user can do right now (under 30 seconds).
2. A brief, sincere blessing (one short sentence).
Do NOT moralize. Do NOT promise outcomes.
`.trim()
}
function buildOutputContractBlock(): string {
  return `
[Output Contract]
You MUST respond with a single JSON object matching this schema:
{
  "referenced_segment_ids": string[]   // 1-2 ids from <SUTRA_DB> you actually drew from
  "response_text": string              // your Zen reply, plain text only
  "closing_practice": string | null    // tiny actionable practice OR null
}

Rules:
- "response_text" is plain Chinese text. Do not include the original sutra characters in response_text — the UI will render the original from referenced_segment_ids.
- Keep response_text under ~180 Chinese characters.
- referenced_segment_ids MUST contain at least one valid id (segment_1 .. segment_9).
`.trim()
}

function formatHistory(
  history: ChatMessage[],
  userMessage: string
): GeminiContent[] {
  const out: GeminiContent[] = []
  for (const m of history) {
    out.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })
  }
  out.push({ role: 'user', parts: [{ text: userMessage }] })
  return out
}

export function buildPrompt(input: BuildPromptInput): GeminiPayload {
  const { category, sutraDB, roundNumber, history, userMessage } = input
  const systemInstruction = [
    ROLE_BLOCK,
    buildSutraKnowledgeBlock(sutraDB),
    buildCategoryStrategyBlock(category),
    buildClosingRulesBlock(roundNumber),
    buildOutputContractBlock(),
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    systemInstruction,
    contents: formatHistory(history, userMessage),
    responseSchema: {
      type: 'object',
      properties: {
        referenced_segment_ids: { type: 'array', items: { type: 'string' } },
        response_text: { type: 'string' },
        closing_practice: { type: 'string', nullable: true },
      },
      required: ['referenced_segment_ids', 'response_text'],
    },
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  }
}

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

// Placeholders to be filled in later tasks:
function buildCategoryStrategyBlock(_category: CategoryId): string {
  return ''
}
function buildClosingRulesBlock(_round: RoundNumber): string {
  return ''
}
function buildOutputContractBlock(): string {
  return ''
}
function formatHistory(_history: ChatMessage[], _userMessage: string): GeminiContent[] {
  return []
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
    responseSchema: {},
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  }
}

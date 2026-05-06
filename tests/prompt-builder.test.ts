import { describe, it, expect } from 'vitest'
import { buildPrompt } from '@/lib/prompt-builder'
import sutraDB from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'

const db = sutraDB as SutraSegment[]

const baseInput = {
  category: 'emotion_relation' as const,
  history: [],
  userMessage: '我跟伴侶分手了',
  sutraDB: db,
  roundNumber: 1 as const,
}

describe('prompt-builder: role + sutra knowledge blocks', () => {
  it('includes the role block describing the digital mentor', () => {
    const p = buildPrompt(baseInput)
    expect(p.systemInstruction).toMatch(/digital mentor/i)
    expect(p.systemInstruction).toMatch(/Mahayana|般若|Heart Sutra/i)
    expect(p.systemInstruction).toMatch(/CBT/)
  })

  it('lists the four behavioural rules from the spec', () => {
    const p = buildPrompt(baseInput)
    expect(p.systemInstruction).toMatch(/Deep Listening|深層聽解/)
    expect(p.systemInstruction).toMatch(/Sutra Mapping|經文映射/)
    expect(p.systemInstruction).toMatch(/De-labeling|去標籤化/)
    expect(p.systemInstruction).toMatch(/Zen Response|禪意回覆/)
  })

  it('embeds full sutra DB inside <SUTRA_DB> tags as JSON', () => {
    const p = buildPrompt(baseInput)
    expect(p.systemInstruction).toContain('<SUTRA_DB>')
    expect(p.systemInstruction).toContain('</SUTRA_DB>')
    const m = p.systemInstruction.match(/<SUTRA_DB>([\s\S]*?)<\/SUTRA_DB>/)
    expect(m).not.toBeNull()
    const parsed = JSON.parse(m![1])
    expect(parsed).toHaveLength(9)
    expect(parsed[0]).toHaveProperty('id', 'segment_1')
  })
})

describe('prompt-builder: category strategy block', () => {
  it('injects emotion_relation strategy', () => {
    const p = buildPrompt({ ...baseInput, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/情感與關係|emotion_relation/)
    expect(p.systemInstruction).toMatch(/心無罣礙/)
    expect(p.systemInstruction).toMatch(/segment_4/)
  })
})

describe('prompt-builder: round-aware closing rules', () => {
  it('round 1 uses reflective-question closing', () => {
    const p = buildPrompt({ ...baseInput, roundNumber: 1 })
    expect(p.systemInstruction).toMatch(/reflective question|awareness practice/i)
    expect(p.systemInstruction).not.toMatch(/final round|brief blessing/i)
  })

  it('round 2 also uses reflective-question closing', () => {
    const p = buildPrompt({ ...baseInput, roundNumber: 2 })
    expect(p.systemInstruction).toMatch(/reflective question|awareness practice/i)
  })

  it('round 3 uses concrete-practice + blessing closing', () => {
    const p = buildPrompt({ ...baseInput, roundNumber: 3 })
    expect(p.systemInstruction).toMatch(/final round/i)
    expect(p.systemInstruction).toMatch(/concrete.*practice/i)
    expect(p.systemInstruction).toMatch(/blessing/i)
  })
})

describe('prompt-builder: output contract', () => {
  it('responseSchema requires referenced_segment_ids and response_text', () => {
    const p = buildPrompt(baseInput)
    const s = p.responseSchema as any
    expect(s.type).toBe('object')
    expect(s.required).toContain('referenced_segment_ids')
    expect(s.required).toContain('response_text')
    expect(s.properties.referenced_segment_ids.type).toBe('array')
    expect(s.properties.response_text.type).toBe('string')
  })

  it('system instruction forbids putting original sutra text inside response_text', () => {
    const p = buildPrompt(baseInput)
    expect(p.systemInstruction).toMatch(/JSON/)
    expect(p.systemInstruction).toMatch(/do not include.*original.*response_text/i)
  })
})

describe('prompt-builder: contents history formatting', () => {
  it('returns single user content when history is empty', () => {
    const p = buildPrompt(baseInput)
    expect(p.contents).toHaveLength(1)
    expect(p.contents[0]).toEqual({
      role: 'user',
      parts: [{ text: '我跟伴侶分手了' }],
    })
  })

  it('translates history into gemini user/model role pairs', () => {
    const p = buildPrompt({
      ...baseInput,
      history: [
        { role: 'user', content: 'hi', timestamp: 1 },
        {
          role: 'assistant',
          content: 'reply text',
          referencedSegmentIds: ['segment_4'],
          closingPractice: null,
          timestamp: 2,
        },
      ],
      userMessage: 'follow up',
    })
    expect(p.contents).toEqual([
      { role: 'user', parts: [{ text: 'hi' }] },
      { role: 'model', parts: [{ text: 'reply text' }] },
      { role: 'user', parts: [{ text: 'follow up' }] },
    ])
  })

  it('feeds only response_text back as model turn (not the JSON wrapper)', () => {
    const p = buildPrompt({
      ...baseInput,
      history: [
        {
          role: 'assistant',
          content: 'plain text',
          referencedSegmentIds: ['segment_4'],
          timestamp: 1,
        },
      ],
      userMessage: 'q',
    })
    const modelTurn = p.contents.find((c) => c.role === 'model')!
    expect(modelTurn.parts[0].text).toBe('plain text')
    expect(modelTurn.parts[0].text).not.toMatch(/referenced_segment_ids/)
  })
})

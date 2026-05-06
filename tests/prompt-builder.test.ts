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

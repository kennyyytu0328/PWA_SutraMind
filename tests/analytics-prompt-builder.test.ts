import { describe, it, expect } from 'vitest'
import { buildAnalyticsPrompt } from '@/lib/analytics-prompt-builder'
import type { ChatMessage } from '@/types/chat'

const sampleMessages: ChatMessage[] = [
  { role: 'user', content: '我跟伴侶冷戰三天了', timestamp: 1 },
  { role: 'assistant', content: '請觀照此刻呼吸', referencedSegmentIds: ['segment_4'], timestamp: 2 },
  { role: 'user', content: '心裡很慌', timestamp: 3 },
]

describe('analytics-prompt-builder: instruction blocks', () => {
  it('includes the observer role block', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/observer/i)
    expect(p.systemInstruction).toMatch(/不評論|不安慰|不勸誡/)
  })

  it('lists all 5 dimensions with Chinese descriptions', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/work_anxiety/)
    expect(p.systemInstruction).toMatch(/relationship_clinging/)
    expect(p.systemInstruction).toMatch(/existential_emptiness/)
    expect(p.systemInstruction).toMatch(/health_fear/)
    expect(p.systemInstruction).toMatch(/acute_emotion/)
    expect(p.systemInstruction).toMatch(/職場/)
    expect(p.systemInstruction).toMatch(/關係/)
  })

  it('includes 0-10 integer scoring rules', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/0-10/)
    expect(p.systemInstruction).toMatch(/整數/)
  })

  it('includes sutra recommendation hint pointing to segment_1..segment_9', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/segment_1.*segment_9/)
  })

  it('embeds the Output Contract with the 5 dimensions and mind_summary', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/\[Output Contract\]/)
    expect(p.systemInstruction).toMatch(/metrics/)
    expect(p.systemInstruction).toMatch(/mind_summary/)
    expect(p.systemInstruction).toMatch(/recommended_segment/)
    expect(p.systemInstruction).toMatch(/80/)
  })
})

describe('analytics-prompt-builder: responseSchema (belt for SDK that honors it)', () => {
  it('declares the 5 dimensions and mind_summary as required', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    const s = p.responseSchema as any
    expect(s.type).toBe('object')
    expect(s.required).toContain('metrics')
    expect(s.required).toContain('mind_summary')
    expect(s.properties.metrics.type).toBe('object')
    expect(s.properties.metrics.required).toEqual(
      expect.arrayContaining([
        'work_anxiety',
        'relationship_clinging',
        'existential_emptiness',
        'health_fear',
        'acute_emotion',
      ])
    )
  })
})

describe('analytics-prompt-builder: contents history', () => {
  it('maps assistant → model and preserves order', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.contents).toEqual([
      { role: 'user', parts: [{ text: '我跟伴侶冷戰三天了' }] },
      { role: 'model', parts: [{ text: '請觀照此刻呼吸' }] },
      { role: 'user', parts: [{ text: '心裡很慌' }] },
    ])
  })

  it('omits closingPractice / referencedSegmentIds from model parts (plain text only)', () => {
    const p = buildAnalyticsPrompt({
      messages: [
        {
          role: 'assistant',
          content: 'plain reply',
          referencedSegmentIds: ['segment_4'],
          closingPractice: 'breathe',
          timestamp: 1,
        },
      ],
      category: 'emotion_relation',
    })
    const modelTurn = p.contents.find((c) => c.role === 'model')!
    expect(modelTurn.parts[0].text).toBe('plain reply')
    expect(modelTurn.parts[0].text).not.toMatch(/closingPractice/)
    expect(modelTurn.parts[0].text).not.toMatch(/segment_4/)
  })
})

describe('analytics-prompt-builder: temperature + mime type', () => {
  it('uses application/json mime and a low-ish temperature for stable extraction', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.generationConfig.responseMimeType).toBe('application/json')
    expect(p.generationConfig.temperature).toBeLessThanOrEqual(0.4)
  })
})

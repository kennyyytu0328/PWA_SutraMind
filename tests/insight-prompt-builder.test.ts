import { describe, it, expect } from 'vitest'
import { buildInsightPrompt } from '@/lib/insight-prompt-builder'
import type { EmotionMetrics, EmotionDimension } from '@/types/analytics'
import type { SutraSegment } from '@/types/chat'

const sampleMetrics: EmotionMetrics = {
  work_anxiety: 6.2,
  relationship_clinging: 3.1,
  existential_emptiness: 1.8,
  health_fear: 5.5,
  acute_emotion: 2.2,
}

const sampleSegment: SutraSegment = {
  id: 'segment_5',
  original: '無無明，亦無無明盡，乃至無老死，亦無老死盡。無苦集滅道，無智亦無得。',
  vernacular: '沒有永遠消除不掉的愚昧⋯⋯',
  keywords: ['無所得'],
  therapeutic_focus: '緩解對進度、成就、人生意義的過度追求',
}

describe('buildInsightPrompt', () => {
  it('embeds all 5 metrics with their Chinese labels', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('職場焦慮：6.2')
    expect(p.systemInstruction).toContain('關係執著：3.1')
    expect(p.systemInstruction).toContain('存在虛無：1.8')
    expect(p.systemInstruction).toContain('健康恐懼：5.5')
    expect(p.systemInstruction).toContain('突發情緒：2.2')
  })

  it('includes the dominant dim label as 主要傾向', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('主要傾向：職場焦慮')
  })

  it('embeds segment id, original, vernacular, and therapeutic_focus', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('segment_5')
    expect(p.systemInstruction).toContain(sampleSegment.original)
    expect(p.systemInstruction).toContain(sampleSegment.vernacular)
    expect(p.systemInstruction).toContain(sampleSegment.therapeutic_focus)
  })

  it('output contract requests JSON with reflection field, 30-60 chars', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('[Output Contract]')
    expect(p.systemInstruction).toContain('"reflection"')
    expect(p.systemInstruction).toContain('30 至 60 個漢字')
  })

  it('responseSchema requires `reflection` string', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.responseSchema).toEqual({
      type: 'object',
      properties: { reflection: { type: 'string' } },
      required: ['reflection'],
    })
  })

  it('generationConfig uses temperature 0.7 and JSON mime', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.generationConfig.responseMimeType).toBe('application/json')
    expect(p.generationConfig.temperature).toBe(0.7)
  })

  it('contents carries a single user turn (Gemini SDK rejects empty contents with "contents are required")', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.contents).toHaveLength(1)
    expect(p.contents[0].role).toBe('user')
    expect(p.contents[0].parts[0].text).toBeTruthy()
  })

  it('rounds incoming metrics to 1 decimal before substitution', () => {
    const p = buildInsightPrompt({
      metrics7d: { ...sampleMetrics, work_anxiety: 6.249 },
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('職場焦慮：6.2')
    expect(p.systemInstruction).not.toContain('6.249')
  })

  it('all 5 dominant dim labels render correctly', () => {
    const expectedLabels: Record<EmotionDimension, string> = {
      work_anxiety: '職場焦慮',
      relationship_clinging: '關係執著',
      existential_emptiness: '存在虛無',
      health_fear: '健康恐懼',
      acute_emotion: '突發情緒',
    }
    for (const dim of Object.keys(expectedLabels) as EmotionDimension[]) {
      const p = buildInsightPrompt({
        metrics7d: sampleMetrics,
        dominantDim: dim,
        segment: sampleSegment,
      })
      expect(p.systemInstruction).toContain(`主要傾向：${expectedLabels[dim]}`)
    }
  })
})

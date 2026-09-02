import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecitationStage } from '@/components/Recitation/RecitationStage'

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))

const p = (index: number, text: string) => ({ index, text, segmentId: 'segment_1' })

describe('RecitationStage under reduced motion', () => {
  it('swaps the current phrase to recite-fade and keeps --depth offsets on recent phrases', () => {
    render(
      <RecitationStage
        current={p(3, '度一切苦厄。')}
        recent={[p(1, '觀自在菩薩，'), p(2, '行深般若波羅蜜多時，')]}
        status="playing"
        onTap={() => {}}
      />
    )

    const current = screen.getByText('度一切苦厄。')
    expect(current.className).toContain('recite-fade')
    expect(current.className).not.toContain('recite-rise')

    const oldest = screen.getByText('觀自在菩薩，')
    expect(oldest.className).toContain('recite-linger')
    expect(oldest.className).toContain('recite-fade')
    expect(oldest.style.getPropertyValue('--depth')).toBe('2')

    const newer = screen.getByText('行深般若波羅蜜多時，')
    expect(newer.className).toContain('recite-linger')
    expect(newer.className).toContain('recite-fade')
    expect(newer.style.getPropertyValue('--depth')).toBe('1')
  })
})

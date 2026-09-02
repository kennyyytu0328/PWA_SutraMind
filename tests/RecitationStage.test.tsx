import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecitationStage } from '@/components/Recitation/RecitationStage'

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false }))

const p = (index: number, text: string) => ({ index, text, segmentId: 'segment_1' })

describe('RecitationStage', () => {
  it('renders the current phrase with the rise class and recent phrases with linger depth', () => {
    render(
      <RecitationStage
        current={p(3, '度一切苦厄。')}
        recent={[p(1, '觀自在菩薩，'), p(2, '行深般若波羅蜜多時，')]}
        status="playing"
        onTap={() => {}}
      />
    )
    const current = screen.getByText('度一切苦厄。')
    expect(current.className).toContain('recite-rise')
    const oldest = screen.getByText('觀自在菩薩，')
    expect(oldest.className).toContain('recite-linger')
    expect(oldest.style.getPropertyValue('--depth')).toBe('2')
    expect(screen.getByText('行深般若波羅蜜多時，').style.getPropertyValue('--depth')).toBe('1')
    // aria-live is on the stable container, not the keyed phrase element
    const stableContainer = screen.getByTestId('recite-stage').querySelector('[aria-live="polite"]')
    expect(stableContainer).not.toBe(current)
    expect(stableContainer).toBeInTheDocument()
  })

  it('shows 止 overlay only when paused', () => {
    const { rerender } = render(
      <RecitationStage current={p(0, '般若波羅蜜多心經')} recent={[]} status="playing" onTap={() => {}} />
    )
    expect(screen.queryByText('止')).toBeNull()
    rerender(
      <RecitationStage current={p(0, '般若波羅蜜多心經')} recent={[]} status="paused" onTap={() => {}} />
    )
    expect(screen.getByText('止')).toBeInTheDocument()
  })

  it('calls onTap when the stage is clicked', () => {
    const onTap = vi.fn()
    render(<RecitationStage current={p(0, '般若波羅蜜多心經')} recent={[]} status="playing" onTap={onTap} />)
    fireEvent.click(screen.getByTestId('recite-stage'))
    expect(onTap).toHaveBeenCalledTimes(1)
  })
})

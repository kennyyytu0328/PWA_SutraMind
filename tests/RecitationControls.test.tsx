import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecitationControls } from '@/components/Recitation/RecitationControls'
import { RecitationDone } from '@/components/Recitation/RecitationDone'

describe('RecitationControls', () => {
  it('renders speed pills as a radiogroup with the active one checked', () => {
    render(
      <RecitationControls speed="中" status="idle" progress={0} onSpeed={() => {}} onStart={() => {}} />
    )
    const group = screen.getByRole('radiogroup')
    const radios = screen.getAllByRole('radio')
    expect(group).toBeInTheDocument()
    expect(radios.map((r) => r.textContent)).toEqual(['緩', '中', '疾'])
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onSpeed with the tapped speed', () => {
    const onSpeed = vi.fn()
    render(
      <RecitationControls speed="中" status="playing" progress={0.3} onSpeed={onSpeed} onStart={() => {}} />
    )
    fireEvent.click(screen.getByText('疾'))
    expect(onSpeed).toHaveBeenCalledWith('疾')
  })

  it('shows 開始 only when idle and wires onStart', () => {
    const onStart = vi.fn()
    const { rerender } = render(
      <RecitationControls speed="中" status="idle" progress={0} onSpeed={() => {}} onStart={onStart} />
    )
    fireEvent.click(screen.getByText('開始'))
    expect(onStart).toHaveBeenCalledTimes(1)
    rerender(
      <RecitationControls speed="中" status="playing" progress={0.5} onSpeed={() => {}} onStart={onStart} />
    )
    expect(screen.queryByText('開始')).toBeNull()
  })

  it('renders progress hairline width as a percentage', () => {
    render(
      <RecitationControls speed="中" status="playing" progress={0.25} onSpeed={() => {}} onStart={() => {}} />
    )
    expect(screen.getByTestId('recite-progress').style.width).toBe('25%')
  })

  it('hides the progress hairline when idle', () => {
    render(
      <RecitationControls speed="中" status="idle" progress={0} onSpeed={() => {}} onStart={() => {}} />
    )
    expect(screen.queryByTestId('recite-progress')).toBeNull()
  })
})

describe('RecitationDone', () => {
  it('shows 一遍圓滿 with restart and return actions', () => {
    const onRestart = vi.fn()
    render(<RecitationDone onRestart={onRestart} />)
    expect(screen.getByText('一遍圓滿')).toBeInTheDocument()
    fireEvent.click(screen.getByText('再誦一遍'))
    expect(onRestart).toHaveBeenCalledTimes(1)
    expect(screen.getByText('回到道場')).toHaveAttribute('href', '/categories')
  })
})

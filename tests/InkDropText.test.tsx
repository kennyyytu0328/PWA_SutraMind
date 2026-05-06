import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { InkDropText } from '@/components/InkDropText'
import { setMatchMediaMatches } from './setup'

describe('InkDropText — static mode', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })

  it('renders the full text immediately', () => {
    const { getByText } = render(<InkDropText text="心無罣礙" mode="static" />)
    expect(getByText('心無罣礙')).toBeInTheDocument()
  })

  it('preserves whitespace and line breaks', () => {
    const { container } = render(<InkDropText text={'第一行\n第二行'} mode="static" />)
    expect(container.textContent).toBe('第一行\n第二行')
  })
})

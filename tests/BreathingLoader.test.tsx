import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { BreathingLoader } from '@/components/BreathingLoader'
import { setMatchMediaMatches } from './setup'

describe('BreathingLoader', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })

  it('renders an element with the breath-glow animation class', () => {
    setMatchMediaMatches(false)
    const { container } = render(React.createElement(BreathingLoader))
    const glow = container.querySelector('[data-testid="breath-glow"]')
    expect(glow).not.toBeNull()
    expect(glow?.className).toMatch(/animate-breath-glow/)
  })

  it('renders a static (no-animation) variant when prefers-reduced-motion is set', () => {
    setMatchMediaMatches(true)
    const { container } = render(React.createElement(BreathingLoader))
    const glow = container.querySelector('[data-testid="breath-glow"]')
    expect(glow).not.toBeNull()
    expect(glow?.className).not.toMatch(/animate-breath-glow/)
    expect(glow?.className).toMatch(/opacity-/)
  })
})

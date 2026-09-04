import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MoonlitBackdrop } from '@/components/MoonlitBackdrop'
import { setMatchMediaMatches } from './setup'

describe('MoonlitBackdrop', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })
  afterEach(() => cleanup())

  const layer = () => document.body.querySelector('.moonlit-backdrop')

  it('portals a decorative fixed layer to <body>, outside the page column', () => {
    const { container } = render(<MoonlitBackdrop />)
    expect(container.querySelector('.moonlit-backdrop')).toBeNull()
    const el = layer()
    expect(el).not.toBeNull()
    expect(el?.parentElement).toBe(document.body)
    expect(el?.getAttribute('aria-hidden')).toBe('true')
    expect(el?.querySelectorAll('svg')).toHaveLength(1)
    expect(el?.querySelector('[data-part="moon"]')).not.toBeNull()
    expect(el?.querySelector('[data-part="figure"]')).not.toBeNull()
    expect(el?.querySelector('[data-part="grass"]')).not.toBeNull()
  })

  it('breathes the moon halo by default', () => {
    render(<MoonlitBackdrop />)
    const halo = layer()?.querySelector('[data-part="halo"]')
    expect(halo?.getAttribute('class')).toContain('moonlit-breathe')
  })

  it('holds the halo still under reduced motion', () => {
    setMatchMediaMatches(true)
    render(<MoonlitBackdrop />)
    const halo = layer()?.querySelector('[data-part="halo"]')
    expect(halo?.getAttribute('class')).not.toContain('moonlit-breathe')
  })
})

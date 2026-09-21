import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { BuddhaBackdrop } from '@/components/BuddhaBackdrop'

describe('BuddhaBackdrop', () => {
  afterEach(() => cleanup())

  const layer = () => document.body.querySelector<HTMLElement>('.buddha-backdrop')

  it('portals a decorative fixed layer to <body>, outside the page column', () => {
    const { container } = render(<BuddhaBackdrop />)
    expect(container.querySelector('.buddha-backdrop')).toBeNull()
    const el = layer()
    expect(el).not.toBeNull()
    expect(el?.parentElement).toBe(document.body)
    expect(el?.getAttribute('aria-hidden')).toBe('true')
  })

  it('paints the Buddha photo from /public as its background', () => {
    render(<BuddhaBackdrop />)
    expect(layer()?.style.backgroundImage).toContain('/buddha_background.jpg')
  })
})

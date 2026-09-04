import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ZenIcon, ZEN_ICON_NAMES } from '@/components/ZenIcon'
import { CATEGORIES } from '@/lib/categories'

describe('ZenIcon', () => {
  it('exposes the eight reference symbols', () => {
    expect([...ZEN_ICON_NAMES].sort()).toEqual(
      [
        'knotHeart',
        'leaf',
        'lotus',
        'meditator',
        'mountain',
        'rings',
        'spiral',
        'yinYang',
      ].sort(),
    )
  })

  it('renders a filled, decorative svg for every name', () => {
    for (const name of ZEN_ICON_NAMES) {
      const { container, unmount } = render(
        <ZenIcon name={name} className="w-5 h-5" />,
      )
      const svg = container.querySelector('svg')
      expect(svg, name).not.toBeNull()
      expect(svg?.getAttribute('aria-hidden')).toBe('true')
      expect(svg?.getAttribute('fill')).toBe('currentColor')
      expect(svg?.getAttribute('class')).toContain('w-5')
      expect(svg?.querySelector('path'), name).not.toBeNull()
      unmount()
    }
  })

  it('throws on an unknown name', () => {
    expect(() =>
      render(<ZenIcon name={'nope' as never} />),
    ).toThrow(/Unknown ZenIcon/)
  })

  it('every category maps to a known icon', () => {
    for (const c of CATEGORIES) {
      expect(ZEN_ICON_NAMES, c.id).toContain(c.icon)
    }
  })
})

/**
 * Monochrome Zen glyphs — solid silhouettes on a 24×24 grid, filled with
 * `currentColor` so the parent's text color paints them. Drawn to match the
 * yin-yang / rings / meditator / spiral / leaf / knotted-heart / mountain
 * reference sheet. Purely decorative; always paired with a visible label.
 */

export const ZEN_ICON_NAMES = [
  'knotHeart',
  'mountain',
  'meditator',
  'leaf',
  'spiral',
  'lotus',
  'yinYang',
  'rings',
] as const

export type ZenIconName = (typeof ZEN_ICON_NAMES)[number]

interface Props {
  name: ZenIconName
  className?: string
}

const KNOT_HEART = (
  <>
    <path
      fillRule="evenodd"
      d="M12 21.2 3.7 13.4C1.4 11.2 1.4 7.6 3.7 5.5c2-1.9 5.1-1.9 7.1 0L12 6.6l1.2-1.1c2-1.9 5.1-1.9 7.1 0 2.3 2.1 2.3 5.7 0 7.9L12 21.2Zm0-3.1 6.7-6.3c1.4-1.3 1.4-3.4 0-4.6-1.1-1-2.9-1-4 0L12 9.9 9.3 7.2c-1.1-1-2.9-1-4 0-1.4 1.2-1.4 3.3 0 4.6L12 18.1Z"
    />
    <path d="M12 9.9c1.8-1.6 4.1-1.4 5.2.2 1.1 1.6.2 3.5-1.8 4.8-1.5 1-3 1.4-4.4 1.1 1.3-.6 2.5-1.5 3.3-2.7.7-1 .4-1.9-.5-2-.7-.1-1.3.4-1.8 1L12 12.5l-.1-.2c-.5-.6-1.1-1.1-1.8-1-.9.1-1.2 1-.5 2 .8 1.2 2 2.1 3.3 2.7-1.4.3-2.9-.1-4.4-1.1-2-1.3-2.9-3.2-1.8-4.8 1.1-1.6 3.4-1.8 5.3-.2Z" />
  </>
)

const MOUNTAIN = (
  <>
    <path d="M17.5 2.8a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Z" />
    <path
      fillRule="evenodd"
      d="M2 20.5 9.8 7.4a1.3 1.3 0 0 1 2.2 0l2.4 4 1.1-1.6a1.2 1.2 0 0 1 2 0L22 20.5H2Zm6.7-6.4 1.2 1.1 1-1.5 1 1.5 1.2-1.1-2.2-3.7-2.2 3.7Z"
    />
  </>
)

const MEDITATOR = (
  <>
    <path d="M12 2.2c.7 1 1.4 2 1.4 3.2A1.4 1.4 0 0 1 12 6.8a1.4 1.4 0 0 1-1.4-1.4c0-1.2.7-2.2 1.4-3.2Z" />
    <path d="M12 7.6a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2Z" />
    <path d="M9.4 12.4c.7-.5 1.7-.7 2.6-.7s1.9.2 2.6.7l2.9 2.3c.5.4.6 1.1.2 1.6-.4.5-1.1.6-1.6.2l-1.4-1.1v2.3l3.7 1.2c.5.2.9.7.9 1.2 0 .6-.5 1.1-1.1 1.1H5.8c-.6 0-1.1-.5-1.1-1.1 0-.5.4-1 .9-1.2l3.7-1.2v-2.3l-1.4 1.1c-.5.4-1.2.3-1.6-.2-.4-.5-.3-1.2.2-1.6l2.9-2.3Z" />
  </>
)

const LEAF = (
  <path
    fillRule="evenodd"
    d="M19.6 3.2c.6 7.9-1.6 12.9-5.3 15.4-2.2 1.5-4.6 1.9-6.7 1.4-.6 1-1 1.7-1.2 2.2l-1.4-.6c.3-.6.7-1.4 1.3-2.4-1.4-1.8-1.9-4.4-1-7.2 1.5-4.7 6.8-7.4 14.3-8.8Zm-3 3.5C10.9 8.1 7.9 10.3 6.9 13.3c-.5 1.6-.4 3 .1 4.2 1.7-2.5 4-5.5 7-8.7-2.6 3.4-4.7 6.5-6.3 9 1.4.3 3.1 0 4.7-1.1 2.6-1.8 4.2-5 4.2-10Z"
  />
)

const SPIRAL = (
  <path
    fillRule="evenodd"
    d="M12 1.8a10.2 10.2 0 1 1 0 20.4 10.2 10.2 0 0 1 0-20.4Zm-.4 3.1c-3.3.2-5.8 2.6-6.1 5.6-.2 2.4 1.1 4.6 3.2 5.5-.9-1.3-1.1-3-.5-4.5.7-1.9 2.6-3 4.6-2.6 1.6.3 2.7 1.5 2.9 3 .1 1.2-.5 2.2-1.4 2.7.5-.5.7-1.3.4-2-.4-.9-1.4-1.3-2.4-1-.9.3-1.4 1.2-1.3 2.1.2 1.4 1.5 2.3 3 2.1 1.9-.2 3.3-1.8 3.5-3.7.2-2.3-1.3-4.4-3.5-5.1 1.3.2 2.5.9 3.4 1.9 1.4 1.7 1.7 4.1.7 6.1 1.9-1.6 2.6-4.3 1.6-6.7-1.2-2.9-4.4-4.4-8.1-3.4Z"
  />
)

const LOTUS = (
  <>
    <path d="M12 3.4c1.6 2 2.4 4.3 2.4 6.7 0 2.6-1 5-2.4 6.6-1.4-1.6-2.4-4-2.4-6.6 0-2.4.8-4.7 2.4-6.7Z" />
    <path d="M5.1 6.5c2.3.8 4.1 2.3 5.2 4.3-.5 2.2-.4 4.5.3 6.4-2.6-.8-4.6-2.9-5.5-5.5-.5-1.6-.6-3.3 0-5.2Z" />
    <path d="M18.9 6.5c.6 1.9.5 3.6 0 5.2-.9 2.6-2.9 4.7-5.5 5.5.7-1.9.8-4.2.3-6.4 1.1-2 2.9-3.5 5.2-4.3Z" />
    <path d="M2 13.2c2.4.2 4.5 1.2 6.1 2.7.9 2 2.3 3.5 3.9 4.4-3.4.9-7-.4-9.1-3.3-.5-1.1-.8-2.4-.9-3.8Z" />
    <path d="M22 13.2c-.1 1.4-.4 2.7-.9 3.8-2.1 2.9-5.7 4.2-9.1 3.3 1.6-.9 3-2.4 3.9-4.4 1.6-1.5 3.7-2.5 6.1-2.7Z" />
  </>
)

const YIN_YANG = (
  <path
    fillRule="evenodd"
    d="M12 1.8a10.2 10.2 0 1 1 0 20.4 10.2 10.2 0 0 1 0-20.4Zm0 2.1a8.1 8.1 0 0 0 0 16.2 4.05 4.05 0 0 1 0-8.1 4.05 4.05 0 0 0 0-8.1Zm0 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 8.1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
  />
)

const RINGS = (
  <>
    <path
      fillRule="evenodd"
      d="M12 3.2a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Zm0 2.2a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z"
    />
    <path
      fillRule="evenodd"
      d="M8.2 9.6a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Zm0 2.2a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z"
    />
    <path
      fillRule="evenodd"
      d="M15.8 9.6a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Zm0 2.2a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z"
    />
  </>
)

const GLYPHS: Record<ZenIconName, JSX.Element> = {
  knotHeart: KNOT_HEART,
  mountain: MOUNTAIN,
  meditator: MEDITATOR,
  leaf: LEAF,
  spiral: SPIRAL,
  lotus: LOTUS,
  yinYang: YIN_YANG,
  rings: RINGS,
}

export function ZenIcon({ name, className }: Props) {
  const glyph = GLYPHS[name]
  if (!glyph) throw new Error(`Unknown ZenIcon: ${String(name)}`)
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  )
}

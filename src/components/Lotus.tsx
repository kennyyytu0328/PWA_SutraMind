import type { CSSProperties } from 'react'

const SYMBOL_HOST_STYLE: CSSProperties = {
  position: 'absolute',
  width: 0,
  height: 0,
  overflow: 'hidden',
}

/**
 * Mount once at the top of <body>. Defines the shared <symbol id="lotus-e">
 * that every <LotusGlyph> instance references via <use>.
 */
export function LotusSymbol() {
  return (
    <svg style={SYMBOL_HOST_STYLE} aria-hidden="true" focusable="false">
      <symbol id="lotus-e" viewBox="0 0 120 120">
        {/* back-left petal */}
        <g transform="rotate(-72 60 100)">
          <path
            d="M60 100 C 42 92, 43 60, 60 50 C 77 60, 78 92, 60 100 Z"
            fill="#a8843a"
          />
          <path
            d="M60 98 L 60 54"
            stroke="#5a4115"
            strokeWidth="0.6"
            fill="none"
          />
        </g>
        {/* back-right petal */}
        <g transform="rotate(72 60 100)">
          <path
            d="M60 100 C 42 92, 43 60, 60 50 C 77 60, 78 92, 60 100 Z"
            fill="#a8843a"
          />
          <path
            d="M60 98 L 60 54"
            stroke="#5a4115"
            strokeWidth="0.6"
            fill="none"
          />
        </g>
        {/* mid-left petal */}
        <g transform="rotate(-36 60 100)">
          <path
            d="M60 100 C 40 92, 41 56, 60 46 C 79 56, 80 92, 60 100 Z"
            fill="#c29a4a"
          />
          <path
            d="M60 98 L 60 50"
            stroke="#6a4d18"
            strokeWidth="0.7"
            fill="none"
          />
        </g>
        {/* mid-right petal */}
        <g transform="rotate(36 60 100)">
          <path
            d="M60 100 C 40 92, 41 56, 60 46 C 79 56, 80 92, 60 100 Z"
            fill="#c29a4a"
          />
          <path
            d="M60 98 L 60 50"
            stroke="#6a4d18"
            strokeWidth="0.7"
            fill="none"
          />
        </g>
        {/* front-center petal */}
        <g transform="rotate(0 60 100)">
          <path
            d="M60 100 C 38 90, 40 50, 60 38 C 80 50, 82 90, 60 100 Z"
            fill="#dfb866"
          />
          <path
            d="M60 98 L 60 42"
            stroke="#7a5a1a"
            strokeWidth="0.8"
            fill="none"
          />
        </g>
        {/* pistil */}
        <circle cx="60" cy="100" r="2.5" fill="#7a5a1a" />
      </symbol>
    </svg>
  )
}

interface LotusGlyphProps {
  className?: string
}

/**
 * Renders the lotus by referencing the shared <symbol id="lotus-e">.
 * Default size is w-6 h-6 (24px) if no className is provided.
 */
export function LotusGlyph({ className = 'w-6 h-6' }: LotusGlyphProps) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <use href="#lotus-e" />
    </svg>
  )
}

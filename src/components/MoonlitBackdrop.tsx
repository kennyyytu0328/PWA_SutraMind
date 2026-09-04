'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * Fixed, non-interactive scene behind /chat: a warm moon with a soft gold
 * halo, a seated figure cut in silhouette against it, and grass along the
 * bottom edge. Drawn inline (no image asset) so the PWA stays self-contained;
 * every color comes from the zen palette classes, the silhouette uses the
 * page background so it reads as a cut-out.
 *
 * Portalled to <body>: <main> animates a transform on mount, which would
 * otherwise make it the containing block and trap the fixed layer inside
 * the narrow column.
 */

const GRASS_BLADES = [
  'M40 620 C 46 560, 30 540, 52 500 C 58 550, 62 590, 50 620 Z',
  'M92 620 C 96 570, 80 555, 104 520 C 110 565, 108 600, 100 620 Z',
  'M150 620 C 160 545, 138 535, 165 475 C 172 540, 176 590, 160 620 Z',
  'M214 620 C 218 580, 205 560, 226 530 C 232 575, 226 600, 220 620 Z',
  'M270 620 C 282 560, 262 550, 290 500 C 296 555, 292 595, 280 620 Z',
  'M318 620 C 326 560, 306 548, 334 498 C 340 552, 340 594, 328 620 Z',
  'M372 620 C 378 575, 362 562, 384 526 C 390 570, 388 600, 380 620 Z',
  'M428 620 C 438 552, 416 540, 446 480 C 452 546, 452 592, 438 620 Z',
  'M536 620 C 542 570, 526 556, 550 512 C 556 566, 554 600, 546 620 Z',
  'M588 620 C 600 550, 578 540, 608 478 C 614 546, 612 592, 598 620 Z',
  'M640 620 C 646 572, 630 558, 654 518 C 660 568, 656 600, 650 620 Z',
  'M660 620 C 668 565, 650 550, 676 505 C 682 560, 678 600, 668 620 Z',
  'M720 620 C 732 555, 708 545, 740 485 C 748 550, 748 595, 732 620 Z',
  'M790 620 C 794 580, 780 560, 802 530 C 808 575, 802 600, 796 620 Z',
  'M846 620 C 856 555, 836 545, 862 495 C 870 555, 866 595, 856 620 Z',
  'M910 620 C 914 575, 900 560, 922 520 C 928 565, 924 600, 916 620 Z',
]

const CLOVERS = [
  { x: 118, y: 528, r: 9 },
  { x: 248, y: 512, r: 8 },
  { x: 352, y: 530, r: 8 },
  { x: 616, y: 524, r: 8 },
  { x: 700, y: 522, r: 9 },
  { x: 885, y: 508, r: 8 },
]

function Clover({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={0} cy={-r} r={r} />
      <circle cx={r} cy={0} r={r} />
      <circle cx={0} cy={r} r={r} />
      <circle cx={-r} cy={0} r={r} />
      <path d={`M0 ${r} C ${r * 0.4} ${r * 3}, ${r * 0.2} ${r * 5}, ${r * 0.6} ${r * 7}`} strokeWidth={2} stroke="currentColor" fill="none" />
    </g>
  )
}

export function MoonlitBackdrop() {
  const reduced = useReducedMotion()
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => setHost(document.body), [])
  const haloClass = reduced ? '' : 'moonlit-breathe'

  if (!host) return null
  return createPortal(
    <div className="moonlit-backdrop" aria-hidden="true">
      <svg
        viewBox="0 0 960 620"
        preserveAspectRatio="xMidYMax meet"
        className="w-full h-full"
        focusable="false"
      >
        <defs>
          {/* stop-color: currentColor resolves from the <stop>'s own color,
              not the referencing shape's, so each stop carries its class */}
          <radialGradient id="moonlit-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" className="text-zen-accent" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="45%" className="text-zen-accent" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" className="text-zen-accent" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moonlit-disk" cx="50%" cy="50%" r="50%">
            <stop offset="0%" className="text-zen-text" stopColor="currentColor" stopOpacity="1" />
            <stop offset="85%" className="text-zen-text" stopColor="currentColor" stopOpacity="0.92" />
            <stop offset="100%" className="text-zen-text" stopColor="currentColor" stopOpacity="0.6" />
          </radialGradient>
        </defs>

        {/* halo */}
        <g data-part="halo" className={haloClass} style={{ transformOrigin: '480px 400px' }}>
          <circle cx={480} cy={400} r={320} fill="url(#moonlit-halo)" />
        </g>

        {/* moon disk */}
        <circle
          data-part="moon"
          cx={480}
          cy={400}
          r={180}
          fill="url(#moonlit-disk)"
        />

        {/* seated figure, cut from the page background */}
        <g data-part="figure" className="text-zen-bg" fill="currentColor">
          {/* flame finial */}
          <path d="M480 270 C 487 282, 493 294, 491 306 C 489 312, 486 316, 484 320 L 476 320 C 474 316, 471 312, 469 306 C 467 294, 473 282, 480 270 Z" />
          {/* ushnisha dome */}
          <path d="M454 324 C 456 302, 504 302, 506 324 Z" />
          {/* cranium + face */}
          <ellipse cx={480} cy={358} rx={34} ry={40} />
          {/* hair curls along the hairline */}
          <circle cx={511.9} cy={344.3} r={4.4} />
          <circle cx={508.5} cy={336.2} r={4.4} />
          <circle cx={503.6} cy={329.2} r={4.4} />
          <circle cx={497.5} cy={323.7} r={4.4} />
          <circle cx={490.5} cy={320.0} r={4.4} />
          <circle cx={483.0} cy={318.2} r={4.4} />
          <circle cx={475.3} cy={318.4} r={4.4} />
          <circle cx={467.8} cy={320.7} r={4.4} />
          <circle cx={461.0} cy={324.8} r={4.4} />
          <circle cx={455.1} cy={330.7} r={4.4} />
          <circle cx={450.6} cy={338.0} r={4.4} />
          <circle cx={460} cy={321} r={3.8} />
          <circle cx={469} cy={321} r={3.8} />
          <circle cx={478} cy={321} r={3.8} />
          <circle cx={487} cy={321} r={3.8} />
          <circle cx={496} cy={321} r={3.8} />
          <circle cx={504} cy={321} r={3.8} />
          {/* elongated ears */}
          <path d="M450 340 C 441 344, 438 368, 441 393 C 442 402, 450 403, 452 394 L 452 350 Z" />
          <path d="M510 340 C 519 344, 522 368, 519 393 C 518 402, 510 403, 508 394 L 508 350 Z" />
          {/* neck */}
          <path d="M465 390 L 495 390 C 496 400, 497 408, 501 414 L 459 414 C 463 408, 464 400, 465 390 Z" />
          {/* robe: rounded sloping shoulders, elbows out, hands in lap */}
          <path d="M459 412 C 467 408, 493 408, 501 412 C 528 416, 546 432, 552 458 C 556 480, 562 510, 584 542 C 594 554, 588 566, 574 566 L 386 566 C 372 566, 366 554, 376 542 C 398 510, 404 480, 408 458 C 414 432, 432 416, 459 412 Z" />
          {/* crossed legs */}
          <path d="M328 596 C 350 566, 420 556, 480 556 C 540 556, 610 566, 632 596 C 612 606, 348 606, 328 596 Z" />
        </g>

        {/* ground + grass, cut from the page background */}
        <g data-part="grass" className="text-zen-bg" fill="currentColor">
          <path d="M0 620 L 0 560 C 200 520, 760 520, 960 560 L 960 620 Z" />
          {GRASS_BLADES.map((d) => (
            <path key={d} d={d} />
          ))}
          {CLOVERS.map((c) => (
            <Clover key={`${c.x}-${c.y}`} {...c} />
          ))}
        </g>
      </svg>
    </div>,
    host,
  )
}

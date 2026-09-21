'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const SRC = `${BASE_PATH}/buddha_background.jpg`

/**
 * Fixed, non-interactive photo behind /chat: a stone Buddha head, eyes
 * lowered, fading into the ink void. Rendered as a CSS background so it
 * covers the viewport at any aspect ratio; a radial vignette keeps the
 * message column readable and blends the photo edges into `bg-zen-bg`.
 *
 * Portalled to <body>: <main> animates a transform on mount, which would
 * otherwise make it the containing block and trap the fixed layer inside
 * the narrow column.
 */
export function BuddhaBackdrop() {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => setHost(document.body), [])

  if (!host) return null
  return createPortal(
    <div
      className="buddha-backdrop"
      style={{ backgroundImage: `url("${SRC}")` }}
      aria-hidden="true"
    />,
    host,
  )
}

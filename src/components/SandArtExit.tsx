'use client'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const EXIT_DURATION_MS = 1000

interface Props {
  visible: boolean
  onExited: () => void
  children: React.ReactNode
}

export function SandArtExit({ visible, onExited, children }: Props) {
  const reduced = useReducedMotion()
  const [exiting, setExiting] = useState(false)

  // Stabilise the callback ref so inline arrow functions passed by callers
  // never cause the effect to re-fire and schedule a second setTimeout.
  const onExitedRef = useRef(onExited)
  useEffect(() => {
    onExitedRef.current = onExited
  }, [onExited])

  useEffect(() => {
    if (visible) return
    setExiting(true)
    if (reduced) {
      const t = setTimeout(() => onExitedRef.current(), 0)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => onExitedRef.current(), EXIT_DURATION_MS)
    return () => clearTimeout(t)
  }, [visible, reduced])

  const style: React.CSSProperties = exiting && !reduced
    ? {
        opacity: 0,
        transform: 'scale(1.15)',
        filter: 'blur(8px)',
        transition: `opacity ${EXIT_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1), transform ${EXIT_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1), filter ${EXIT_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
        pointerEvents: 'none',
      }
    : exiting && reduced
    ? { opacity: 0, pointerEvents: 'none' }
    : {}

  return (
    <div style={style} data-testid="sand-art-exit" aria-hidden={exiting}>
      {children}
    </div>
  )
}

'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export type InkDropMode = 'live' | 'replay' | 'static'

export interface InkDropTextProps {
  text: string
  mode: InkDropMode
  skip?: boolean
  onComplete?: () => void
}

const PER_CHAR_DURATION_MS = 350
const TARGET_STAGGER_MS = 40
const MAX_TOTAL_MS = 6000

function computeStagger(length: number): number {
  if (length <= 1) return 0
  return Math.min(TARGET_STAGGER_MS, MAX_TOTAL_MS / length)
}

export function InkDropText({ text, mode, skip, onComplete }: InkDropTextProps) {
  const reduced = useReducedMotion()
  const completedRef = useRef(false)

  const stagger = useMemo(() => computeStagger(text.length), [text.length])
  const totalMs = useMemo(
    () => Math.ceil(stagger * Math.max(0, text.length - 1) + PER_CHAR_DURATION_MS),
    [stagger, text.length]
  )

  // onComplete behavior. Reduced-motion + static fire synchronously.
  // Live mode under normal motion fires after totalMs.
  useEffect(() => {
    if (completedRef.current) return
    if (mode === 'static') {
      completedRef.current = true
      onComplete?.()
      return
    }
    if (reduced) {
      completedRef.current = true
      onComplete?.()
      return
    }
    if (mode === 'live') {
      const t = setTimeout(() => {
        if (completedRef.current) return
        completedRef.current = true
        onComplete?.()
      }, totalMs)
      return () => clearTimeout(t)
    }
    // replay handled in T8
  }, [mode, reduced, totalMs, onComplete])

  // skip flip: snap and fire onComplete now.
  useEffect(() => {
    if (mode !== 'live' || !skip || completedRef.current) return
    completedRef.current = true
    onComplete?.()
  }, [skip, mode, onComplete])

  if (mode === 'static' || reduced) {
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
  }

  if (mode === 'live') {
    return (
      <p className="whitespace-pre-wrap leading-relaxed">
        {Array.from(text).map((ch, i) => (
          <span
            key={i}
            data-char={i}
            className={skip ? 'ink-char ink-char-skipped' : 'ink-char'}
            style={{ animationDelay: `${Math.round(i * stagger)}ms` }}
          >
            {ch}
          </span>
        ))}
      </p>
    )
  }

  // replay placeholder — implemented in T8
  return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
}

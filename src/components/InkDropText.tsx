'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
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

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const stagger = useMemo(() => computeStagger(text.length), [text.length])
  const totalMs = useMemo(
    () => Math.ceil(stagger * Math.max(0, text.length - 1) + PER_CHAR_DURATION_MS),
    [stagger, text.length]
  )

  useEffect(() => {
    if (completedRef.current) return
    if (mode === 'static') {
      completedRef.current = true
      onCompleteRef.current?.()
      return
    }
    if (reduced) {
      completedRef.current = true
      onCompleteRef.current?.()
      return
    }
    if (mode === 'live') {
      const t = setTimeout(() => {
        if (completedRef.current) return
        completedRef.current = true
        onCompleteRef.current?.()
      }, totalMs)
      return () => clearTimeout(t)
    }
    // replay: onComplete fires once intersection has triggered the bloom (handled below)
  }, [mode, reduced, totalMs])

  useEffect(() => {
    if (mode !== 'live' || !skip || completedRef.current) return
    completedRef.current = true
    onCompleteRef.current?.()
  }, [skip, mode])

  // ---- replay state ----
  const bloomRef = useRef<HTMLParagraphElement | null>(null)
  const [bloomed, setBloomed] = useState(false)

  useEffect(() => {
    if (mode !== 'replay' || reduced || bloomed) return
    const el = bloomRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (e?.isIntersecting) {
          setBloomed(true)
          observer.disconnect()
          if (!completedRef.current) {
            completedRef.current = true
            onCompleteRef.current?.()
          }
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [mode, reduced, bloomed])

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

  // replay
  return (
    <p
      ref={bloomRef}
      data-testid="ink-bloom"
      className={`whitespace-pre-wrap leading-relaxed ink-bloom${
        bloomed ? ' ink-bloom-show' : ''
      }`}
    >
      {text}
    </p>
  )
}

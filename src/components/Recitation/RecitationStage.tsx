'use client'
import type { CSSProperties } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { RecitationPhrase } from '@/lib/recitation'
import type { RecitationStatus } from '@/hooks/useRecitation'

export interface RecitationStageProps {
  current: RecitationPhrase | null
  recent: RecitationPhrase[]
  status: RecitationStatus
  onTap(): void
}

const PHRASE_BASE =
  'absolute left-0 right-0 text-center font-serif tracking-[0.35em] text-2xl sm:text-3xl text-zen-accent'

export function RecitationStage({ current, recent, status, onTap }: RecitationStageProps) {
  const reduced = useReducedMotion()
  const motionClass = reduced ? 'recite-fade' : 'recite-rise'
  const stack = current ? [...recent, current] : recent

  return (
    <div
      data-testid="recite-stage"
      role="button"
      tabIndex={0}
      aria-label={status === 'paused' ? '續' : '止'}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onTap()
        }
      }}
      className="relative min-h-[40vh] flex items-center justify-center select-none cursor-pointer"
    >
      <div className="relative w-full h-24" aria-live="polite" aria-atomic="true">
        {stack.map((phrase, i) => {
          const isCurrent = i === stack.length - 1 && current !== null
          if (isCurrent) {
            return (
              <p key={phrase.index} className={`${PHRASE_BASE} ${motionClass}`}>
                {phrase.text}
              </p>
            )
          }
          const depth = stack.length - 1 - i
          const style = { '--depth': String(depth) } as CSSProperties
          return (
            <p
              key={phrase.index}
              className={`${PHRASE_BASE} recite-linger${reduced ? ' recite-fade' : ''}`}
              style={style}
              aria-hidden="true"
            >
              {phrase.text}
            </p>
          )
        })}
      </div>
      {status === 'paused' && (
        <span className="absolute inset-0 flex items-center justify-center font-serif text-6xl text-zen-muted/40 pointer-events-none">
          止
        </span>
      )}
    </div>
  )
}

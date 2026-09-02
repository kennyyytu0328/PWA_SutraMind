'use client'
import { RECITATION_SPEEDS, type RecitationSpeed } from '@/lib/recitation'
import type { RecitationStatus } from '@/hooks/useRecitation'

export interface RecitationControlsProps {
  speed: RecitationSpeed
  status: RecitationStatus
  progress: number
  onSpeed(speed: RecitationSpeed): void
  onStart(): void
}

const SPEEDS = Object.keys(RECITATION_SPEEDS) as RecitationSpeed[]

export function RecitationControls({
  speed,
  status,
  progress,
  onSpeed,
  onStart,
}: RecitationControlsProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div role="radiogroup" aria-label="誦經速度" className="flex items-center gap-6">
        {SPEEDS.map((s) => {
          const active = s === speed
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSpeed(s)}
              className={`font-serif text-lg tracking-[0.3em] px-3 py-1 rounded-full ${
                active
                  ? 'text-zen-accent border border-zen-accent/60'
                  : 'text-zen-muted hover:text-zen-accent border border-transparent'
              }`}
            >
              {s}
            </button>
          )
        })}
      </div>

      {status === 'idle' && (
        <button type="button" onClick={onStart} className="zen-glow-button px-8 py-3 tracking-[0.3em]">
          開始
        </button>
      )}

      {(status === 'playing' || status === 'paused') && (
        <div className="w-full h-px bg-zen-surface" aria-hidden="true">
          <div
            data-testid="recite-progress"
            className="h-px bg-zen-accent/70 transition-[width] duration-700 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

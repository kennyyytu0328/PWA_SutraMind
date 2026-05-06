'use client'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const GLOW_BG =
  'radial-gradient(circle, rgba(201,169,97,0.55) 0%, rgba(201,169,97,0.05) 70%, transparent 100%)'

export function BreathingLoader() {
  const reduced = useReducedMotion()
  return (
    <div
      data-testid="breath-glow"
      aria-label="觀照中"
      role="status"
      className={
        reduced
          ? 'w-16 h-16 rounded-full opacity-70 scale-90'
          : 'w-16 h-16 rounded-full animate-breath-glow'
      }
      style={{ background: GLOW_BG }}
    />
  )
}

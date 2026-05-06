'use client'

export type InkDropMode = 'live' | 'replay' | 'static'

export interface InkDropTextProps {
  text: string
  mode: InkDropMode
  skip?: boolean
  onComplete?: () => void
}

export function InkDropText({ text, mode }: InkDropTextProps) {
  if (mode === 'static') {
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
  }
  // live and replay come in later tasks (T7, T8)
  return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
}

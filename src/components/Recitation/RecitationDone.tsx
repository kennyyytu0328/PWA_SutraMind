'use client'
import Link from 'next/link'
import { LotusGlyph } from '@/components/Lotus'

export interface RecitationDoneProps {
  onRestart(): void
}

export function RecitationDone({ onRestart }: RecitationDoneProps) {
  return (
    <div className="flex flex-col items-center gap-8 min-h-[40vh] justify-center">
      <LotusGlyph className="w-12 h-12" />
      <p className="font-serif text-2xl tracking-[0.5em] text-zen-text">一遍圓滿</p>
      <div className="flex items-center gap-6">
        <button type="button" onClick={onRestart} className="zen-glow-button px-6 py-3 tracking-[0.2em]">
          再誦一遍
        </button>
        <Link href="/categories" className="text-sm text-zen-muted hover:text-zen-accent">
          回到道場
        </Link>
      </div>
    </div>
  )
}

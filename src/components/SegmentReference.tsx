'use client'
import { useState } from 'react'
import sutraDB from '@/data/sutra-db.json'
import { getSegmentById } from '@/lib/sutra'
import { LotusGlyph } from './Lotus'
import type { SutraSegment } from '@/types/chat'

const db = sutraDB as SutraSegment[]

interface Props {
  ids: string[]
}

export function SegmentReference({ ids }: Props) {
  const [open, setOpen] = useState(false)
  const segments = ids.map((id) => getSegmentById(db, id)).filter(Boolean) as SutraSegment[]
  if (segments.length === 0) return null

  return (
    <div className="mt-3 text-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-zen-muted hover:text-zen-accent"
      >
        {open ? '▼' : '▶'} 引用：般若波羅蜜多心經 §
        {segments.map((s) => s.id.split('_')[1]).join(', ')}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-4">
          {segments.map((s) => (
            <div key={s.id} className="gold-frame px-8 py-7 text-center">
              <p className="font-serif text-zen-text text-xl tracking-[0.5em] leading-relaxed">
                {s.original}
              </p>
              <div className="h-px bg-zen-accent/40 mx-auto my-3" style={{ width: '60px' }} />
              <p className="text-zen-muted leading-relaxed">{s.vernacular}</p>
              <LotusGlyph className="w-9 h-9 mx-auto mt-4" />
              <p className="text-[10px] tracking-[2px] text-zen-muted/70 mt-1">
                SEGMENT {s.id.split('_')[1]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

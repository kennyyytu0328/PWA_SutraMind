'use client'
import { useState } from 'react'
import sutraDB from '@/data/sutra-db.json'
import { getSegmentById } from '@/lib/sutra'
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
            <div key={s.id} className="border-l-2 border-zen-accent/50 pl-4">
              <p className="font-serif text-zen-text">{s.original}</p>
              <p className="mt-2 text-zen-muted">{s.vernacular}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

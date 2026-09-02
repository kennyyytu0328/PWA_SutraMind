'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import sutraDb from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'
import { splitPhrases, SUTRA_TITLE } from '@/lib/recitation'
import { useRecitation } from '@/hooks/useRecitation'
import { RecitationStage } from '@/components/Recitation/RecitationStage'
import { RecitationControls } from '@/components/Recitation/RecitationControls'
import { RecitationDone } from '@/components/Recitation/RecitationDone'

const SUTRA_DB = sutraDb as SutraSegment[]

export default function RecitePage() {
  const phrases = useMemo(() => splitPhrases(SUTRA_DB), [])
  const r = useRecitation(phrases)

  return (
    <div className="flex flex-col gap-10">
      {r.status !== 'done' && (
        <Link href="/categories" className="self-start text-sm text-zen-muted hover:text-zen-accent">
          ← 回到道場
        </Link>
      )}

      {r.status === 'idle' && (
        <h2 className="text-center font-serif text-2xl tracking-[0.5em] text-zen-text">
          {SUTRA_TITLE}
        </h2>
      )}

      {r.status === 'done' && <RecitationDone onRestart={r.start} />}

      {(r.status === 'playing' || r.status === 'paused') && (
        <RecitationStage
          current={r.current}
          recent={r.recent}
          status={r.status}
          onTap={r.toggle}
        />
      )}

      {r.status !== 'done' && (
        <RecitationControls
          speed={r.speed}
          status={r.status}
          progress={r.progress}
          onSpeed={r.setSpeed}
          onStart={r.start}
        />
      )}
    </div>
  )
}

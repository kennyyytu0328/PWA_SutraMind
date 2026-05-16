'use client'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAnalytics } from '@/lib/db'
import { AttachmentIndex } from '@/components/MindMirror/AttachmentIndex'
import { RadarPanel } from '@/components/MindMirror/RadarPanel'
import { TrendPanel } from '@/components/MindMirror/TrendPanel'
import { EmptyMirror } from '@/components/MindMirror/EmptyMirror'
import { BreathingLoader } from '@/components/BreathingLoader'

function BackLink() {
  return (
    <Link
      href="/categories"
      className="self-start text-sm text-zen-muted hover:text-zen-accent"
    >
      ← 返回
    </Link>
  )
}

function MirrorHeader() {
  return (
    <header className="text-center">
      <h2 className="font-serif text-2xl text-zen-text tracking-widest">心鏡</h2>
      <p className="mt-2 text-zen-muted font-serif text-sm">
        映照本週執著之分布
      </p>
    </header>
  )
}

export default function MirrorPage() {
  const rows = useLiveQuery(() => listAnalytics(), [])

  if (rows === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <BreathingLoader />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        <BackLink />
        <MirrorHeader />
        <EmptyMirror />
      </div>
    )
  }

  const today = rows[rows.length - 1]
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
      <BackLink />
      <MirrorHeader />
      <AttachmentIndex row={today} />
      <RadarPanel rows={rows} />
      <TrendPanel rows={rows} />
    </div>
  )
}

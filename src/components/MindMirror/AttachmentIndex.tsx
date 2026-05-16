'use client'
import { attachmentIndex } from '@/lib/mirror-stats'
import type { DailyAnalytics } from '@/types/analytics'

interface Props {
  row: DailyAnalytics
}

export function AttachmentIndex({ row }: Props) {
  const idx = attachmentIndex(row.metrics)
  return (
    <section className="gold-frame p-6 text-center">
      <h3 className="text-sm tracking-widest text-zen-muted mb-3">
        今日執著指數
      </h3>
      <div className="font-serif">
        <span className="text-5xl text-zen-accent">{idx.toFixed(1)}</span>
        <span className="text-xl text-zen-muted ml-1">/ 10</span>
      </div>
      {row.mind_summary ? (
        <p className="mt-4 text-zen-text font-serif leading-relaxed">
          {row.mind_summary}
        </p>
      ) : null}
    </section>
  )
}

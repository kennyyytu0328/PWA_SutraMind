'use client'
import { attachmentIndex } from '@/lib/mirror-stats'
import { todayLocalISO } from '@/lib/date-utils'
import type { DailyAnalytics } from '@/types/analytics'

interface Props {
  row: DailyAnalytics
}

export function AttachmentIndex({ row }: Props) {
  const idx = attachmentIndex(row.metrics)
  const heading = row.date === todayLocalISO() ? '今日執著指數' : '近日執著指數'
  return (
    <section className="gold-frame p-6 text-center">
      <h3 className="text-sm tracking-widest text-zen-muted mb-3">
        {heading}
      </h3>
      <div className="font-serif">
        <span className="text-5xl text-zen-accent">{idx.toFixed(1)}</span>
        <span className="text-xl text-zen-muted ml-1">/ 10</span>
      </div>
      {row.mind_summary ? (
        <p className="mt-4 text-zen-text font-serif leading-loose tracking-[0.05em]">
          {row.mind_summary}
        </p>
      ) : null}
    </section>
  )
}

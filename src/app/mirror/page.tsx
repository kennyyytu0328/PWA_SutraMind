'use client'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { getMostRecentCompletedSessionToday, listAnalytics } from '@/lib/db'
import { todayLocalISO } from '@/lib/date-utils'
import { useApiKey } from '@/hooks/useApiKey'
import { AttachmentIndex } from '@/components/MindMirror/AttachmentIndex'
import { RadarPanel } from '@/components/MindMirror/RadarPanel'
import { TrendPanel } from '@/components/MindMirror/TrendPanel'
import { EmptyMirror } from '@/components/MindMirror/EmptyMirror'
import { DailyInsightCard } from '@/components/MindMirror/DailyInsightCard'
import { AnalyticsRetry } from '@/components/MindMirror/AnalyticsRetry'
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
  const todaysCompletedSession = useLiveQuery(
    () => getMostRecentCompletedSessionToday(),
    []
  )
  const { apiKey } = useApiKey()

  if (rows === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <BreathingLoader />
      </div>
    )
  }

  const todayIso = todayLocalISO()
  const hasTodayAnalytics = rows.some((r) => r.date === todayIso)
  const showRetry =
    !hasTodayAnalytics &&
    todaysCompletedSession != null &&
    todaysCompletedSession.id != null &&
    apiKey != null

  if (rows.length === 0 && !showRetry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        <BackLink />
        <MirrorHeader />
        <EmptyMirror />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
      <BackLink />
      <MirrorHeader />
      {showRetry && (
        <AnalyticsRetry
          sessionId={todaysCompletedSession!.id!}
          apiKey={apiKey!}
        />
      )}
      {rows.length > 0 && (
        <>
          <DailyInsightCard />
          <AttachmentIndex row={rows[rows.length - 1]} />
          <RadarPanel rows={rows} />
          <TrendPanel rows={rows} />
        </>
      )}
    </div>
  )
}

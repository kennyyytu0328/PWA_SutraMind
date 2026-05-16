'use client'
import { useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { attachmentIndex, last30Days } from '@/lib/mirror-stats'
import type { DailyAnalytics } from '@/types/analytics'

interface Props {
  rows: DailyAnalytics[]
}

function formatDateLabel(iso: string): string {
  // 'YYYY-MM-DD' → 'MM/DD'
  const [, mm, dd] = iso.split('-')
  return `${mm}/${dd}`
}

function ZenTooltip({ active, payload }: { active?: boolean; payload?: { payload?: { date?: string; value?: number } }[] }) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]?.payload
  if (!p) return null
  // Tailwind classes work here because this is a regular JSX element,
  // not a Recharts SVG prop.
  return (
    <div className="bg-zen-surface border border-zen-accent/60 px-3 py-2 font-serif text-sm text-zen-text">
      <div className="text-zen-muted text-xs">{p.date}</div>
      <div>執著指數 {p.value?.toFixed(1)}</div>
    </div>
  )
}

export function TrendPanel({ rows }: Props) {
  const firstMountRef = useRef(true)
  const reduce = useReducedMotion()

  if (firstMountRef.current) {
    queueMicrotask(() => {
      firstMountRef.current = false
    })
  }

  if (rows.length < 3) {
    return (
      <section className="gold-frame p-6 text-center">
        <h3 className="text-sm tracking-widest text-zen-muted mb-3">空性趨勢</h3>
        <p className="font-serif text-zen-muted">累積至 3 日方可觀照趨勢</p>
      </section>
    )
  }

  const data = last30Days(rows).map((r) => ({
    date: r.date,
    label: formatDateLabel(r.date),
    value: attachmentIndex(r.metrics),
  }))

  return (
    <section className="gold-frame p-6">
      <h3 className="text-sm tracking-widest text-zen-muted mb-4">空性趨勢</h3>
      {/* Hex values mirror tailwind.config.ts theme.extend.colors.zen.
          Keep in sync with RadarPanel and the Tailwind palette. */}
      <div className="w-full" style={{ height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
            <CartesianGrid stroke="#8A8079" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#EAE0D5', fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fill: '#EAE0D5', fontSize: 11 }}
            />
            <Tooltip content={<ZenTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#C9A961"
              strokeWidth={2}
              dot={{ r: 3, fill: '#C9A961' }}
              isAnimationActive={!reduce && firstMountRef.current}
              animationDuration={reduce ? 0 : 800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-zen-muted font-serif text-center">
        執著漸消，度一切苦厄
      </p>
    </section>
  )
}

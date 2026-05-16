'use client'
// Color hex values below mirror tailwind.config.ts theme.extend.colors.zen
// (accent #C9A961, muted #8A8079, text #EAE0D5). Recharts SVG props need
// real color strings — Tailwind classes won't apply. Keep these in sync
// when the palette changes.
import { useRef, useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { aggregateMetricsMax, last7Days } from '@/lib/mirror-stats'
import type { DailyAnalytics, EmotionMetrics } from '@/types/analytics'

interface Props {
  rows: DailyAnalytics[]
}

const DIMENSION_LABELS: Record<keyof EmotionMetrics, string> = {
  work_anxiety: '職場焦慮',
  relationship_clinging: '關係執著',
  existential_emptiness: '存在虛無',
  health_fear: '健康恐懼',
  acute_emotion: '突發情緒',
}

type Mode = 'today' | 'week'

export function RadarPanel({ rows }: Props) {
  const [mode, setMode] = useState<Mode>('today')
  const firstMountRef = useRef(true)
  const reduce = useReducedMotion()

  if (firstMountRef.current) {
    // flips after first commit; checked synchronously on subsequent renders
    queueMicrotask(() => {
      firstMountRef.current = false
    })
  }

  const today = rows[rows.length - 1]
  const metrics: EmotionMetrics =
    mode === 'today' ? today.metrics : aggregateMetricsMax(last7Days(rows))

  const chartData = (Object.keys(DIMENSION_LABELS) as (keyof EmotionMetrics)[]).map(
    (dim) => ({
      dimension: DIMENSION_LABELS[dim],
      value: metrics[dim],
    })
  )

  return (
    <section className="gold-frame p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm tracking-widest text-zen-muted">五維執著分布</h3>
        <div className="text-xs flex gap-3">
          <button
            type="button"
            onClick={() => setMode('today')}
            className={
              mode === 'today'
                ? 'text-zen-accent'
                : 'text-zen-muted hover:text-zen-accent'
            }
          >
            今日
          </button>
          <button
            type="button"
            onClick={() => setMode('week')}
            className={
              mode === 'week'
                ? 'text-zen-accent'
                : 'text-zen-muted hover:text-zen-accent'
            }
          >
            7日
          </button>
        </div>
      </div>
      <div className="w-full" style={{ height: 280 }}>
        <ResponsiveContainer>
          <RadarChart data={chartData} outerRadius="75%">
            <PolarGrid stroke="#8A8079" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#EAE0D5', fontSize: 12 }}
            />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#C9A961"
              fill="#C9A961"
              fillOpacity={0.3}
              isAnimationActive={!reduce && firstMountRef.current}
              animationDuration={reduce ? 0 : 800}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

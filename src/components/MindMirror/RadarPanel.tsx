'use client'
import { useEffect, useRef, useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useDeferredMount } from '@/hooks/useDeferredMount'
import { aggregateMetricsMax, last7Days } from '@/lib/mirror-stats'
import { DIMENSION_LABELS } from '@/lib/analytics-labels'
import { ZEN_ACCENT, ZEN_MUTED, ZEN_TEXT } from '@/lib/mirror-colors'
import type { DailyAnalytics, EmotionMetrics } from '@/types/analytics'

interface Props {
  rows: DailyAnalytics[]
}

type Mode = 'today' | 'week'

export function RadarPanel({ rows }: Props) {
  const [mode, setMode] = useState<Mode>('today')
  const firstMountRef = useRef(true)
  const reduce = useReducedMotion()
  const chartReady = useDeferredMount()

  // Flip first-mount flag only after the chart has actually mounted at
  // least once (ready === true). Otherwise the deferred-mount delay
  // would cause the chart to miss its intro animation.
  useEffect(() => {
    if (chartReady) firstMountRef.current = false
  }, [chartReady])

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
        {chartReady && (
        <ResponsiveContainer minWidth={0}>
          <RadarChart data={chartData} outerRadius="75%">
            <PolarGrid stroke={ZEN_MUTED} strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: ZEN_TEXT, fontSize: 12 }}
            />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke={ZEN_ACCENT}
              strokeWidth={1.5}
              fill={ZEN_ACCENT}
              fillOpacity={0.55}
              dot={{ r: 2.5, fill: ZEN_ACCENT, stroke: ZEN_ACCENT }}
              isAnimationActive={!reduce && firstMountRef.current}
              animationDuration={reduce ? 0 : 800}
            />
          </RadarChart>
        </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

'use client'
import { useDailyInsight } from '@/hooks/useDailyInsight'
import { LotusGlyph } from '@/components/Lotus'
import { BreathingLoader } from '@/components/BreathingLoader'
import { InkDropText } from '@/components/InkDropText'
import { ZEN_ACCENT } from '@/lib/mirror-colors'

export function DailyInsightCard() {
  const { status, insight, segment, error, request, isFirstReveal } = useDailyInsight()

  return (
    <section
      role="region"
      aria-labelledby="daily-insight-title"
      className="gold-frame p-6 text-center flex flex-col items-center gap-4"
    >
      <LotusGlyph className="w-8 h-8" />
      <h2
        id="daily-insight-title"
        className="text-sm tracking-widest text-zen-muted"
      >
        今日靜觀
      </h2>

      {status === 'empty' && (
        <div className="text-zen-muted font-serif text-sm leading-relaxed">
          <p>尚無近日紀錄</p>
          <p>先在道場中對話，明日再來</p>
        </div>
      )}

      {(status === 'ready' || status === 'error') && (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={request}
            className="border border-zen-accent/60 text-zen-accent px-5 py-2 text-sm tracking-widest hover:bg-zen-accent/10 transition-colors"
          >
            請示今日靜觀
          </button>
          {error && error.kind === 'AUTH_FAILED' ? (
            <p className="text-xs text-zen-muted">
              {error.message}（
              <a href="/setup" className="underline hover:text-zen-accent">前往設定</a>
              ）
            </p>
          ) : error ? (
            <p className="text-xs text-zen-muted">{error.message}</p>
          ) : null}
        </div>
      )}

      {status === 'requesting' && (
        <div aria-live="polite">
          <BreathingLoader />
        </div>
      )}

      {status === 'shown' && insight && segment && (
        <div className="flex flex-col items-center gap-4 max-w-md">
          <p className="font-serif tracking-[0.5em] text-zen-text leading-loose">
            {segment.original}
          </p>
          <hr
            className="border-0 h-px w-[60px]"
            style={{ backgroundColor: ZEN_ACCENT, opacity: 0.4 }}
          />
          <div
            className="text-zen-text leading-relaxed"
            aria-live={isFirstReveal ? 'polite' : undefined}
          >
            <InkDropText
              text={insight.reflection}
              mode={isFirstReveal ? 'live' : 'static'}
            />
          </div>
          <LotusGlyph className="w-4 h-4 opacity-50" />
        </div>
      )}
    </section>
  )
}

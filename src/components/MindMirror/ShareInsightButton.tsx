'use client'
import { useState } from 'react'
import { renderInsightCard } from '@/lib/share-card'
import { shareOrDownloadImage } from '@/lib/share-image'
import { todayLocalISO } from '@/lib/date-utils'
import { BreathingLoader } from '@/components/BreathingLoader'

interface Props {
  sutraOriginal: string
  reflection: string
}

type State = 'idle' | 'rendering' | 'preview' | 'error'

export function ShareInsightButton({ sutraOriginal, reflection }: Props) {
  const [state, setState] = useState<State>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)

  async function handleGenerate() {
    setState('rendering')
    try {
      const b = await renderInsightCard({ sutraOriginal, reflection })
      setBlob(b)
      setImageUrl(URL.createObjectURL(b))
      setState('preview')
    } catch (err) {
      console.warn('[share] render failed', err)
      setState('error')
    }
  }

  async function handleShare() {
    if (!blob) return
    try {
      await shareOrDownloadImage(
        blob,
        `sutramind-insight-${todayLocalISO()}.png`,
        { title: '今日靜觀 · 心經數位道場', text: '與心經對坐片刻。' }
      )
    } catch (err) {
      console.warn('[share] share failed', err)
      setState('error')
    }
  }

  function handleClose() {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setBlob(null)
    setState('idle')
  }

  if (state === 'rendering') {
    return (
      <div className="mt-1" aria-live="polite">
        <BreathingLoader />
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleGenerate}
        className="border border-zen-accent/60 text-zen-accent px-5 py-2 text-sm tracking-widest hover:bg-zen-accent/10"
      >
        分享此刻
      </button>

      {state === 'error' && (
        <p className="mt-1 text-xs text-zen-muted">生成失敗，再試一次。</p>
      )}

      {state === 'preview' && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={handleClose}
        >
          <div
            className="flex flex-col items-center gap-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt="今日靜觀分享卡片"
              className="w-full rounded-md shadow-2xl"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="zen-glow-button px-6 py-3"
              >
                分享
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="border border-zen-muted/30 text-zen-muted px-6 py-3 rounded-md hover:border-zen-accent hover:text-zen-accent"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

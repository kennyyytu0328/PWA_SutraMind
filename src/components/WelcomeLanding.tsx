'use client'
import Link from 'next/link'
import { LotusGlyph } from '@/components/Lotus'

export function WelcomeLanding() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center gap-10 text-center">
      <LotusGlyph className="w-16 h-16" />
      <div className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl tracking-[0.1em] leading-relaxed">
          心有罣礙時，與心經對坐片刻。
        </h2>
        <p className="text-zen-muted leading-loose tracking-[0.05em]">
          這裡沒有評分，沒有進度，只有一段陪你照見當下的對話。
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link
          href="/preview"
          className="border border-zen-accent/60 text-zen-accent px-6 py-3 rounded-md text-center tracking-widest hover:bg-zen-accent/10"
        >
          預覽體驗
        </Link>
        <Link href="/setup" className="zen-glow-button px-6 py-3 text-center">
          開始
        </Link>
      </div>
    </div>
  )
}

'use client'
import Link from 'next/link'

interface Props {
  onSeeOthers: () => void
}

export function PreviewClosing({ onSeeOthers }: Props) {
  return (
    <section className="gold-frame p-6 text-center flex flex-col gap-5">
      <p className="text-zen-muted leading-loose tracking-[0.05em]">
        這是一段預先擬好的對話。當你準備好，便能與心經，展開屬於你自己的對坐。
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/setup" className="zen-glow-button px-6 py-3 text-center">
          開始你的對話
        </Link>
        <button
          type="button"
          onClick={onSeeOthers}
          className="border border-zen-muted/30 text-zen-muted px-6 py-3 rounded-md tracking-widest hover:border-zen-accent hover:text-zen-accent"
        >
          看看其他困境
        </button>
      </div>
    </section>
  )
}

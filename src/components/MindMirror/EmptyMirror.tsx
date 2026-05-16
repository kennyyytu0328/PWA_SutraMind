'use client'
import Link from 'next/link'
import { LotusGlyph } from '@/components/Lotus'

export function EmptyMirror() {
  return (
    <section className="gold-frame p-10 text-center flex flex-col items-center gap-6">
      <LotusGlyph className="w-16 h-16 text-zen-accent" />
      <p className="font-serif text-lg text-zen-text leading-relaxed max-w-sm">
        心鏡未起。<br />
        請先安住於對話，讓執著浮現。
      </p>
      <Link
        href="/categories"
        className="font-serif text-sm text-zen-accent hover:text-zen-text border border-zen-accent/60 px-5 py-2"
      >
        前往揀擇煩惱
      </Link>
    </section>
  )
}

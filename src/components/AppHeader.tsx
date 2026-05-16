import Link from 'next/link'
import { LotusGlyph } from './Lotus'
import { AmbientAudio } from './AmbientAudio'

export function AppHeader() {
  return (
    <header className="flex items-center gap-3 px-6 py-5 border-b border-zen-accent/25">
      <LotusGlyph className="w-7 h-7" />
      <h1 className="font-serif text-xl tracking-[0.25em] text-zen-text">
        心經數位道場
      </h1>
      <nav className="ml-auto flex items-center gap-5 font-serif text-sm text-zen-muted">
        <Link href="/mirror" className="hover:text-zen-accent">心鏡</Link>
        <Link href="/history" className="hover:text-zen-accent">歷史</Link>
      </nav>
      <AmbientAudio />
    </header>
  )
}

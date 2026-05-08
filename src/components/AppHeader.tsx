import { LotusGlyph } from './Lotus'
import { AmbientAudio } from './AmbientAudio'

export function AppHeader() {
  return (
    <header className="flex items-center gap-3 px-6 py-5 border-b border-zen-accent/25">
      <LotusGlyph className="w-7 h-7" />
      <h1 className="font-serif text-xl tracking-[0.25em] text-zen-text">
        心經數位道場
      </h1>
      <AmbientAudio />
    </header>
  )
}

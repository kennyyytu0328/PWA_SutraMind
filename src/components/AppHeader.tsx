import { LotusGlyph } from './Lotus'
import { AmbientAudio } from './AmbientAudio'

export function AppHeader() {
  return (
    <header className="relative">
      <div className="flex items-center gap-3 px-6 py-5">
        <span
          className="relative inline-flex items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="absolute inset-0 -m-2 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(201,169,97,0.22) 0%, rgba(201,169,97,0) 70%)',
            }}
          />
          <LotusGlyph className="relative w-7 h-7" />
        </span>
        <h1 className="font-serif text-xl tracking-[0.25em] text-zen-text">
          心經數位道場
        </h1>
        <AmbientAudio />
      </div>
      <div className="zen-hairline" />
    </header>
  )
}

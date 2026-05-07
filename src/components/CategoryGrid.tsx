'use client'
import { CATEGORIES } from '@/lib/categories'
import { LotusGlyph } from './Lotus'
import type { CategoryId } from '@/types/chat'

interface Props {
  onSelect: (id: CategoryId) => void
}

export function CategoryGrid({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="gold-frame text-left p-6 hover:border-zen-accent transition flex items-start gap-3"
        >
          <LotusGlyph className="w-5 h-5 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-serif text-xl tracking-wider">{c.label}</h3>
            <p className="mt-2 text-sm text-zen-muted">
              {c.presets.join('、')}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}

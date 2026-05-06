'use client'
import { CATEGORIES } from '@/lib/categories'
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
          disabled={!c.enabled}
          onClick={() => onSelect(c.id)}
          className={`text-left p-6 rounded-lg border transition
            ${c.enabled
              ? 'bg-zen-surface border-zen-muted/30 hover:border-zen-accent cursor-pointer'
              : 'bg-zen-surface/40 border-zen-muted/10 opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl">{c.label}</h3>
            {!c.enabled && (
              <span className="text-xs text-zen-muted">即將開放</span>
            )}
          </div>
          <p className="mt-2 text-sm text-zen-muted">
            {c.presets.join('、')}
          </p>
        </button>
      ))}
    </div>
  )
}

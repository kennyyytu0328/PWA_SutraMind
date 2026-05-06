import type { RoundNumber } from '@/types/chat'

interface Props {
  current: RoundNumber
  completed: number
}

export function RoundIndicator({ current, completed }: Props) {
  return (
    <div className="flex items-center gap-3 text-sm text-zen-muted">
      <span>第 {Math.min(current, 3)} / 3 輪</span>
      <span className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${
              i <= completed ? 'bg-zen-accent' : 'bg-zen-muted/30'
            }`}
          />
        ))}
      </span>
    </div>
  )
}

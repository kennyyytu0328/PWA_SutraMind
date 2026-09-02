# Sutra Recitation (誦經) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/recite` page that surfaces the Heart Sutra one phrase at a time at an adjustable chant cadence so users can recite the full text without memorising it.

**Architecture:** A pure splitter/duration module (`lib/recitation.ts`) feeds a `useRecitation` reducer+timer hook; three presentational components under `components/Recitation/` render the rising-mist stage, controls, and done state. No persistence, no network.

**Tech Stack:** Next.js 14 App Router (static export), React 18, TypeScript 5, Tailwind 3 + `globals.css` keyframes, Vitest + jsdom + `@testing-library/react`.

**Spec:** `docs/superpowers/specs/2026-09-02-sutra-recitation-design.md`

## Global Constraints

- Zen vocabulary copy exactly as spec §4: 開始 / 止 / 緩 中 疾 / 一遍圓滿 / 再誦一遍 / 回到道場 / 誦經 →.
- `src/data/sutra-db.json` is read only; never modified.
- No network, no Gemini call, no Dexie access anywhere in this feature.
- No `window.confirm` / `alert`; no Framer Motion (pure CSS keyframes like the other zen animations).
- All animation honors `useReducedMotion()` from `src/hooks/useReducedMotion.ts`.
- Immutability: reducer returns new objects; no in-place mutation.
- Use `zen-*` palette tokens; no new raw hex outside `Lotus.tsx`.
- Page-level title is `<h2>` (the global `<h1>` is in `AppHeader`).
- Tests: `pnpm test` (Vitest, jsdom, globals on, `@` → `src`). Type-check: `pnpm exec tsc --noEmit`. Build: `pnpm build` then `pnpm clean` afterwards (never leave a build `.next` for `pnpm dev`).
- Commit messages: `<type>: <description>`; end with the Co-Authored-By / Claude-Session trailer used in this session.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/lib/recitation.ts` (new) | Pure: `splitPhrases`, `phraseDurationMs`, `RECITATION_SPEEDS`, `SUTRA_TITLE`, types |
| `src/hooks/useRecitation.ts` (new) | Reducer + single timer + visibility pause; exposes `RecitationApi` |
| `src/components/Recitation/RecitationStage.tsx` (new) | Rising-mist phrase stack + paused overlay + tap |
| `src/components/Recitation/RecitationControls.tsx` (new) | Speed radiogroup + start button + progress hairline |
| `src/components/Recitation/RecitationDone.tsx` (new) | Lotus + 一遍圓滿 + 再誦一遍 / 回到道場 |
| `src/styles/globals.css` (modify, append) | `recite-rise`, `recite-linger`, `recite-fade` |
| `src/app/recite/page.tsx` (new) | Thin composition |
| `src/app/categories/page.tsx` (modify) | Add `誦經 →` nav link |
| `tests/recitation.test.ts`, `tests/useRecitation.test.tsx`, `tests/RecitationStage.test.tsx` (new) | Unit tests |
| `CLAUDE.md`, `TODO.md` (modify) | Record shipped feature |

---

### Task 1: Pure phrase splitter and duration

**Files:**
- Create: `src/lib/recitation.ts`
- Test: `tests/recitation.test.ts`

**Interfaces:**
- Consumes: `SutraSegment` from `@/types/chat`.
- Produces:
  ```ts
  export type RecitationSpeed = '緩' | '中' | '疾'
  export const RECITATION_SPEEDS: Record<RecitationSpeed, { baseMs: number; perCharMs: number }>
  export const SUTRA_TITLE = '般若波羅蜜多心經'
  export interface RecitationPhrase { index: number; text: string; segmentId: string }
  export function splitPhrases(segments: SutraSegment[]): RecitationPhrase[]
  export function phraseDurationMs(phrase: RecitationPhrase, speed: RecitationSpeed): number
  ```

- [ ] **Step 1: Write the failing test**

`tests/recitation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import sutraDb from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'
import {
  splitPhrases,
  phraseDurationMs,
  RECITATION_SPEEDS,
  SUTRA_TITLE,
} from '@/lib/recitation'

const SEGMENTS = sutraDb as SutraSegment[]

const mini: SutraSegment[] = [
  {
    id: 'segment_1',
    original: '觀自在菩薩，行深般若波羅蜜多時，照見五蘊皆空，度一切苦厄。',
    vernacular: '',
    keywords: [],
    therapeutic_focus: '',
  },
  {
    id: 'segment_9',
    original: '揭諦揭諦，波羅揭諦，波羅僧揭諦，菩提薩婆訶。',
    vernacular: '',
    keywords: [],
    therapeutic_focus: '',
  },
]

describe('splitPhrases', () => {
  it('prepends the title as phrase 0 with segmentId "title"', () => {
    const phrases = splitPhrases(mini)
    expect(phrases[0]).toEqual({ index: 0, text: SUTRA_TITLE, segmentId: 'title' })
  })

  it('splits on ，、；。！ keeping punctuation attached to the phrase end', () => {
    const texts = splitPhrases(mini).map((p) => p.text)
    expect(texts).toEqual([
      SUTRA_TITLE,
      '觀自在菩薩，',
      '行深般若波羅蜜多時，',
      '照見五蘊皆空，',
      '度一切苦厄。',
      '揭諦揭諦，',
      '波羅揭諦，',
      '波羅僧揭諦，',
      '菩提薩婆訶。',
    ])
  })

  it('assigns sequential indices and the source segmentId', () => {
    const phrases = splitPhrases(mini)
    expect(phrases.map((p) => p.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(phrases[1].segmentId).toBe('segment_1')
    expect(phrases[5].segmentId).toBe('segment_9')
  })

  it('handles ！ and drops empty fragments', () => {
    const phrases = splitPhrases([
      { id: 's', original: '舍利子！ 色不異空。 ', vernacular: '', keywords: [], therapeutic_focus: '' },
    ])
    expect(phrases.map((p) => p.text)).toEqual([SUTRA_TITLE, '舍利子！', '色不異空。'])
  })

  it('returns only the title for an empty segment list', () => {
    expect(splitPhrases([])).toHaveLength(1)
  })

  it('produces a stable phrase count for the real sutra', () => {
    const phrases = splitPhrases(SEGMENTS)
    expect(phrases.length).toBeGreaterThan(40)
    expect(phrases.length).toBeLessThan(70)
    expect(phrases.every((p) => p.text.trim().length > 0)).toBe(true)
  })
})

describe('phraseDurationMs', () => {
  const phrase = { index: 1, text: '觀自在菩薩，', segmentId: 'segment_1' }

  it('uses baseMs + perCharMs × chars, excluding punctuation', () => {
    expect(phraseDurationMs(phrase, '中')).toBe(1600 + 120 * 5)
    expect(phraseDurationMs(phrase, '緩')).toBe(2200 + 180 * 5)
    expect(phraseDurationMs(phrase, '疾')).toBe(1000 + 80 * 5)
  })

  it('exposes the three speeds', () => {
    expect(Object.keys(RECITATION_SPEEDS)).toEqual(['緩', '中', '疾'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/recitation.test.ts`
Expected: FAIL — cannot resolve `@/lib/recitation`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/recitation.ts`:

```ts
import type { SutraSegment } from '@/types/chat'

export type RecitationSpeed = '緩' | '中' | '疾'

export const RECITATION_SPEEDS: Record<
  RecitationSpeed,
  { baseMs: number; perCharMs: number }
> = {
  緩: { baseMs: 2200, perCharMs: 180 },
  中: { baseMs: 1600, perCharMs: 120 },
  疾: { baseMs: 1000, perCharMs: 80 },
}

export const SUTRA_TITLE = '般若波羅蜜多心經'

export interface RecitationPhrase {
  index: number
  text: string
  segmentId: string
}

const PUNCTUATION = /[，、；。！]/g
// Split *after* each punctuation mark so it stays attached to the phrase.
const SPLIT_AFTER = /(?<=[，、；。！])/

function splitSegment(segment: SutraSegment): Array<Omit<RecitationPhrase, 'index'>> {
  return segment.original
    .split(SPLIT_AFTER)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((text) => ({ text, segmentId: segment.id }))
}

export function splitPhrases(segments: SutraSegment[]): RecitationPhrase[] {
  const body = segments.flatMap(splitSegment)
  return [{ text: SUTRA_TITLE, segmentId: 'title' }, ...body].map((p, index) => ({
    ...p,
    index,
  }))
}

export function phraseDurationMs(
  phrase: RecitationPhrase,
  speed: RecitationSpeed
): number {
  const { baseMs, perCharMs } = RECITATION_SPEEDS[speed]
  const chars = phrase.text.replace(PUNCTUATION, '').length
  return baseMs + perCharMs * chars
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/recitation.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/recitation.ts tests/recitation.test.ts
git commit -m "feat(recite): pure phrase splitter + duration model"
```

---

### Task 2: `useRecitation` hook

**Files:**
- Create: `src/hooks/useRecitation.ts`
- Test: `tests/useRecitation.test.tsx`

**Interfaces:**
- Consumes: `RecitationPhrase`, `RecitationSpeed`, `phraseDurationMs` from `@/lib/recitation`.
- Produces:
  ```ts
  export type RecitationStatus = 'idle' | 'playing' | 'paused' | 'done'
  export interface RecitationApi {
    index: number
    status: RecitationStatus
    speed: RecitationSpeed
    current: RecitationPhrase | null   // null when idle or done
    recent: RecitationPhrase[]         // up to 2 before current, oldest first
    progress: number                   // 0..1, (index+1)/length while playing/paused; 1 when done; 0 when idle
    start(): void
    toggle(): void
    setSpeed(speed: RecitationSpeed): void
  }
  export function useRecitation(phrases: RecitationPhrase[]): RecitationApi
  ```

- [ ] **Step 1: Write the failing test**

`tests/useRecitation.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecitation } from '@/hooks/useRecitation'
import { phraseDurationMs, type RecitationPhrase } from '@/lib/recitation'

const phrases: RecitationPhrase[] = [
  { index: 0, text: '般若波羅蜜多心經', segmentId: 'title' },
  { index: 1, text: '觀自在菩薩，', segmentId: 'segment_1' },
  { index: 2, text: '行深般若波羅蜜多時，', segmentId: 'segment_1' },
  { index: 3, text: '度一切苦厄。', segmentId: 'segment_1' },
]

const d = (i: number, speed: '緩' | '中' | '疾' = '中') =>
  phraseDurationMs(phrases[i], speed)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useRecitation', () => {
  it('starts idle with no current phrase and speed 中', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    expect(result.current.status).toBe('idle')
    expect(result.current.current).toBeNull()
    expect(result.current.speed).toBe('中')
    expect(result.current.progress).toBe(0)
  })

  it('start() plays from index 0 and advances after the phrase duration', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    expect(result.current.status).toBe('playing')
    expect(result.current.current?.index).toBe(0)

    act(() => vi.advanceTimersByTime(d(0) - 1))
    expect(result.current.index).toBe(0)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(1)
  })

  it('toggle() pauses (no advance) and resumes', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    act(() => result.current.toggle())
    expect(result.current.status).toBe('paused')
    act(() => vi.advanceTimersByTime(d(0) * 3))
    expect(result.current.index).toBe(0)

    act(() => result.current.toggle())
    expect(result.current.status).toBe('playing')
    act(() => vi.advanceTimersByTime(d(0)))
    expect(result.current.index).toBe(1)
  })

  it('toggle() is a no-op when idle', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.toggle())
    expect(result.current.status).toBe('idle')
  })

  it('setSpeed mid-phrase reschedules using the new duration', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.setSpeed('疾'))
    expect(result.current.speed).toBe('疾')
    act(() => vi.advanceTimersByTime(d(0, '疾') - 1))
    expect(result.current.index).toBe(0)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(1)
  })

  it('reaches done after the last phrase and start() restarts at 0', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    for (let i = 0; i < phrases.length; i++) {
      act(() => vi.advanceTimersByTime(d(i)))
    }
    expect(result.current.status).toBe('done')
    expect(result.current.current).toBeNull()
    expect(result.current.progress).toBe(1)

    act(() => result.current.start())
    expect(result.current.status).toBe('playing')
    expect(result.current.index).toBe(0)
  })

  it('recent holds at most the 2 previous phrases, oldest first', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    expect(result.current.recent).toEqual([])
    act(() => vi.advanceTimersByTime(d(0)))
    expect(result.current.recent.map((p) => p.index)).toEqual([0])
    act(() => vi.advanceTimersByTime(d(1)))
    act(() => vi.advanceTimersByTime(d(2)))
    expect(result.current.index).toBe(3)
    expect(result.current.recent.map((p) => p.index)).toEqual([1, 2])
  })

  it('pauses when the document becomes hidden', () => {
    const { result } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    const hiddenSpy = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.status).toBe('paused')
    hiddenSpy.mockRestore()
  })

  it('clears the timer on unmount', () => {
    const { result, unmount } = renderHook(() => useRecitation(phrases))
    act(() => result.current.start())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/useRecitation.test.tsx`
Expected: FAIL — cannot resolve `@/hooks/useRecitation`.

- [ ] **Step 3: Write minimal implementation**

`src/hooks/useRecitation.ts`:

```ts
'use client'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  phraseDurationMs,
  type RecitationPhrase,
  type RecitationSpeed,
} from '@/lib/recitation'

export type RecitationStatus = 'idle' | 'playing' | 'paused' | 'done'

interface RecitationState {
  index: number
  status: RecitationStatus
  speed: RecitationSpeed
}

type Action =
  | { type: 'start' }
  | { type: 'toggle' }
  | { type: 'pause' }
  | { type: 'advance'; total: number }
  | { type: 'setSpeed'; speed: RecitationSpeed }

const INITIAL: RecitationState = { index: 0, status: 'idle', speed: '中' }

function reducer(state: RecitationState, action: Action): RecitationState {
  switch (action.type) {
    case 'start':
      return { ...state, index: 0, status: 'playing' }
    case 'toggle':
      if (state.status === 'playing') return { ...state, status: 'paused' }
      if (state.status === 'paused') return { ...state, status: 'playing' }
      return state
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state
    case 'advance':
      if (state.status !== 'playing') return state
      return state.index + 1 < action.total
        ? { ...state, index: state.index + 1 }
        : { ...state, status: 'done' }
    case 'setSpeed':
      return { ...state, speed: action.speed }
  }
}

export interface RecitationApi extends RecitationState {
  current: RecitationPhrase | null
  recent: RecitationPhrase[]
  progress: number
  start(): void
  toggle(): void
  setSpeed(speed: RecitationSpeed): void
}

export function useRecitation(phrases: RecitationPhrase[]): RecitationApi {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = phrases.length

  // Single live timer, rescheduled whenever status / index / speed change.
  useEffect(() => {
    if (state.status !== 'playing') return
    const phrase = phrases[state.index]
    if (!phrase) return
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      dispatch({ type: 'advance', total })
    }, phraseDurationMs(phrase, state.speed))
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [state.status, state.index, state.speed, phrases, total])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: 'pause' })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const start = useCallback(() => dispatch({ type: 'start' }), [])
  const toggle = useCallback(() => dispatch({ type: 'toggle' }), [])
  const setSpeed = useCallback(
    (speed: RecitationSpeed) => dispatch({ type: 'setSpeed', speed }),
    []
  )

  const active = state.status === 'playing' || state.status === 'paused'
  const current = active ? phrases[state.index] ?? null : null
  const recent = useMemo(
    () => (active ? phrases.slice(Math.max(0, state.index - 2), state.index) : []),
    [active, phrases, state.index]
  )
  const progress =
    state.status === 'done' ? 1 : active && total > 0 ? (state.index + 1) / total : 0

  return { ...state, current, recent, progress, start, toggle, setSpeed }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/useRecitation.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRecitation.ts tests/useRecitation.test.tsx
git commit -m "feat(recite): useRecitation reducer + timer hook"
```

---

### Task 3: Rising-mist CSS + `RecitationStage`

**Files:**
- Modify: `src/styles/globals.css` (append after the `ink-bloom-in` block, around line 200)
- Create: `src/components/Recitation/RecitationStage.tsx`
- Test: `tests/RecitationStage.test.tsx`

**Interfaces:**
- Consumes: `RecitationPhrase` from `@/lib/recitation`; `RecitationStatus` from `@/hooks/useRecitation`; `useReducedMotion`.
- Produces:
  ```ts
  export interface RecitationStageProps {
    current: RecitationPhrase | null
    recent: RecitationPhrase[]
    status: RecitationStatus
    onTap(): void
  }
  export function RecitationStage(props: RecitationStageProps): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

`tests/RecitationStage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecitationStage } from '@/components/Recitation/RecitationStage'

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false }))

const p = (index: number, text: string) => ({ index, text, segmentId: 'segment_1' })

describe('RecitationStage', () => {
  it('renders the current phrase with the rise class and recent phrases with linger depth', () => {
    render(
      <RecitationStage
        current={p(3, '度一切苦厄。')}
        recent={[p(1, '觀自在菩薩，'), p(2, '行深般若波羅蜜多時，')]}
        status="playing"
        onTap={() => {}}
      />
    )
    const current = screen.getByText('度一切苦厄。')
    expect(current.className).toContain('recite-rise')
    const oldest = screen.getByText('觀自在菩薩，')
    expect(oldest.className).toContain('recite-linger')
    expect(oldest.style.getPropertyValue('--depth')).toBe('2')
    expect(screen.getByText('行深般若波羅蜜多時，').style.getPropertyValue('--depth')).toBe('1')
  })

  it('shows 止 overlay only when paused', () => {
    const { rerender } = render(
      <RecitationStage current={p(0, '般若波羅蜜多心經')} recent={[]} status="playing" onTap={() => {}} />
    )
    expect(screen.queryByText('止')).toBeNull()
    rerender(
      <RecitationStage current={p(0, '般若波羅蜜多心經')} recent={[]} status="paused" onTap={() => {}} />
    )
    expect(screen.getByText('止')).toBeInTheDocument()
  })

  it('calls onTap when the stage is clicked', () => {
    const onTap = vi.fn()
    render(<RecitationStage current={p(0, '般若波羅蜜多心經')} recent={[]} status="playing" onTap={onTap} />)
    fireEvent.click(screen.getByTestId('recite-stage'))
    expect(onTap).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/RecitationStage.test.tsx`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Append CSS**

Append to `src/styles/globals.css` (outside any `@layer` block, after the existing `ink-bloom-in` reduced-motion block):

```css
/* ── Recitation rising mist ─────────────────────────────────────────
   Current phrase surfaces from below (blur → clear, lift 24px), then is
   promoted to a "recent" line that drifts up and dims by depth. Under
   reduced motion the stage swaps to `recite-fade` (opacity only). */
@keyframes recite-rise-in {
  0%   { opacity: 0; transform: translateY(24px); filter: blur(6px); }
  100% { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
.recite-rise {
  animation: recite-rise-in 900ms cubic-bezier(0.05, 0.7, 0.1, 1) both;
}
.recite-linger {
  opacity: calc(0.45 / var(--depth, 1));
  transform: translateY(calc(var(--depth, 1) * -2.2em));
  transition: opacity 900ms ease-out, transform 900ms ease-out;
}
@keyframes recite-fade-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
.recite-fade {
  animation: recite-fade-in 600ms ease-out both;
}
.recite-fade.recite-linger {
  animation: none;
  transform: none;
  transition: opacity 600ms ease-out;
}
```

- [ ] **Step 4: Write the component**

`src/components/Recitation/RecitationStage.tsx`:

```tsx
'use client'
import type { CSSProperties } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { RecitationPhrase } from '@/lib/recitation'
import type { RecitationStatus } from '@/hooks/useRecitation'

export interface RecitationStageProps {
  current: RecitationPhrase | null
  recent: RecitationPhrase[]
  status: RecitationStatus
  onTap(): void
}

const PHRASE_BASE =
  'absolute left-0 right-0 text-center font-serif tracking-[0.35em] text-2xl sm:text-3xl text-zen-accent'

export function RecitationStage({ current, recent, status, onTap }: RecitationStageProps) {
  const reduced = useReducedMotion()
  const motionClass = reduced ? 'recite-fade' : 'recite-rise'

  return (
    <div
      data-testid="recite-stage"
      role="button"
      tabIndex={0}
      aria-label={status === 'paused' ? '續' : '止'}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onTap()
        }
      }}
      className="relative min-h-[40vh] flex items-center justify-center select-none cursor-pointer"
    >
      <div className="relative w-full h-24">
        {recent.map((phrase, i) => {
          const depth = recent.length - i
          const style = { '--depth': String(depth) } as CSSProperties
          return (
            <p
              key={phrase.index}
              className={`${PHRASE_BASE} recite-linger ${reduced ? 'recite-fade' : ''}`}
              style={style}
              aria-hidden="true"
            >
              {phrase.text}
            </p>
          )
        })}
        {current && (
          <p key={current.index} className={`${PHRASE_BASE} ${motionClass}`} aria-live="polite">
            {current.text}
          </p>
        )}
      </div>
      {status === 'paused' && (
        <span className="absolute inset-0 flex items-center justify-center font-serif text-6xl text-zen-muted/40 pointer-events-none">
          止
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test tests/RecitationStage.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/styles/globals.css src/components/Recitation/RecitationStage.tsx tests/RecitationStage.test.tsx
git commit -m "feat(recite): rising-mist stage component + keyframes"
```

---

### Task 4: `RecitationControls` and `RecitationDone`

**Files:**
- Create: `src/components/Recitation/RecitationControls.tsx`
- Create: `src/components/Recitation/RecitationDone.tsx`
- Test: `tests/RecitationControls.test.tsx`

**Interfaces:**
- Consumes: `RecitationSpeed`, `RECITATION_SPEEDS` from `@/lib/recitation`; `RecitationStatus` from `@/hooks/useRecitation`; `LotusGlyph` from `@/components/Lotus`.
- Produces:
  ```ts
  export interface RecitationControlsProps {
    speed: RecitationSpeed
    status: RecitationStatus
    progress: number
    onSpeed(speed: RecitationSpeed): void
    onStart(): void
  }
  export function RecitationControls(props: RecitationControlsProps): JSX.Element
  export interface RecitationDoneProps { onRestart(): void }
  export function RecitationDone(props: RecitationDoneProps): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

`tests/RecitationControls.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecitationControls } from '@/components/Recitation/RecitationControls'
import { RecitationDone } from '@/components/Recitation/RecitationDone'

describe('RecitationControls', () => {
  it('renders speed pills as a radiogroup with the active one checked', () => {
    render(
      <RecitationControls speed="中" status="idle" progress={0} onSpeed={() => {}} onStart={() => {}} />
    )
    const group = screen.getByRole('radiogroup')
    const radios = screen.getAllByRole('radio')
    expect(group).toBeInTheDocument()
    expect(radios.map((r) => r.textContent)).toEqual(['緩', '中', '疾'])
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onSpeed with the tapped speed', () => {
    const onSpeed = vi.fn()
    render(
      <RecitationControls speed="中" status="playing" progress={0.3} onSpeed={onSpeed} onStart={() => {}} />
    )
    fireEvent.click(screen.getByText('疾'))
    expect(onSpeed).toHaveBeenCalledWith('疾')
  })

  it('shows 開始 only when idle and wires onStart', () => {
    const onStart = vi.fn()
    const { rerender } = render(
      <RecitationControls speed="中" status="idle" progress={0} onSpeed={() => {}} onStart={onStart} />
    )
    fireEvent.click(screen.getByText('開始'))
    expect(onStart).toHaveBeenCalledTimes(1)
    rerender(
      <RecitationControls speed="中" status="playing" progress={0.5} onSpeed={() => {}} onStart={onStart} />
    )
    expect(screen.queryByText('開始')).toBeNull()
  })

  it('renders progress hairline width as a percentage', () => {
    render(
      <RecitationControls speed="中" status="playing" progress={0.25} onSpeed={() => {}} onStart={() => {}} />
    )
    expect(screen.getByTestId('recite-progress').style.width).toBe('25%')
  })
})

describe('RecitationDone', () => {
  it('shows 一遍圓滿 with restart and return actions', () => {
    const onRestart = vi.fn()
    render(<RecitationDone onRestart={onRestart} />)
    expect(screen.getByText('一遍圓滿')).toBeInTheDocument()
    fireEvent.click(screen.getByText('再誦一遍'))
    expect(onRestart).toHaveBeenCalledTimes(1)
    expect(screen.getByText('回到道場')).toHaveAttribute('href', '/categories')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/RecitationControls.test.tsx`
Expected: FAIL — components not found.

- [ ] **Step 3: Write the components**

`src/components/Recitation/RecitationControls.tsx`:

```tsx
'use client'
import { RECITATION_SPEEDS, type RecitationSpeed } from '@/lib/recitation'
import type { RecitationStatus } from '@/hooks/useRecitation'

export interface RecitationControlsProps {
  speed: RecitationSpeed
  status: RecitationStatus
  progress: number
  onSpeed(speed: RecitationSpeed): void
  onStart(): void
}

const SPEEDS = Object.keys(RECITATION_SPEEDS) as RecitationSpeed[]

export function RecitationControls({
  speed,
  status,
  progress,
  onSpeed,
  onStart,
}: RecitationControlsProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div role="radiogroup" aria-label="誦經速度" className="flex items-center gap-6">
        {SPEEDS.map((s) => {
          const active = s === speed
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSpeed(s)}
              className={`font-serif text-lg tracking-[0.3em] px-3 py-1 rounded-full ${
                active
                  ? 'text-zen-accent border border-zen-accent/60'
                  : 'text-zen-muted hover:text-zen-accent border border-transparent'
              }`}
            >
              {s}
            </button>
          )
        })}
      </div>

      {status === 'idle' && (
        <button type="button" onClick={onStart} className="zen-glow-button px-8 py-3 tracking-[0.3em]">
          開始
        </button>
      )}

      <div className="w-full h-px bg-zen-surface" aria-hidden="true">
        <div
          data-testid="recite-progress"
          className="h-px bg-zen-accent/70 transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  )
}
```

`src/components/Recitation/RecitationDone.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { LotusGlyph } from '@/components/Lotus'

export interface RecitationDoneProps {
  onRestart(): void
}

export function RecitationDone({ onRestart }: RecitationDoneProps) {
  return (
    <div className="flex flex-col items-center gap-8 min-h-[40vh] justify-center">
      <LotusGlyph className="w-12 h-12" />
      <p className="font-serif text-2xl tracking-[0.5em] text-zen-text">一遍圓滿</p>
      <div className="flex items-center gap-6">
        <button type="button" onClick={onRestart} className="zen-glow-button px-6 py-3 tracking-[0.2em]">
          再誦一遍
        </button>
        <Link href="/categories" className="text-sm text-zen-muted hover:text-zen-accent">
          回到道場
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/RecitationControls.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Recitation/RecitationControls.tsx src/components/Recitation/RecitationDone.tsx tests/RecitationControls.test.tsx
git commit -m "feat(recite): speed controls, progress hairline, done state"
```

---

### Task 5: `/recite` page, nav entry, full verification

**Files:**
- Create: `src/app/recite/page.tsx`
- Modify: `src/app/categories/page.tsx:22-29` (nav block)

**Interfaces:**
- Consumes: everything from Tasks 1–4.

- [ ] **Step 1: Write the page**

`src/app/recite/page.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import sutraDb from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'
import { splitPhrases, SUTRA_TITLE } from '@/lib/recitation'
import { useRecitation } from '@/hooks/useRecitation'
import { RecitationStage } from '@/components/Recitation/RecitationStage'
import { RecitationControls } from '@/components/Recitation/RecitationControls'
import { RecitationDone } from '@/components/Recitation/RecitationDone'

const SUTRA_DB = sutraDb as SutraSegment[]

export default function RecitePage() {
  const phrases = useMemo(() => splitPhrases(SUTRA_DB), [])
  const r = useRecitation(phrases)

  return (
    <div className="flex flex-col gap-10">
      <Link href="/categories" className="self-start text-sm text-zen-muted hover:text-zen-accent">
        ← 回到道場
      </Link>

      {r.status === 'idle' && (
        <h2 className="text-center font-serif text-2xl tracking-[0.5em] text-zen-text">
          {SUTRA_TITLE}
        </h2>
      )}

      {r.status === 'done' ? (
        <RecitationDone onRestart={r.start} />
      ) : (
        <RecitationStage
          current={r.current}
          recent={r.recent}
          status={r.status}
          onTap={r.toggle}
        />
      )}

      {r.status !== 'done' && (
        <RecitationControls
          speed={r.speed}
          status={r.status}
          progress={r.progress}
          onSpeed={r.setSpeed}
          onStart={r.start}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add the nav link**

In `src/app/categories/page.tsx`, inside the `<nav>` insert before the `/mirror` link:

```tsx
          <Link href="/recite" className="hover:text-zen-accent">
            誦經 →
          </Link>
```

- [ ] **Step 3: Type-check and run the full suite**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: no type errors; all tests pass (previous count + 25 new).

- [ ] **Step 4: Static export build, then clean**

Run: `pnpm build && pnpm clean`
Expected: build succeeds and `out/recite/index.html` was produced before clean (check the build log lists `/recite`).

- [ ] **Step 5: Manual smoke (pnpm dev)**

- Open `/categories`, tap `誦經 →`, land on `/recite` with the title, speed pills, 開始.
- Tap 開始: phrases surface one at a time; two previous linger above; hairline fills.
- Tap stage: 止 overlay appears, no advance; tap again resumes.
- Switch to 疾 mid-phrase: cadence quickens without skipping.
- Switch browser tab and back: paused.
- Let it finish: lotus + 一遍圓滿; 再誦一遍 restarts at the title; 回到道場 returns.
- DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: crossfade only.

- [ ] **Step 6: Commit**

```bash
git add src/app/recite/page.tsx src/app/categories/page.tsx
git commit -m "feat(recite): /recite page + 誦經 nav entry"
```

---

### Task 6: Record the shipped feature

**Files:**
- Modify: `CLAUDE.md` (module map + "Recently shipped")
- Modify: `TODO.md` (new numbered section)

- [ ] **Step 1: Update CLAUDE.md**

In the module map under `src/app/`, add after the `mirror/` line:

```
    recite/             # /recite — phrase-by-phrase Heart Sutra recitation (no network, no persistence)
```

Under `components/`, add `Recitation/ : RecitationStage, RecitationControls, RecitationDone`. Under `hooks/`, add `useRecitation.ts  # reducer + single timer; pauses on visibilitychange`. Under `lib/`, add `recitation.ts     # pure: splitPhrases (by ，、；。！) + phraseDurationMs (緩/中/疾)`.

In "Recently shipped", prepend:

```
- ✅ 誦經 recitation page (`/recite`): auto-paced rising-mist phrases from `sutra-db.json`, 緩/中/疾 speeds, tap-to-pause, 一遍圓滿 closing. Pure CSS, no persistence, no Gemini (2026-09-02)
```

- [ ] **Step 2: Update TODO.md**

Append a section:

```
### 10. Sutra recitation (誦經) ✅ shipped 2026-09-02
Spec: `docs/superpowers/specs/2026-09-02-sutra-recitation-design.md` · Plan: `docs/superpowers/plans/2026-09-02-sutra-recitation-plan.md`
- `/recite`: title + ~50 punctuation-split phrases surface one at a time (rising mist), 緩/中/疾 cadence, tap-to-pause, auto-pause on tab hide, 一遍圓滿 closing with 再誦一遍.
- Open follow-ups: chant audio/TTS, recitation count in Dexie (would feed /mirror), continuous loop mode.
```

(Section 10 follows the existing §9 Daily Insight.)

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md TODO.md
git commit -m "docs: record 誦經 recitation feature"
```

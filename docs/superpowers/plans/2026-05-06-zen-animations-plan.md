# Zen Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three named animations (Breathing Loader, Ink-Drop char-by-char text reveal, Sand-Art delete exit) to the SutraMind PWA, plus `prefers-reduced-motion` honoring, without changing the existing API contract or persistence layer.

**Architecture:** Pure presentation-layer changes. Three new components (`BreathingLoader`, `InkDropText`, `SandArtExit`), one new hook (`useReducedMotion`), one minimal extension to `useChatSession` (a `freshAssistantIndex` field), plus wiring in `chat/page.tsx`, `history/detail/page.tsx`, `ChatMessage`, and `SessionListItem`. Char-by-char reveal is **client-side animated** — `callGemini` returns the full response as today; `InkDropText` reveals it locally via CSS staggered animations. Zero changes to `lib/`, persistence, error classification, or round-counter logic.

**Tech Stack:** Next.js 14, React 18, TypeScript 5, Tailwind CSS 3, Framer Motion 11 (new), Vitest + jsdom + @testing-library/react (new), `prefers-reduced-motion` via `matchMedia`.

**Spec:** `docs/superpowers/specs/2026-05-06-zen-animations-design.md`

---

## File Map

```
NEW:
  src/components/BreathingLoader.tsx
  src/components/InkDropText.tsx
  src/components/SandArtExit.tsx
  src/hooks/useReducedMotion.ts
  tests/useReducedMotion.test.tsx
  tests/BreathingLoader.test.tsx
  tests/InkDropText.test.tsx
  tests/SandArtExit.test.tsx
  tests/useChatSession-fresh.test.tsx        (extension tests for hook)

MOD:
  package.json                                (+framer-motion, +@testing-library/react,
                                               +@testing-library/jest-dom, +@types/react-dom test deps)
  vitest.config.ts                            (include .tsx; broaden test glob)
  tests/setup.ts                              (+matchMedia, +IntersectionObserver mocks)
  tailwind.config.ts                          (+breath-glow keyframes)
  src/components/ChatMessage.tsx              (add `revealMode` prop, integrate InkDropText)
  src/components/SessionListItem.tsx          (wrap row in SandArtExit)
  src/hooks/useChatSession.ts                 (expose freshAssistantIndex)
  src/app/chat/page.tsx                       (BreathingLoader + revealMode wiring)
  src/app/history/detail/page.tsx             (revealMode='replay' wiring)
```

---

## Task 1: Install dependencies and broaden test setup

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Modify: `tests/setup.ts`

- [ ] **Step 1: Install runtime + test deps**

```bash
cd "D:/MyWorkData/WebApp_Tools/SutraMind_PWA"
pnpm add framer-motion@^11
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `pnpm-lock.yaml` updates, `package.json` shows the three test libs under `devDependencies` and `framer-motion` under `dependencies`.

- [ ] **Step 2: Broaden Vitest test glob to include `.tsx`**

Edit `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 3: Extend test setup with `matchMedia` and `IntersectionObserver` mocks**

Replace `tests/setup.ts` entirely:

```typescript
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// matchMedia: jsdom doesn't ship it. Default to "no reduced motion".
// Tests that need reduced-motion override it via setMatchMediaMatches() below.
let _matches = false
export function setMatchMediaMatches(value: boolean) {
  _matches = value
}
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: _matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// IntersectionObserver: jsdom doesn't ship it. Provide a controllable mock.
// Tests can grab the latest instance via __observers and call .trigger(true).
type ObserverInstance = {
  callback: IntersectionObserverCallback
  observed: Element[]
  disconnected: boolean
  trigger: (intersecting: boolean) => void
}
const __observers: ObserverInstance[] = []
export function getLatestObserver(): ObserverInstance {
  const last = __observers[__observers.length - 1]
  if (!last) throw new Error('No IntersectionObserver instances yet')
  return last
}
export function clearObservers() {
  __observers.length = 0
}

class MockIntersectionObserver {
  constructor(public callback: IntersectionObserverCallback) {
    const inst: ObserverInstance = {
      callback,
      observed: [],
      disconnected: false,
      trigger(intersecting) {
        if (this.disconnected) return
        const entries = this.observed.map((target) => ({
          target,
          isIntersecting: intersecting,
          intersectionRatio: intersecting ? 1 : 0,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        })) as IntersectionObserverEntry[]
        this.callback(entries, this as unknown as IntersectionObserver)
      },
    }
    __observers.push(inst)
    Object.assign(this, inst)
  }
  observe(target: Element) {
    const inst = __observers[__observers.length - 1]
    inst.observed.push(target)
  }
  unobserve() { /* no-op */ }
  disconnect() {
    const inst = __observers[__observers.length - 1]
    inst.disconnected = true
  }
  takeRecords(): IntersectionObserverEntry[] { return [] }
  root = null
  rootMargin = ''
  thresholds: ReadonlyArray<number> = []
}
;(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver
```

- [ ] **Step 4: Run all existing tests to confirm setup change is non-breaking**

```bash
pnpm test --run
```

Expected: 39 tests pass. If any fail due to the setup changes, investigate before proceeding.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/setup.ts
git commit -m "chore: add framer-motion and RTL test deps; mock matchMedia + IntersectionObserver"
```

---

## Task 2: `useReducedMotion` hook (TDD)

**Files:**
- Create: `src/hooks/useReducedMotion.ts`
- Test: `tests/useReducedMotion.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/useReducedMotion.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { setMatchMediaMatches } from './setup'

describe('useReducedMotion', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })

  it('returns false when prefers-reduced-motion is not set', () => {
    setMatchMediaMatches(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when prefers-reduced-motion: reduce matches', () => {
    setMatchMediaMatches(true)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm test --run tests/useReducedMotion.test.tsx
```

Expected: FAIL — module `@/hooks/useReducedMotion` not found.

- [ ] **Step 3: Implement minimal hook**

Create `src/hooks/useReducedMotion.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm test --run tests/useReducedMotion.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useReducedMotion.ts tests/useReducedMotion.test.tsx
git commit -m "feat(hooks): add useReducedMotion (matchMedia-based)"
```

---

## Task 3: Tailwind keyframes for soft-glow breath cycle

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add `breath-glow` keyframes alongside the existing `breath`**

Edit `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zen: {
          bg: '#121212',
          surface: '#1E1E1E',
          text: '#EAE0D5',
          muted: '#8A8079',
          accent: '#C9A961',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'breath': 'breath 5s ease-in-out infinite',
        'breath-glow': 'breath-glow 5s ease-in-out infinite',
      },
      keyframes: {
        breath: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.95)' },
          '50%': { opacity: '0.9', transform: 'scale(1.05)' },
        },
        'breath-glow': {
          '0%, 100%': {
            opacity: '0.55',
            transform: 'scale(0.7)',
            filter: 'blur(0.5px)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1.1)',
            filter: 'blur(0)',
          },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Verify Tailwind picks up the new keyframes by running typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "style(tailwind): add breath-glow keyframes for soft-glow loader"
```

---

## Task 4: `BreathingLoader` component (TDD)

**Files:**
- Create: `src/components/BreathingLoader.tsx`
- Test: `tests/BreathingLoader.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/BreathingLoader.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { BreathingLoader } from '@/components/BreathingLoader'
import { setMatchMediaMatches } from './setup'

describe('BreathingLoader', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })

  it('renders an element with the breath-glow animation class', () => {
    setMatchMediaMatches(false)
    const { container } = render(<BreathingLoader />)
    const glow = container.querySelector('[data-testid="breath-glow"]')
    expect(glow).not.toBeNull()
    expect(glow?.className).toMatch(/animate-breath-glow/)
  })

  it('renders a static (no-animation) variant when prefers-reduced-motion is set', () => {
    setMatchMediaMatches(true)
    const { container } = render(<BreathingLoader />)
    const glow = container.querySelector('[data-testid="breath-glow"]')
    expect(glow).not.toBeNull()
    expect(glow?.className).not.toMatch(/animate-breath-glow/)
    expect(glow?.className).toMatch(/opacity-/)
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm test --run tests/BreathingLoader.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement minimal component**

Create `src/components/BreathingLoader.tsx`:

```tsx
'use client'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const GLOW_BG =
  'radial-gradient(circle, rgba(201,169,97,0.55) 0%, rgba(201,169,97,0.05) 70%, transparent 100%)'

export function BreathingLoader() {
  const reduced = useReducedMotion()
  return (
    <div
      data-testid="breath-glow"
      aria-label="觀照中"
      role="status"
      className={
        reduced
          ? 'w-16 h-16 rounded-full opacity-70 scale-90'
          : 'w-16 h-16 rounded-full animate-breath-glow'
      }
      style={{ background: GLOW_BG }}
    />
  )
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm test --run tests/BreathingLoader.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/BreathingLoader.tsx tests/BreathingLoader.test.tsx
git commit -m "feat(components): add BreathingLoader (soft-glow 5s breath cycle)"
```

---

## Task 5: Wire `BreathingLoader` into chat page

**Files:**
- Modify: `src/app/chat/page.tsx:77-83`

- [ ] **Step 1: Replace the inline pulse dot with `<BreathingLoader />`**

In `src/app/chat/page.tsx`, add the import:

```tsx
import { BreathingLoader } from '@/components/BreathingLoader'
```

Then replace the block at lines 77–83:

```tsx
        {status === 'sending' && (
          <div className="flex justify-start">
            <div className="bg-zen-surface rounded-lg px-5 py-4">
              <div className="w-3 h-3 rounded-full bg-zen-accent/50 animate-breath" />
            </div>
          </div>
        )}
```

with:

```tsx
        {status === 'sending' && (
          <div className="flex justify-start">
            <div className="bg-zen-surface rounded-lg px-8 py-6">
              <BreathingLoader />
            </div>
          </div>
        )}
```

- [ ] **Step 2: Type-check and run all tests**

```bash
pnpm exec tsc --noEmit && pnpm test --run
```

Expected: clean typecheck, all tests pass (no test changes, just confirming no regression).

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev:fresh
```

Open http://localhost:3000, complete a chat round, and confirm the breath-glow circle appears during the loading moment instead of the small dot. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/chat/page.tsx
git commit -m "feat(chat): swap pulse dot for BreathingLoader during AI thinking"
```

---

## Task 6: `InkDropText` — static mode (TDD)

**Files:**
- Create: `src/components/InkDropText.tsx`
- Test: `tests/InkDropText.test.tsx`

We're building `InkDropText` incrementally across Tasks 6–8 (static, then live, then replay).

- [ ] **Step 1: Write failing tests for static mode**

Create `tests/InkDropText.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { InkDropText } from '@/components/InkDropText'
import { setMatchMediaMatches } from './setup'

describe('InkDropText — static mode', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })

  it('renders the full text immediately', () => {
    const { getByText } = render(<InkDropText text="心無罣礙" mode="static" />)
    expect(getByText('心無罣礙')).toBeInTheDocument()
  })

  it('preserves whitespace and line breaks', () => {
    const { container } = render(<InkDropText text={'第一行\n第二行'} mode="static" />)
    expect(container.textContent).toBe('第一行\n第二行')
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm test --run tests/InkDropText.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement minimal component supporting only `static` mode**

Create `src/components/InkDropText.tsx`:

```tsx
'use client'

export type InkDropMode = 'live' | 'replay' | 'static'

export interface InkDropTextProps {
  text: string
  mode: InkDropMode
  skip?: boolean
  onComplete?: () => void
}

export function InkDropText({ text, mode }: InkDropTextProps) {
  if (mode === 'static') {
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
  }
  // live and replay come in later tasks
  return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm test --run tests/InkDropText.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/InkDropText.tsx tests/InkDropText.test.tsx
git commit -m "feat(components): InkDropText skeleton with static mode"
```

---

## Task 7: `InkDropText` — live mode with skip-on-tap (TDD)

**Files:**
- Modify: `src/components/InkDropText.tsx`
- Modify: `tests/InkDropText.test.tsx` (append)
- Modify: `src/styles/globals.css` (add per-char keyframes)

- [ ] **Step 1: Append failing tests for live mode**

Add to `tests/InkDropText.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { InkDropText } from '@/components/InkDropText'
import { setMatchMediaMatches } from './setup'

describe('InkDropText — live mode', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('wraps each character in its own span with a stagger delay', () => {
    const { container } = render(
      <InkDropText text="心無罣礙" mode="live" />
    )
    const spans = container.querySelectorAll('[data-char]')
    expect(spans).toHaveLength(4)
    // First char: 0ms; subsequent chars get cumulative delay.
    expect((spans[0] as HTMLElement).style.animationDelay).toBe('0ms')
    expect((spans[1] as HTMLElement).style.animationDelay).not.toBe('0ms')
  })

  it('caps total animation time near 6s for long text via stagger compression', () => {
    const long = 'あ'.repeat(300)
    const { container } = render(<InkDropText text={long} mode="live" />)
    const spans = container.querySelectorAll('[data-char]')
    const lastDelay = parseFloat(
      (spans[spans.length - 1] as HTMLElement).style.animationDelay
    )
    expect(lastDelay).toBeLessThanOrEqual(6000)
  })

  it('fires onComplete after the staggered reveal finishes', () => {
    const onComplete = vi.fn()
    render(
      <InkDropText text="abc" mode="live" onComplete={onComplete} />
    )
    expect(onComplete).not.toHaveBeenCalled()
    // 3 chars * 40ms stagger + 350ms duration = 470ms total
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('snaps to final state when skip flips to true', () => {
    const onComplete = vi.fn()
    const { container, rerender } = render(
      <InkDropText text="abc" mode="live" skip={false} onComplete={onComplete} />
    )
    rerender(
      <InkDropText text="abc" mode="live" skip={true} onComplete={onComplete} />
    )
    const spans = container.querySelectorAll('[data-char]')
    spans.forEach((s) => {
      expect((s as HTMLElement).className).toMatch(/ink-char-skipped/)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('renders text as plain string (no per-char spans) under reduced motion and fires onComplete synchronously', () => {
    setMatchMediaMatches(true)
    const onComplete = vi.fn()
    const { container } = render(
      <InkDropText text="心無罣礙" mode="live" onComplete={onComplete} />
    )
    expect(container.querySelectorAll('[data-char]')).toHaveLength(0)
    expect(container.textContent).toBe('心無罣礙')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests, expect fail**

```bash
pnpm test --run tests/InkDropText.test.tsx
```

Expected: 5 new tests fail (the static-mode tests still pass).

- [ ] **Step 3: Add per-char animation keyframes to global CSS**

Append to `src/styles/globals.css`:

```css
@keyframes ink-char-in {
  0% {
    opacity: 0;
    filter: blur(3px);
    transform: translateY(2px);
  }
  100% {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

.ink-char {
  display: inline-block;
  white-space: pre-wrap;
  opacity: 0;
  animation: ink-char-in 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.ink-char-skipped {
  animation: none !important;
  opacity: 1 !important;
  filter: none !important;
  transform: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .ink-char {
    animation: none;
    opacity: 1;
    filter: none;
    transform: none;
  }
}
```

- [ ] **Step 4: Implement live mode**

Replace `src/components/InkDropText.tsx`:

```tsx
'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export type InkDropMode = 'live' | 'replay' | 'static'

export interface InkDropTextProps {
  text: string
  mode: InkDropMode
  skip?: boolean
  onComplete?: () => void
}

const PER_CHAR_DURATION_MS = 350
const TARGET_STAGGER_MS = 40
const MAX_TOTAL_MS = 6000

function computeStagger(length: number): number {
  if (length <= 1) return 0
  return Math.min(TARGET_STAGGER_MS, MAX_TOTAL_MS / length)
}

export function InkDropText({ text, mode, skip, onComplete }: InkDropTextProps) {
  const reduced = useReducedMotion()
  const completedRef = useRef(false)

  const stagger = useMemo(() => computeStagger(text.length), [text.length])
  const totalMs = useMemo(
    () => Math.ceil(stagger * Math.max(0, text.length - 1) + PER_CHAR_DURATION_MS),
    [stagger, text.length]
  )

  // onComplete behavior. Reduced-motion + static fire synchronously.
  // Live mode under normal motion fires after totalMs.
  useEffect(() => {
    if (completedRef.current) return
    if (mode === 'static') {
      completedRef.current = true
      onComplete?.()
      return
    }
    if (reduced) {
      completedRef.current = true
      onComplete?.()
      return
    }
    if (mode === 'live') {
      const t = setTimeout(() => {
        if (completedRef.current) return
        completedRef.current = true
        onComplete?.()
      }, totalMs)
      return () => clearTimeout(t)
    }
    // replay handled in a later task
  }, [mode, reduced, totalMs, onComplete])

  // skip flip: snap and fire onComplete now.
  useEffect(() => {
    if (mode !== 'live' || !skip || completedRef.current) return
    completedRef.current = true
    onComplete?.()
  }, [skip, mode, onComplete])

  if (mode === 'static' || reduced) {
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
  }

  if (mode === 'live') {
    return (
      <p className="whitespace-pre-wrap leading-relaxed">
        {Array.from(text).map((ch, i) => (
          <span
            key={i}
            data-char={i}
            className={skip ? 'ink-char ink-char-skipped' : 'ink-char'}
            style={{ animationDelay: `${Math.round(i * stagger)}ms` }}
          >
            {ch}
          </span>
        ))}
      </p>
    )
  }

  // replay placeholder
  return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
}
```

- [ ] **Step 5: Run tests, expect all 7 to pass**

```bash
pnpm test --run tests/InkDropText.test.tsx
```

Expected: 7 tests pass (2 static + 5 live).

- [ ] **Step 6: Commit**

```bash
git add src/components/InkDropText.tsx tests/InkDropText.test.tsx src/styles/globals.css
git commit -m "feat(components): InkDropText live mode with skip-on-tap"
```

---

## Task 8: `InkDropText` — replay mode via IntersectionObserver (TDD)

**Files:**
- Modify: `src/components/InkDropText.tsx`
- Modify: `tests/InkDropText.test.tsx` (append)
- Modify: `src/styles/globals.css` (add bloom keyframes)

- [ ] **Step 1: Append failing tests for replay mode**

Add to `tests/InkDropText.test.tsx`:

```tsx
import { getLatestObserver, clearObservers } from './setup'

describe('InkDropText — replay mode', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
    clearObservers()
  })

  it('renders an element without the bloom-show class until intersected', () => {
    const { container } = render(<InkDropText text="心無罣礙" mode="replay" />)
    const bloom = container.querySelector('[data-testid="ink-bloom"]')
    expect(bloom).not.toBeNull()
    expect(bloom?.className).not.toMatch(/ink-bloom-show/)
  })

  it('adds the bloom-show class once on first intersection', () => {
    const { container } = render(<InkDropText text="心無罣礙" mode="replay" />)
    act(() => {
      getLatestObserver().trigger(true)
    })
    const bloom = container.querySelector('[data-testid="ink-bloom"]')
    expect(bloom?.className).toMatch(/ink-bloom-show/)
  })

  it('does not re-animate on subsequent intersections', () => {
    const { container } = render(<InkDropText text="心無罣礙" mode="replay" />)
    act(() => {
      getLatestObserver().trigger(true)
    })
    const cls1 = container.querySelector('[data-testid="ink-bloom"]')?.className
    act(() => {
      getLatestObserver().trigger(false)
      getLatestObserver().trigger(true)
    })
    const cls2 = container.querySelector('[data-testid="ink-bloom"]')?.className
    expect(cls2).toBe(cls1)
  })

  it('renders text immediately under reduced motion (no observer attached)', () => {
    setMatchMediaMatches(true)
    const { container } = render(<InkDropText text="心無罣礙" mode="replay" />)
    expect(container.textContent).toBe('心無罣礙')
    // No observer should have been created.
    expect(() => getLatestObserver()).toThrow()
  })
})
```

- [ ] **Step 2: Run tests, expect fail**

```bash
pnpm test --run tests/InkDropText.test.tsx
```

Expected: 4 new replay tests fail.

- [ ] **Step 3: Append bloom keyframes to `src/styles/globals.css`**

```css
@keyframes ink-bloom-in {
  0% {
    opacity: 0;
    filter: blur(6px);
  }
  100% {
    opacity: 1;
    filter: blur(0);
  }
}

.ink-bloom {
  opacity: 0;
}

.ink-bloom.ink-bloom-show {
  animation: ink-bloom-in 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@media (prefers-reduced-motion: reduce) {
  .ink-bloom {
    opacity: 1;
  }
  .ink-bloom.ink-bloom-show {
    animation: none;
  }
}
```

- [ ] **Step 4: Replace replay placeholder with real implementation**

In `src/components/InkDropText.tsx`, replace the trailing replay placeholder block with a full implementation. The full file should now read:

```tsx
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export type InkDropMode = 'live' | 'replay' | 'static'

export interface InkDropTextProps {
  text: string
  mode: InkDropMode
  skip?: boolean
  onComplete?: () => void
}

const PER_CHAR_DURATION_MS = 350
const TARGET_STAGGER_MS = 40
const MAX_TOTAL_MS = 6000

function computeStagger(length: number): number {
  if (length <= 1) return 0
  return Math.min(TARGET_STAGGER_MS, MAX_TOTAL_MS / length)
}

export function InkDropText({ text, mode, skip, onComplete }: InkDropTextProps) {
  const reduced = useReducedMotion()
  const completedRef = useRef(false)

  const stagger = useMemo(() => computeStagger(text.length), [text.length])
  const totalMs = useMemo(
    () => Math.ceil(stagger * Math.max(0, text.length - 1) + PER_CHAR_DURATION_MS),
    [stagger, text.length]
  )

  useEffect(() => {
    if (completedRef.current) return
    if (mode === 'static') {
      completedRef.current = true
      onComplete?.()
      return
    }
    if (reduced) {
      completedRef.current = true
      onComplete?.()
      return
    }
    if (mode === 'live') {
      const t = setTimeout(() => {
        if (completedRef.current) return
        completedRef.current = true
        onComplete?.()
      }, totalMs)
      return () => clearTimeout(t)
    }
    // replay: onComplete fires once intersection has triggered the bloom
  }, [mode, reduced, totalMs, onComplete])

  useEffect(() => {
    if (mode !== 'live' || !skip || completedRef.current) return
    completedRef.current = true
    onComplete?.()
  }, [skip, mode, onComplete])

  // ---- replay state ----
  const bloomRef = useRef<HTMLParagraphElement | null>(null)
  const [bloomed, setBloomed] = useState(false)

  useEffect(() => {
    if (mode !== 'replay' || reduced || bloomed) return
    const el = bloomRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      const e = entries[0]
      if (e?.isIntersecting) {
        setBloomed(true)
        observer.disconnect()
        if (!completedRef.current) {
          completedRef.current = true
          onComplete?.()
        }
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [mode, reduced, bloomed, onComplete])

  if (mode === 'static' || reduced) {
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
  }

  if (mode === 'live') {
    return (
      <p className="whitespace-pre-wrap leading-relaxed">
        {Array.from(text).map((ch, i) => (
          <span
            key={i}
            data-char={i}
            className={skip ? 'ink-char ink-char-skipped' : 'ink-char'}
            style={{ animationDelay: `${Math.round(i * stagger)}ms` }}
          >
            {ch}
          </span>
        ))}
      </p>
    )
  }

  // replay
  return (
    <p
      ref={bloomRef}
      data-testid="ink-bloom"
      className={`whitespace-pre-wrap leading-relaxed ink-bloom${
        bloomed ? ' ink-bloom-show' : ''
      }`}
    >
      {text}
    </p>
  )
}
```

- [ ] **Step 5: Run tests, expect 11 to pass**

```bash
pnpm test --run tests/InkDropText.test.tsx
```

Expected: 11 tests pass (2 static + 5 live + 4 replay).

- [ ] **Step 6: Commit**

```bash
git add src/components/InkDropText.tsx tests/InkDropText.test.tsx src/styles/globals.css
git commit -m "feat(components): InkDropText replay mode with IntersectionObserver bloom"
```

---

## Task 9: Extend `useChatSession` with `freshAssistantIndex` (TDD)

**Files:**
- Modify: `src/hooks/useChatSession.ts`
- Create: `tests/useChatSession-fresh.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/useChatSession-fresh.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChatSession } from '@/hooks/useChatSession'
import { createSession } from '@/lib/db'

vi.mock('@/lib/gemini', () => ({
  callGemini: vi.fn(async () => ({
    response_text: '心無罣礙故，無有恐怖。',
    referenced_segment_ids: ['segment_4'],
    closing_practice: null,
  })),
  GeminiError: class GeminiError extends Error {
    kind: string
    retryable: boolean
    constructor(kind: string, message: string, retryable: boolean) {
      super(message)
      this.kind = kind
      this.retryable = retryable
    }
  },
  DEFAULT_MODEL: 'gemini-2.5-flash',
}))

describe('useChatSession.freshAssistantIndex', () => {
  beforeEach(() => {
    // fake-indexeddb resets via setup.ts? No — we explicitly avoid cross-test bleed by using new sessions.
  })

  it('is null before any send', async () => {
    const id = await createSession('emotion_relation')
    const { result } = renderHook(() =>
      useChatSession(id, 'fake-key', 'emotion_relation')
    )
    await waitFor(() => expect(result.current.session).not.toBeNull())
    expect(result.current.freshAssistantIndex).toBeNull()
  })

  it('points at the latest assistant message after a successful send', async () => {
    const id = await createSession('emotion_relation')
    const { result } = renderHook(() =>
      useChatSession(id, 'fake-key', 'emotion_relation')
    )
    await waitFor(() => expect(result.current.session).not.toBeNull())
    await act(async () => {
      await result.current.send('我感到難過')
    })
    // After 1 user + 1 assistant, assistant is at index 1.
    expect(result.current.freshAssistantIndex).toBe(1)
  })

  it('clears to null when the next send begins', async () => {
    const id = await createSession('emotion_relation')
    const { result } = renderHook(() =>
      useChatSession(id, 'fake-key', 'emotion_relation')
    )
    await waitFor(() => expect(result.current.session).not.toBeNull())
    await act(async () => {
      await result.current.send('第一次')
    })
    expect(result.current.freshAssistantIndex).toBe(1)
    await act(async () => {
      await result.current.send('第二次')
    })
    // After 2 user + 2 assistant, latest assistant is at index 3.
    expect(result.current.freshAssistantIndex).toBe(3)
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm test --run tests/useChatSession-fresh.test.tsx
```

Expected: FAIL — `freshAssistantIndex` does not exist on the hook return.

- [ ] **Step 3: Implement the field**

Edit `src/hooks/useChatSession.ts`. Make these changes:

1. Add `freshAssistantIndex: number | null` to `UseChatSessionResult`:

```typescript
export interface UseChatSessionResult {
  session: Session | null
  status: ChatStatus
  error: GeminiError | null
  roundNumber: RoundNumber
  freshAssistantIndex: number | null
  send: (text: string) => Promise<void>
  retry: () => Promise<void>
  finishSession: () => Promise<void>
}
```

2. Add state alongside the others (around line 41):

```typescript
const [freshAssistantIndex, setFreshAssistantIndex] = useState<number | null>(null)
```

3. In `performSend`, after `setStatus('sending')`, clear it (so the previous message goes static while the new one is in-flight):

```typescript
async (text: string) => {
  setStatus('sending')
  setError(null)
  setFreshAssistantIndex(null)
  // ... existing body unchanged ...
```

4. Inside the `try` block, immediately after the `await appendMessage(sessionId, assistantMsg)` and `const updated = await getSession(sessionId)` lines, set the index:

```typescript
await appendMessage(sessionId, assistantMsg)
const updated = await getSession(sessionId)
setSession(updated ?? null)
const latestAssistantIdx = (updated?.messages ?? []).reduce(
  (acc, m, i) => (m.role === 'assistant' ? i : acc),
  -1
)
setFreshAssistantIndex(latestAssistantIdx >= 0 ? latestAssistantIdx : null)
```

5. In `retry`, apply the same pattern. After the existing `await appendMessage(sessionId, { role: 'assistant', ... })` and before the round-completion check, recompute the latest assistant index and set the state:

```typescript
await refresh()
const after = await getSession(sessionId)
const latestAssistantIdx = (after?.messages ?? []).reduce(
  (acc, m, i) => (m.role === 'assistant' ? i : acc),
  -1
)
setFreshAssistantIndex(latestAssistantIdx >= 0 ? latestAssistantIdx : null)
const assistants = after?.messages.filter((m) => m.role === 'assistant').length ?? 0
```

(The existing `const after = ...` and `const assistants = ...` lines from the current `retry` implementation are replaced by the block above, in the same place. The rest of `retry` — `if (assistants >= 3) { completeSession; setStatus('completed') } else { setStatus('awaiting_user') } setPendingUserMessage(null)` — is unchanged.)

6. Return the new field at the bottom:

```typescript
return {
  session,
  status,
  error,
  roundNumber,
  freshAssistantIndex,
  send,
  retry,
  finishSession,
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm test --run tests/useChatSession-fresh.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Run full test suite to ensure no regression**

```bash
pnpm test --run
```

Expected: all tests pass (39 prior + new ones from Tasks 2, 4, 6, 7, 8, 9 — keep counting).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useChatSession.ts tests/useChatSession-fresh.test.tsx
git commit -m "feat(hooks): expose freshAssistantIndex from useChatSession"
```

---

## Task 10: `ChatMessage` — accept `revealMode` prop (TDD)

**Files:**
- Modify: `src/components/ChatMessage.tsx`
- Create: `tests/ChatMessage.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/ChatMessage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ChatMessage } from '@/components/ChatMessage'
import { setMatchMediaMatches } from './setup'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

const assistantMsg: ChatMessageType = {
  role: 'assistant',
  content: '心無罣礙',
  referencedSegmentIds: ['segment_4'],
  closingPractice: null,
  timestamp: 0,
}

const userMsg: ChatMessageType = {
  role: 'user',
  content: '我感到難過',
  timestamp: 0,
}

describe('ChatMessage', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
  })

  it('defaults to static mode (no per-char spans for assistant)', () => {
    const { container } = render(<ChatMessage message={assistantMsg} />)
    expect(container.querySelectorAll('[data-char]')).toHaveLength(0)
    expect(container.textContent).toContain('心無罣礙')
  })

  it('renders per-char spans when revealMode="live"', () => {
    const { container } = render(
      <ChatMessage message={assistantMsg} revealMode="live" />
    )
    expect(container.querySelectorAll('[data-char]').length).toBeGreaterThan(0)
  })

  it('snaps to final state when the bubble is clicked in live mode', () => {
    const { container } = render(
      <ChatMessage message={assistantMsg} revealMode="live" />
    )
    const bubble = container.querySelector('[data-testid="msg-bubble"]')!
    fireEvent.click(bubble)
    const spans = container.querySelectorAll('[data-char]')
    spans.forEach((s) => {
      expect((s as HTMLElement).className).toMatch(/ink-char-skipped/)
    })
  })

  it('does not enable click-to-skip on user messages', () => {
    const { container } = render(
      <ChatMessage message={userMsg} revealMode="live" />
    )
    // User messages render through their own path; no data-char spans regardless.
    expect(container.querySelectorAll('[data-char]')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm test --run tests/ChatMessage.test.tsx
```

Expected: FAIL — prop `revealMode` not recognized; tests reference `data-testid="msg-bubble"` which doesn't exist.

- [ ] **Step 3: Update `src/components/ChatMessage.tsx`**

Replace entirely with:

```tsx
'use client'
import { useState } from 'react'
import type { ChatMessage as ChatMessageType } from '@/types/chat'
import { SegmentReference } from './SegmentReference'
import { InkDropText, type InkDropMode } from './InkDropText'

interface Props {
  message: ChatMessageType
  revealMode?: InkDropMode
}

export function ChatMessage({ message, revealMode = 'static' }: Props) {
  const isUser = message.role === 'user'
  const [skipped, setSkipped] = useState(false)
  const [revealComplete, setRevealComplete] = useState(
    revealMode === 'static' || isUser
  )

  const handleClick = () => {
    if (!isUser && revealMode === 'live' && !skipped) {
      setSkipped(true)
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        data-testid="msg-bubble"
        onClick={handleClick}
        className={`max-w-[85%] rounded-lg px-5 py-4 ${
          isUser
            ? 'bg-zen-accent/15 text-zen-text'
            : 'bg-zen-surface text-zen-text'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <InkDropText
            text={message.content}
            mode={revealMode}
            skip={skipped}
            onComplete={() => setRevealComplete(true)}
          />
        )}
        {!isUser && message.referencedSegmentIds && (
          <div
            className="transition-opacity duration-200"
            style={{ opacity: revealComplete ? 1 : 0 }}
          >
            <SegmentReference ids={message.referencedSegmentIds} />
          </div>
        )}
        {!isUser && message.closingPractice && (
          <p
            className="mt-3 text-sm text-zen-accent border-t border-zen-muted/20 pt-3 transition-opacity duration-200"
            style={{ opacity: revealComplete ? 1 : 0 }}
          >
            ∙ {message.closingPractice}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm test --run tests/ChatMessage.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatMessage.tsx tests/ChatMessage.test.tsx
git commit -m "feat(components): ChatMessage gains revealMode + click-to-skip"
```

---

## Task 11: Wire `revealMode` into chat page

**Files:**
- Modify: `src/app/chat/page.tsx`

- [ ] **Step 1: Pass `revealMode` based on `freshAssistantIndex`**

Edit `src/app/chat/page.tsx`. Update the destructure to include `freshAssistantIndex`:

```typescript
const { session, status, error, roundNumber, freshAssistantIndex, send, retry, finishSession } =
  useChatSession(sessionId, apiKey, category)
```

Then in the messages mapping (around line 74), pass `revealMode`:

```tsx
{session.messages.map((m, i) => (
  <ChatMessage
    key={i}
    message={m}
    revealMode={i === freshAssistantIndex ? 'live' : 'static'}
  />
))}
```

- [ ] **Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Run all tests**

```bash
pnpm test --run
```

Expected: all green.

- [ ] **Step 4: Manual smoke**

```bash
pnpm dev:fresh
```

Open http://localhost:3000, run a chat round, verify:
- BreathingLoader appears during the call
- AI reply animates char-by-char on arrival
- Tapping the message during animation snaps the text to full
- Sending a second message: previous AI reply is now static, new one animates

Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add src/app/chat/page.tsx
git commit -m "feat(chat): live ink-drop reveal for fresh assistant turn"
```

---

## Task 12: Wire `revealMode='replay'` into history detail page

**Files:**
- Modify: `src/app/history/detail/page.tsx`

- [ ] **Step 1: Pass `revealMode='replay'` for assistant messages**

In `src/app/history/detail/page.tsx`, change the messages map (around line 29) to:

```tsx
{session.messages.map((m, i) => (
  <ChatMessage
    key={i}
    message={m}
    revealMode={m.role === 'assistant' ? 'replay' : 'static'}
  />
))}
```

- [ ] **Step 2: Type-check + tests**

```bash
pnpm exec tsc --noEmit && pnpm test --run
```

Expected: clean + all tests pass.

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev:fresh
```

Complete a chat session, navigate to /history → tap a session, verify each assistant message blooms in once on first scroll-into-view (scroll up and back down: no re-animation). Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/history/detail/page.tsx
git commit -m "feat(history): replay-mode ink-bloom for past assistant messages"
```

---

## Task 13: `SandArtExit` component (TDD)

**Files:**
- Create: `src/components/SandArtExit.tsx`
- Test: `tests/SandArtExit.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/SandArtExit.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { SandArtExit } from '@/components/SandArtExit'
import { setMatchMediaMatches } from './setup'

describe('SandArtExit', () => {
  beforeEach(() => {
    setMatchMediaMatches(false)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children when visible', () => {
    const { getByText } = render(
      <SandArtExit visible={true} onExited={() => {}}>
        <div>row content</div>
      </SandArtExit>
    )
    expect(getByText('row content')).toBeInTheDocument()
  })

  it('calls onExited after the exit animation duration when visible flips to false', () => {
    const onExited = vi.fn()
    const { rerender } = render(
      <SandArtExit visible={true} onExited={onExited}>
        <div>row content</div>
      </SandArtExit>
    )
    rerender(
      <SandArtExit visible={false} onExited={onExited}>
        <div>row content</div>
      </SandArtExit>
    )
    expect(onExited).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(onExited).toHaveBeenCalledTimes(1)
  })

  it('calls onExited on next tick under reduced motion (no animation wait)', () => {
    setMatchMediaMatches(true)
    const onExited = vi.fn()
    const { rerender } = render(
      <SandArtExit visible={true} onExited={onExited}>
        <div>row content</div>
      </SandArtExit>
    )
    rerender(
      <SandArtExit visible={false} onExited={onExited}>
        <div>row content</div>
      </SandArtExit>
    )
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(onExited).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm test --run tests/SandArtExit.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement component**

Create `src/components/SandArtExit.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const EXIT_DURATION_MS = 1000

interface Props {
  visible: boolean
  onExited: () => void
  children: React.ReactNode
}

export function SandArtExit({ visible, onExited, children }: Props) {
  const reduced = useReducedMotion()
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (visible) return
    setExiting(true)
    if (reduced) {
      const t = setTimeout(onExited, 0)
      return () => clearTimeout(t)
    }
    const t = setTimeout(onExited, EXIT_DURATION_MS)
    return () => clearTimeout(t)
  }, [visible, reduced, onExited])

  const style: React.CSSProperties = exiting && !reduced
    ? {
        opacity: 0,
        transform: 'scale(1.15)',
        filter: 'blur(8px)',
        transition: `opacity ${EXIT_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1), transform ${EXIT_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1), filter ${EXIT_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
        pointerEvents: 'none',
      }
    : exiting && reduced
    ? { opacity: 0, pointerEvents: 'none' }
    : {}

  return (
    <div style={style} data-testid="sand-art-exit" aria-hidden={exiting}>
      {children}
    </div>
  )
}
```

Note: the spec mentioned Framer Motion `<AnimatePresence>` but a CSS-transition approach is simpler, has no extra unmount choreography concerns, and is fully testable with fake timers. Framer Motion is still useful elsewhere if needed, but isn't required for this exit. We keep `framer-motion` in deps for `useReducedMotion` parity / future use.

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm test --run tests/SandArtExit.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/SandArtExit.tsx tests/SandArtExit.test.tsx
git commit -m "feat(components): SandArtExit (1s scale-blur-fade + onExited callback)"
```

---

## Task 14: Wire `SandArtExit` into `SessionListItem`

**Files:**
- Modify: `src/components/SessionListItem.tsx`

- [ ] **Step 1: Update `SessionListItem` to defer the actual delete until after exit**

Replace `src/components/SessionListItem.tsx` entirely:

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCategory } from '@/lib/categories'
import { deleteSession } from '@/lib/db'
import { SandArtExit } from './SandArtExit'
import type { Session } from '@/types/chat'

function fmtDate(t: number) {
  return new Date(t).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  session: Session
}

export function SessionListItem({ session }: Props) {
  const cat = getCategory(session.category)
  const firstUser = session.messages.find((m) => m.role === 'user')?.content ?? '(空)'
  const statusLabel =
    session.status === 'active' ? '進行中'
      : session.status === 'completed' ? '已完成'
      : '已放下'

  const [confirming, setConfirming] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(t)
  }, [confirming])

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirming) {
      setConfirming(true)
      return
    }
    if (session.id == null) return
    setExiting(true)
  }

  async function handleExited() {
    if (session.id == null) return
    setBusy(true)
    try {
      await deleteSession(session.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SandArtExit visible={!exiting} onExited={handleExited}>
      <div className="flex items-stretch bg-zen-surface border border-zen-muted/20 hover:border-zen-accent rounded-lg overflow-hidden transition-colors">
        <Link
          href={`/history/detail?id=${session.id}`}
          className="flex-1 p-5 min-w-0"
        >
          <div className="flex justify-between text-xs text-zen-muted">
            <span>{cat.label}</span>
            <span>{fmtDate(session.startedAt)} · {statusLabel}</span>
          </div>
          <p className="mt-2 text-zen-text line-clamp-2">{firstUser}</p>
        </Link>
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={busy || exiting}
          aria-label={confirming ? '確認放下這次對話' : '放下這次對話'}
          className={`px-4 text-xs border-l transition-colors ${
            confirming
              ? 'bg-zen-accent/15 text-zen-accent border-zen-accent/40 hover:bg-zen-accent/25 font-serif'
              : 'text-zen-muted border-zen-muted/20 hover:text-zen-accent hover:bg-zen-accent/5'
          } disabled:opacity-50`}
        >
          {busy ? '…' : confirming ? '心無罣礙' : '放下'}
        </button>
      </div>
    </SandArtExit>
  )
}
```

- [ ] **Step 2: Type-check + run all tests**

```bash
pnpm exec tsc --noEmit && pnpm test --run
```

Expected: clean + all tests pass.

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev:fresh
```

Go to /history, tap 放下 then 心無罣礙 on a session, verify: row dissolves over ~1s (scale up, blur, fade) before the row vanishes from the list. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/SessionListItem.tsx
git commit -m "feat(history): sand-art dissolve animation on session delete"
```

---

## Task 15: Reduced-motion sweep + final smoke

**Files:** none

- [ ] **Step 1: Run the entire test suite**

```bash
pnpm test --run
```

Expected: every test passes. Note the count — should be ~57+ (39 prior + new ones across Tasks 2, 4, 6, 7, 8, 9, 10, 13).

- [ ] **Step 2: Type-check + production build**

```bash
pnpm exec tsc --noEmit && pnpm build
```

Expected: clean typecheck, successful static export to `out/`.

- [ ] **Step 3: Manual smoke (normal motion)**

```bash
pnpm dev:fresh
```

Run the full happy path:
1. Start a fresh chat — see BreathingLoader during call
2. AI reply char-by-char animates in, segment-reference fades in after
3. Tap mid-animation: text snaps full
4. Send 2 more rounds, complete the session
5. Open /history → tap into the session: each assistant message blooms once on scroll-into-view
6. Back to /history → tap 放下 → 心無罣礙: row dissolves over ~1s

Document any visual regressions (none expected) and stop the dev server.

- [ ] **Step 4: Manual smoke (reduced motion)**

Enable OS-level reduced motion:
- Windows: Settings → Accessibility → Visual effects → toggle off "Animation effects"
- macOS: System Settings → Accessibility → Display → Reduce motion ON

Hard-refresh the browser. Re-run steps 1–6 from Step 3. Confirm:
- BreathingLoader is a static circle (no pulsing)
- AI replies render instantly (no per-char reveal)
- History detail messages render instantly (no bloom)
- 心無罣礙 deletes the row immediately (no dissolve)

Restore your reduced-motion setting if it was off before.

- [ ] **Step 5: Commit (only if any fixes were needed)**

If the smoke pass exposed a regression that required a code change, commit it now with a focused message. Otherwise, no commit.

- [ ] **Step 6: Update `TODO.md`**

Mark Phase 2 candidate #2 as complete by replacing its block in `TODO.md`:

```markdown
### 2. Zen animations (the differentiator) ✅ shipped 2026-05-06

Breathing Loader (soft-glow 5s cycle), Ink-Drop char-by-char reveal (client-side
animated, preserving callGemini contract), Sand-Art dissolve on session delete,
plus prefers-reduced-motion handling. See
`docs/superpowers/specs/2026-05-06-zen-animations-design.md`.
```

```bash
git add TODO.md
git commit -m "docs(todo): mark Zen animations (Phase 2 #2) as shipped"
```

---

## Done

The three animations are live, reduced-motion is honored, and existing API/persistence contracts are untouched. Suggested next steps from `TODO.md`:

- **#1 Other 4 dilemma categories** — easiest follow-up, mostly mechanical
- **#3 PWA proper** — manifest + Service Worker + offline UX
- **#4 API-key encryption** — Web Crypto, device-bound

If during Task 15 step 3 the wait-before-first-char felt too long subjectively, surface it as a separate spec for real Gemini streaming — do not retrofit it into this plan.

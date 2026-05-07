# Sutra Decoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layer a coherent gold-leaf decorative language across the app: a shared lotus SVG glyph, a `.gold-frame` double-line card class, a global header with lotus + title + thin gold rule, and a redesigned SegmentReference card.

**Architecture:** Pure presentation. Single `<symbol id="lotus-e">` mounted once at the top of `<body>`; consumers render `<svg><use href="#lotus-e"/></svg>`. Frame is one CSS class in `globals.css` using `box-shadow: inset` (no extra DOM). New `AppHeader` lives in `layout.tsx`. `CategoryGrid` and `SegmentReference` get the frame + lotus glyph applied in place. No new tests (presentational components per CLAUDE.md); manual smoke is the gate.

**Tech Stack:** TypeScript 5, Next.js 14 (App Router, static export), React 18 (server + client components), Tailwind CSS 3.

**Spec:** `docs/superpowers/specs/2026-05-07-sutra-decoration-design.md`

---

## File Structure

| File | Responsibility | Touched in |
|---|---|---|
| `src/components/Lotus.tsx` | NEW. Exports `LotusSymbol` (mounted once globally) and `LotusGlyph` (consumer with optional className). | Task 1 |
| `src/styles/globals.css` | Add `.gold-frame` component class via `@layer components`. | Task 2 |
| `src/components/AppHeader.tsx` | NEW. Header band: lotus + 心經數位道場 + thin gold rule. | Task 3 |
| `src/app/layout.tsx` | Mount `<LotusSymbol />` once + render `<AppHeader />` above `<main>`. | Task 3 |
| `src/components/CategoryGrid.tsx` | Apply `.gold-frame` + `<LotusGlyph>` next to each label. Remove the now-dead disabled-tile fallback. | Task 4 |
| `src/components/SegmentReference.tsx` | Restructure expanded view as a `.gold-frame` card with original / hairline rule / vernacular / lotus closing flourish / SEGMENT label. | Task 5 |

No new tests. No `tailwind.config.ts` change. No new packages.

---

## Task 1: Create the shared lotus SVG component

**Files:**
- Create: `src/components/Lotus.tsx`

- [ ] **Step 1: Create `src/components/Lotus.tsx`**

Write this exact content:

```tsx
import type { CSSProperties } from 'react'

const SYMBOL_HOST_STYLE: CSSProperties = {
  position: 'absolute',
  width: 0,
  height: 0,
  overflow: 'hidden',
}

/**
 * Mount once at the top of <body>. Defines the shared <symbol id="lotus-e">
 * that every <LotusGlyph> instance references via <use>.
 */
export function LotusSymbol() {
  return (
    <svg style={SYMBOL_HOST_STYLE} aria-hidden="true" focusable="false">
      <symbol id="lotus-e" viewBox="0 0 120 120">
        {/* back-left petal */}
        <g transform="rotate(-72 60 100)">
          <path
            d="M60 100 C 42 92, 43 60, 60 50 C 77 60, 78 92, 60 100 Z"
            fill="#a8843a"
          />
          <path
            d="M60 98 L 60 54"
            stroke="#5a4115"
            strokeWidth="0.6"
            fill="none"
          />
        </g>
        {/* back-right petal */}
        <g transform="rotate(72 60 100)">
          <path
            d="M60 100 C 42 92, 43 60, 60 50 C 77 60, 78 92, 60 100 Z"
            fill="#a8843a"
          />
          <path
            d="M60 98 L 60 54"
            stroke="#5a4115"
            strokeWidth="0.6"
            fill="none"
          />
        </g>
        {/* mid-left petal */}
        <g transform="rotate(-36 60 100)">
          <path
            d="M60 100 C 40 92, 41 56, 60 46 C 79 56, 80 92, 60 100 Z"
            fill="#c29a4a"
          />
          <path
            d="M60 98 L 60 50"
            stroke="#6a4d18"
            strokeWidth="0.7"
            fill="none"
          />
        </g>
        {/* mid-right petal */}
        <g transform="rotate(36 60 100)">
          <path
            d="M60 100 C 40 92, 41 56, 60 46 C 79 56, 80 92, 60 100 Z"
            fill="#c29a4a"
          />
          <path
            d="M60 98 L 60 50"
            stroke="#6a4d18"
            strokeWidth="0.7"
            fill="none"
          />
        </g>
        {/* front-center petal */}
        <g transform="rotate(0 60 100)">
          <path
            d="M60 100 C 38 90, 40 50, 60 38 C 80 50, 82 90, 60 100 Z"
            fill="#dfb866"
          />
          <path
            d="M60 98 L 60 42"
            stroke="#7a5a1a"
            strokeWidth="0.8"
            fill="none"
          />
        </g>
        {/* pistil */}
        <circle cx="60" cy="100" r="2.5" fill="#7a5a1a" />
      </symbol>
    </svg>
  )
}

interface LotusGlyphProps {
  className?: string
}

/**
 * Renders the lotus by referencing the shared <symbol id="lotus-e">.
 * Default size is w-6 h-6 (24px) if no className is provided.
 */
export function LotusGlyph({ className = 'w-6 h-6' }: LotusGlyphProps) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <use href="#lotus-e" />
    </svg>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`

Expected: clean (no errors).

- [ ] **Step 3: Run full test suite**

Run: `pnpm test --run`

Expected: 71 passing (no behavioural change yet).

- [ ] **Step 4: Commit**

```bash
git add src/components/Lotus.tsx
git commit -m "feat(components): Lotus.tsx — shared LotusSymbol + LotusGlyph"
```

---

## Task 2: Add `.gold-frame` component class

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Locate the `@layer components` block (or verify there is one)**

Run: `pnpm exec grep -n "@layer components" src/styles/globals.css` (or open in editor).

If a `@layer components { ... }` block already exists, append the new `.gold-frame` rule inside it. If not, append a new `@layer components { ... }` block at the end of the file.

- [ ] **Step 2: Add the `.gold-frame` class**

Append to (or create) the `@layer components` block:

```css
@layer components {
  .gold-frame {
    @apply bg-zen-surface;
    border: 1px solid rgba(201, 169, 97, 0.55);
    border-radius: 4px;
    box-shadow:
      inset 0 0 0 4px #1E1E1E,
      inset 0 0 0 5px rgba(201, 169, 97, 0.25);
  }
}
```

Notes for the implementer:
- The literal `#1E1E1E` matches `zen-surface` (defined in `tailwind.config.ts` as `surface: '#1E1E1E'`). It must be hardcoded inside `box-shadow:` because Tailwind's `theme()` function does not expand inside raw CSS property values, and `@apply` cannot be used inside multi-value `box-shadow`.
- `rgba(201, 169, 97, X)` is `zen-accent (#C9A961)` with alpha. Hardcoded for the same reason.

- [ ] **Step 3: Build to verify Tailwind compiles the layer**

Run: `pnpm build`

Expected: clean static export. The build will fail loudly if `@apply bg-zen-surface` cannot resolve the token.

- [ ] **Step 4: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(styles): .gold-frame double-line card class"
```

---

## Task 3: Create AppHeader and mount it globally

**Files:**
- Create: `src/components/AppHeader.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/components/AppHeader.tsx`**

Write:

```tsx
import { LotusGlyph } from './Lotus'

export function AppHeader() {
  return (
    <header className="flex items-center gap-3 px-6 py-5 border-b border-zen-accent/25">
      <LotusGlyph className="w-7 h-7" />
      <h1 className="font-serif text-xl tracking-[0.25em] text-zen-text">
        心經數位道場
      </h1>
    </header>
  )
}
```

This is a server component (no `'use client'` directive needed — it's pure markup).

- [ ] **Step 2: Update `src/app/layout.tsx` to mount LotusSymbol + AppHeader**

Read the current file first to confirm its shape; expected current content:

```tsx
import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'SutraMind — 智慧心經導師',
  description: '一個極致私密的數位心靈空間。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hant">
      <body className="bg-zen-bg text-zen-text antialiased">
        <main className="min-h-screen mx-auto max-w-2xl px-6 py-12">
          {children}
        </main>
      </body>
    </html>
  )
}
```

Replace it with:

```tsx
import type { Metadata } from 'next'
import { LotusSymbol } from '@/components/Lotus'
import { AppHeader } from '@/components/AppHeader'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'SutraMind — 智慧心經導師',
  description: '一個極致私密的數位心靈空間。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hant">
      <body className="bg-zen-bg text-zen-text antialiased min-h-screen">
        <LotusSymbol />
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-12">
          {children}
        </main>
      </body>
    </html>
  )
}
```

Notes:
- `min-h-screen` moved from `<main>` to `<body>` so the gold rule under the header doesn't end at the bottom of `<main>` short content (e.g., the route-guard "redirecting…" splash on `/`).
- `LotusSymbol` is a hidden 0×0 SVG; placing it before `<AppHeader />` is required because `<use href="#lotus-e">` needs the symbol present in the DOM before any consumer renders.

- [ ] **Step 3: Typecheck and full test suite**

Run: `pnpm exec tsc --noEmit && pnpm test --run`

Expected: clean typecheck; 71 passing.

- [ ] **Step 4: Production build**

Run: `pnpm build`

Expected: clean static export.

- [ ] **Step 5: Commit**

```bash
git add src/components/AppHeader.tsx src/app/layout.tsx
git commit -m "feat(layout): global AppHeader (lotus + 心經數位道場 + gold rule)"
```

---

## Task 4: Apply gold-frame + lotus to CategoryGrid

**Files:**
- Modify: `src/components/CategoryGrid.tsx`

- [ ] **Step 1: Replace the file entirely**

Current file uses ad-hoc `border` styling and includes a now-dead `!c.enabled` branch (all 5 categories enabled in the four-categories work). Replace `src/components/CategoryGrid.tsx` with:

```tsx
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
```

Notes:
- The disabled branch (`!c.enabled`, `bg-zen-surface/40 opacity-50 cursor-not-allowed`, the `即將開放` label) is removed. All 5 categories are enabled per `tests/categories.test.ts:'all 5 categories are enabled'`; the disabled fallback is unreachable code.
- `Props.onSelect` signature is unchanged — no callers need updating.
- `hover:border-zen-accent` bumps the outer 1px gold border from 0.55 → 1.0 alpha on hover; the inner inset shadow line is unchanged.

- [ ] **Step 2: Typecheck and full test suite**

Run: `pnpm exec tsc --noEmit && pnpm test --run`

Expected: clean; 71 passing. The existing `tests/categories.test.ts` does not touch the rendered output, so removing the disabled branch does not break tests.

- [ ] **Step 3: Production build**

Run: `pnpm build`

Expected: clean static export.

- [ ] **Step 4: Commit**

```bash
git add src/components/CategoryGrid.tsx
git commit -m "feat(categories): gold-frame tiles with lotus glyph; remove dead disabled branch"
```

---

## Task 5: Apply gold-frame + lotus closing flourish to SegmentReference

**Files:**
- Modify: `src/components/SegmentReference.tsx`

- [ ] **Step 1: Replace the file entirely**

Replace `src/components/SegmentReference.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import sutraDB from '@/data/sutra-db.json'
import { getSegmentById } from '@/lib/sutra'
import { LotusGlyph } from './Lotus'
import type { SutraSegment } from '@/types/chat'

const db = sutraDB as SutraSegment[]

interface Props {
  ids: string[]
}

export function SegmentReference({ ids }: Props) {
  const [open, setOpen] = useState(false)
  const segments = ids.map((id) => getSegmentById(db, id)).filter(Boolean) as SutraSegment[]
  if (segments.length === 0) return null

  return (
    <div className="mt-3 text-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-zen-muted hover:text-zen-accent"
      >
        {open ? '▼' : '▶'} 引用：般若波羅蜜多心經 §
        {segments.map((s) => s.id.split('_')[1]).join(', ')}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-4">
          {segments.map((s) => (
            <div key={s.id} className="gold-frame px-8 py-7 text-center">
              <p className="font-serif text-zen-text text-xl tracking-[0.5em] leading-relaxed">
                {s.original}
              </p>
              <div className="w-15 h-px bg-zen-accent/40 mx-auto my-3" style={{ width: '60px' }} />
              <p className="text-zen-muted leading-relaxed">{s.vernacular}</p>
              <LotusGlyph className="w-9 h-9 mx-auto mt-4" />
              <p className="text-[10px] tracking-[2px] text-zen-muted/70 mt-1">
                SEGMENT {s.id.split('_')[1]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

Notes:
- The previous `border-l-2 border-zen-accent/50 pl-4` left-border style is replaced by the centered `.gold-frame` card.
- `tracking-[0.5em]` matches the mockup's wider tracking on the original sutra text (8px ≈ 0.5em at 16px).
- Inline `style={{ width: '60px' }}` is used because Tailwind 3 doesn't have a `w-15` utility; the arbitrary `w-[60px]` would also work but inline style is clearer here for a one-off rule.
- `Props.ids` and the `if (segments.length === 0) return null` early return are unchanged — callers in `ChatMessage` need no update.

- [ ] **Step 2: Typecheck and full test suite**

Run: `pnpm exec tsc --noEmit && pnpm test --run`

Expected: clean; 71 passing.

- [ ] **Step 3: Production build**

Run: `pnpm build`

Expected: clean static export.

- [ ] **Step 4: Commit**

```bash
git add src/components/SegmentReference.tsx
git commit -m "feat(chat): SegmentReference rendered as gold-frame card with lotus flourish"
```

---

## Task 6: Manual smoke (Kenny-driven)

**Files:** none. This task cannot be executed by a subagent — it requires a real browser and human aesthetic judgement. A subagent assigned this task should produce the checklist below as its deliverable and stop.

- [ ] **Step 1: Sanity check before opening the browser**

Run: `pnpm exec tsc --noEmit && pnpm test --run && pnpm build`

Expected: clean typecheck, 71 tests passing, successful static export to `out/`.

- [ ] **Step 2: Start dev server**

Run: `pnpm dev:fresh`

Open http://localhost:3000 with a valid Gemini API key already in IndexedDB.

- [ ] **Step 3: Header smoke**

Visit each route and confirm the header (lotus + 心經數位道場 + thin gold rule) appears at the top of every page:

- `/setup`
- `/categories`
- `/chat?category=emotion_relation` (any category)
- `/history`
- `/history/detail?id=<some session id>`

- [ ] **Step 4: Category grid smoke**

On `/categories`:
- All 5 tiles have a gold double-line frame.
- Each tile has a small lotus glyph beside the label.
- Hovering a tile bumps the outer border from soft to brighter gold; the inner line is unchanged.
- No `即將開放` text anywhere on the page.

- [ ] **Step 5: SegmentReference smoke**

Start a fresh chat and complete one round so an AI reply renders with a sutra reference:
- Tap the `▶ 引用：般若波羅蜜多心經 §N` toggle.
- Expanded panel: gold-frame card; original sutra text in serif with wider letter-spacing; 60px hairline rule; vernacular below; lotus closing flourish; tiny `SEGMENT N` label.
- Tap the toggle again — collapses cleanly back to the button.

- [ ] **Step 6: Animation regression check**

- BreathingLoader during AI thinking — still pulses on chat send.
- InkDropText reveal of the fresh assistant reply — char-by-char animation still works; clicking mid-animation snaps full.
- /history/detail replay-mode bloom — still triggers on scroll.
- /history sand-art dissolve on session delete — still runs.

- [ ] **Step 7: Reduced-motion check**

Toggle OS-level "Reduce motion" on, refresh — confirm:
- BreathingLoader → static glow.
- InkDropText → no per-char stagger.
- SandArtExit → no scale/blur transition.
- The decoration (lotus, frame, header) is intentionally static and looks identical to normal-motion mode. No regression expected.

- [ ] **Step 8: Stop dev server, sign off**

Stop dev server (`Ctrl+C`). Mark Task 6 complete only if all of Steps 3–7 pass. If any visual issue surfaces (e.g., gold too bright on a particular surface, lotus position wrong, frame too strong/weak on tiles vs SegmentReference), report which surface and what feels off — Kenny + Claude iterate inline by tweaking the relevant component or `globals.css`.

---

## Self-review summary

- **Spec coverage:**
  - §3 locked choices (B/C/E/H) — encoded in Tasks 1, 2, 3, 4, 5.
  - §4 architecture — Tasks 1+2+3 build the shared assets; Tasks 4+5 wire them into existing components.
  - §5.1 Lotus.tsx — Task 1.
  - §5.2 AppHeader — Task 3.
  - §5.3 layout.tsx — Task 3.
  - §5.4 CategoryGrid — Task 4.
  - §5.5 SegmentReference — Task 5.
  - §5.6 globals.css — Task 2.
  - §6 visual specifications — every value referenced in Tasks 1–5 (lotus colors, frame box-shadow, header tracking, lotus sizes, segment-reference letter-spacing, hairline width).
  - §7 data flow (none) / §8 error handling (none) — no tasks needed.
  - §9 testing — Task 6 (manual smoke).
  - §10 acceptance criteria — Tasks 3, 4, 5 satisfy bullets 1–4; Task 6 verifies bullets 5–7.
- **Placeholder scan:** no "TBD" / "TODO" / hand-wavy language; every code step shows the code; every command shows expected output.
- **Type consistency:**
  - `LotusSymbol` (no props), `LotusGlyph` (`{ className?: string }`) — used consistently in Tasks 1, 3, 4, 5.
  - `Props.onSelect` on `CategoryGrid` unchanged — no caller updates needed.
  - `Props.ids` on `SegmentReference` unchanged — `ChatMessage` caller untouched.
  - `.gold-frame` class name used identically in Tasks 4, 5.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-07-sutra-decoration-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task with two-stage review.
2. **Inline Execution** — execute tasks in this session with checkpoints.

Either way, **Task 6 (manual smoke) must be run by Kenny** — subagents can't drive a browser or judge aesthetics; they would produce the checklist as their deliverable and stop.

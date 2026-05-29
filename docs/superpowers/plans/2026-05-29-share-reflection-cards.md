# Shareable Reflection Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user export the 今日靜觀 Daily Insight as a 1080×1080 gold-frame PNG and share it via the native share sheet (or download), entirely in-browser.

**Architecture:** A pure card renderer draws the insight onto an off-screen canvas (Canvas 2D, no new dependency); a share helper hands the PNG to the Web Share API with a download fallback; a button on the `DailyInsightCard` (shown state only) ties them together behind a preview overlay. No backend, no network, no telemetry.

**Tech Stack:** Next.js 14 (static export), React 18, TypeScript, Canvas 2D, Web Share API, Vitest. Spec: `docs/superpowers/specs/2026-05-29-share-reflection-cards-design.md`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/lib/mirror-colors.ts` | MODIFY. Add `ZEN_BG = '#121212'` (canvas needs a literal hex for the ground). |
| `src/lib/share-card.ts` | NEW. `renderInsightCard(input): Promise<Blob>` + pure `wrapText(text, maxWidth, measure)`. |
| `src/lib/share-image.ts` | NEW. `shareOrDownloadImage(blob, filename, meta)` + pure `canUseFileShare(nav, file)`. |
| `src/components/MindMirror/ShareInsightButton.tsx` | NEW. Button → render → preview overlay → share/download. |
| `src/components/MindMirror/DailyInsightCard.tsx` | MODIFY. Render `<ShareInsightButton>` in the `status === 'shown'` block. |
| `tests/share-card.test.ts` | NEW. `wrapText` unit tests. |
| `tests/share-image.test.ts` | NEW. `canUseFileShare` unit tests. |

Note: the spec mentioned adding `ZEN_SURFACE` too, but the card only needs `ZEN_BG`; omitting the unused export keeps the module clean. Conventions: Zen vocabulary, no native dialogs (the overlay is a React element, not `window.confirm`), `zen-*` tokens / `zen-glow-button` / `gold-frame`.

---

## Task 1: Card renderer (`share-card.ts`)

**Files:**
- Modify: `src/lib/mirror-colors.ts`
- Create: `src/lib/share-card.ts`
- Test: `tests/share-card.test.ts`

- [ ] **Step 1: Add `ZEN_BG` to mirror-colors**

Append to `src/lib/mirror-colors.ts` (after the existing exports):

```ts
export const ZEN_BG = '#121212'
```

- [ ] **Step 2: Write the failing `wrapText` test**

Create `tests/share-card.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { wrapText } from '@/lib/share-card'

// measure = 1 width unit per character → maxWidth behaves like "max chars"
const byChar = (s: string) => Array.from(s).length

describe('wrapText', () => {
  it('returns [] for empty text', () => {
    expect(wrapText('', 5, byChar)).toEqual([])
  })

  it('keeps text on one line when it fits', () => {
    expect(wrapText('觀自在', 10, byChar)).toEqual(['觀自在'])
  })

  it('keeps text on one line when it fits exactly', () => {
    expect(wrapText('一二三', 3, byChar)).toEqual(['一二三'])
  })

  it('wraps at the measured boundary', () => {
    expect(wrapText('一二三四五六', 3, byChar)).toEqual(['一二三', '四五六'])
  })

  it('never drops a character even if a single char exceeds maxWidth', () => {
    expect(wrapText('一二三', 0, byChar)).toEqual(['一', '二', '三'])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run tests/share-card.test.ts`
Expected: FAIL — cannot resolve import `@/lib/share-card`.

- [ ] **Step 4: Write `share-card.ts`**

Create `src/lib/share-card.ts`:

```ts
import { ZEN_ACCENT, ZEN_BG, ZEN_MUTED, ZEN_TEXT } from '@/lib/mirror-colors'

export interface InsightCardInput {
  sutraOriginal: string
  reflection: string
}

const SIZE = 1080
const APP_URL = 'kennyyytu0328.github.io/PWA_SutraMind'
const SERIF = '"Noto Serif TC", serif'
const SANS = '"Noto Sans TC", sans-serif'

/** Greedy per-character wrap (CJK has no word spaces). Pure: width via `measure`. */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number
): string[] {
  if (text.length === 0) return []
  const lines: string[] = []
  let current = ''
  for (const ch of Array.from(text)) {
    const candidate = current + ch
    if (current !== '' && measure(candidate) > maxWidth) {
      lines.push(current)
      current = ch
    } else {
      current = candidate
    }
  }
  if (current !== '') lines.push(current)
  return lines
}

function lotusSvg(size: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}">` +
    `<g transform="rotate(-72 60 100)"><path d="M60 100 C 42 92, 43 60, 60 50 C 77 60, 78 92, 60 100 Z" fill="#a8843a"/></g>` +
    `<g transform="rotate(72 60 100)"><path d="M60 100 C 42 92, 43 60, 60 50 C 77 60, 78 92, 60 100 Z" fill="#a8843a"/></g>` +
    `<g transform="rotate(-36 60 100)"><path d="M60 100 C 40 92, 41 56, 60 46 C 79 56, 80 92, 60 100 Z" fill="#c29a4a"/></g>` +
    `<g transform="rotate(36 60 100)"><path d="M60 100 C 40 92, 41 56, 60 46 C 79 56, 80 92, 60 100 Z" fill="#c29a4a"/></g>` +
    `<g transform="rotate(0 60 100)"><path d="M60 100 C 38 90, 40 50, 60 38 C 80 50, 82 90, 60 100 Z" fill="#dfb866"/></g>` +
    `<circle cx="60" cy="100" r="2.5" fill="#7a5a1a"/>` +
    `</svg>`
  )
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('lotus image failed to load'))
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

/** Draw centered text with manual per-character spacing (avoids ctx.letterSpacing). */
function drawSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number
): void {
  const chars = Array.from(text)
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1)
  let x = cx - total / 2
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y)
    x += widths[i] + spacing
  }
  ctx.textAlign = prevAlign
}

export async function renderInsightCard(input: InsightCardInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D not supported')

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  // ground + soft gold vignette
  ctx.fillStyle = ZEN_BG
  ctx.fillRect(0, 0, SIZE, SIZE)
  const vignette = ctx.createRadialGradient(
    SIZE / 2, SIZE * 0.42, SIZE * 0.08,
    SIZE / 2, SIZE / 2, SIZE * 0.75
  )
  vignette.addColorStop(0, 'rgba(201,169,97,0.08)')
  vignette.addColorStop(1, 'rgba(18,18,18,0)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, SIZE, SIZE)

  // gold double-line frame
  const inset = 48
  ctx.strokeStyle = ZEN_ACCENT
  ctx.lineWidth = 2
  ctx.strokeRect(inset, inset, SIZE - 2 * inset, SIZE - 2 * inset)
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1
  ctx.strokeRect(inset + 9, inset + 9, SIZE - 2 * (inset + 9), SIZE - 2 * (inset + 9))
  ctx.globalAlpha = 1

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // top lotus
  const lotus = await loadSvgImage(lotusSvg(150))
  ctx.drawImage(lotus, SIZE / 2 - 75, 140, 150, 150)

  // title
  ctx.fillStyle = ZEN_MUTED
  ctx.font = `300 34px ${SERIF}`
  drawSpaced(ctx, '今日靜觀', SIZE / 2, 350, 14)

  // body fonts + wrapping
  const sutraFont = `500 50px ${SERIF}`
  const reflFont = `400 38px ${SERIF}`
  const sutraSpacing = 6
  const sutraLH = 80
  const reflLH = 64
  const GAP1 = 28 // sutra → divider
  const GAP2 = 60 // divider → reflection
  const sutraMax = SIZE - 2 * (inset + 90)
  const reflMax = SIZE - 2 * (inset + 80)

  ctx.font = sutraFont
  const sutraLines = wrapText(input.sutraOriginal, sutraMax, (s) =>
    ctx.measureText(s).width + sutraSpacing * Math.max(0, Array.from(s).length - 1)
  )
  ctx.font = reflFont
  const reflLines = wrapText(input.reflection, reflMax, (s) => ctx.measureText(s).width)

  // vertically center the text block in the region between lotus and wordmark
  const regionTop = 400
  const regionBottom = SIZE - 230
  const approxH =
    sutraLines.length * sutraLH + GAP1 + GAP2 + Math.max(0, reflLines.length - 1) * reflLH
  let y = regionTop + Math.max(0, (regionBottom - regionTop - approxH) / 2)

  // sutra
  ctx.fillStyle = ZEN_TEXT
  ctx.font = sutraFont
  for (const line of sutraLines) {
    drawSpaced(ctx, line, SIZE / 2, y, sutraSpacing)
    y += sutraLH
  }

  // divider
  y += GAP1
  ctx.strokeStyle = ZEN_ACCENT
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(SIZE / 2 - 40, y)
  ctx.lineTo(SIZE / 2 + 40, y)
  ctx.stroke()
  ctx.globalAlpha = 1
  y += GAP2

  // reflection
  ctx.fillStyle = ZEN_TEXT
  ctx.font = reflFont
  for (const line of reflLines) {
    ctx.fillText(line, SIZE / 2, y)
    y += reflLH
  }

  // bottom wordmark + url
  const smallLotus = await loadSvgImage(lotusSvg(44))
  ctx.drawImage(smallLotus, SIZE / 2 - 22, SIZE - 205, 44, 44)
  ctx.fillStyle = ZEN_MUTED
  ctx.font = `400 30px ${SERIF}`
  drawSpaced(ctx, '心經數位道場', SIZE / 2, SIZE - 132, 10)
  ctx.font = `400 22px ${SANS}`
  ctx.fillStyle = 'rgba(138,128,121,0.7)'
  ctx.fillText(APP_URL, SIZE / 2, SIZE - 96)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      'image/png'
    )
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run tests/share-card.test.ts`
Expected: PASS — all 5 `wrapText` tests green. (`renderInsightCard` is not unit-tested; jsdom lacks a real Canvas 2D — it's covered by manual smoke in Task 4.)

- [ ] **Step 6: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mirror-colors.ts src/lib/share-card.ts tests/share-card.test.ts
git commit -m "feat(share): insight card canvas renderer + wrapText tests"
```

---

## Task 2: Share/download helper (`share-image.ts`)

**Files:**
- Create: `src/lib/share-image.ts`
- Test: `tests/share-image.test.ts`

- [ ] **Step 1: Write the failing `canUseFileShare` test**

Create `tests/share-image.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { canUseFileShare } from '@/lib/share-image'

const file = new File([new Blob(['x'])], 'a.png', { type: 'image/png' })

describe('canUseFileShare', () => {
  it('is true when canShare+share exist and canShare returns true', () => {
    const nav = { canShare: () => true, share: async () => {} } as unknown as Navigator
    expect(canUseFileShare(nav, file)).toBe(true)
  })

  it('is false when the APIs are absent', () => {
    expect(canUseFileShare({} as Navigator, file)).toBe(false)
  })

  it('is false when canShare returns false for the file', () => {
    const nav = { canShare: () => false, share: async () => {} } as unknown as Navigator
    expect(canUseFileShare(nav, file)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/share-image.test.ts`
Expected: FAIL — cannot resolve import `@/lib/share-image`.

- [ ] **Step 3: Write `share-image.ts`**

Create `src/lib/share-image.ts`:

```ts
export function canUseFileShare(nav: Navigator, file: File): boolean {
  return (
    typeof nav.canShare === 'function' &&
    typeof nav.share === 'function' &&
    nav.canShare({ files: [file] })
  )
}

/**
 * Share the PNG via the Web Share API when files are supported, otherwise
 * trigger a download. Returns which path was taken. A user-cancelled share
 * sheet (AbortError) is treated as a successful no-op, not an error.
 */
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  meta: { title: string; text: string }
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })

  if (canUseFileShare(navigator, file)) {
    try {
      await navigator.share({ files: [file], title: meta.title, text: meta.text })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared'
      }
      throw err
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/share-image.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/share-image.ts tests/share-image.test.ts
git commit -m "feat(share): Web Share helper with download fallback + tests"
```

---

## Task 3: Share button + wire into DailyInsightCard

No unit test — presentational UI verified by manual smoke (Task 4). The logic it calls is already covered by Tasks 1-2.

**Files:**
- Create: `src/components/MindMirror/ShareInsightButton.tsx`
- Modify: `src/components/MindMirror/DailyInsightCard.tsx`

- [ ] **Step 1: Create the share button + preview overlay**

Create `src/components/MindMirror/ShareInsightButton.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { renderInsightCard } from '@/lib/share-card'
import { shareOrDownloadImage } from '@/lib/share-image'
import { todayLocalISO } from '@/lib/date-utils'
import { BreathingLoader } from '@/components/BreathingLoader'

interface Props {
  sutraOriginal: string
  reflection: string
}

type State = 'idle' | 'rendering' | 'preview' | 'error'

export function ShareInsightButton({ sutraOriginal, reflection }: Props) {
  const [state, setState] = useState<State>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)

  async function handleGenerate() {
    setState('rendering')
    try {
      const b = await renderInsightCard({ sutraOriginal, reflection })
      setBlob(b)
      setImageUrl(URL.createObjectURL(b))
      setState('preview')
    } catch (err) {
      console.warn('[share] render failed', err)
      setState('error')
    }
  }

  async function handleShare() {
    if (!blob) return
    try {
      await shareOrDownloadImage(
        blob,
        `sutramind-insight-${todayLocalISO()}.png`,
        { title: '今日靜觀 · 心經數位道場', text: '與心經對坐片刻。' }
      )
    } catch (err) {
      console.warn('[share] share failed', err)
      setState('error')
    }
  }

  function handleClose() {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setBlob(null)
    setState('idle')
  }

  if (state === 'rendering') {
    return (
      <div className="mt-1" aria-live="polite">
        <BreathingLoader />
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleGenerate}
        className="border border-zen-accent/60 text-zen-accent px-5 py-2 text-sm tracking-widest hover:bg-zen-accent/10"
      >
        分享此刻
      </button>

      {state === 'error' && (
        <p className="mt-1 text-xs text-zen-muted">生成失敗，再試一次。</p>
      )}

      {state === 'preview' && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={handleClose}
        >
          <div
            className="flex flex-col items-center gap-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt="今日靜觀分享卡片"
              className="w-full rounded-md shadow-2xl"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="zen-glow-button px-6 py-3"
              >
                分享
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="border border-zen-muted/30 text-zen-muted px-6 py-3 rounded-md hover:border-zen-accent hover:text-zen-accent"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Render it in the shown insight**

In `src/components/MindMirror/DailyInsightCard.tsx`, add the import after the existing component imports (the `InkDropText` import line):

```tsx
import { ShareInsightButton } from '@/components/MindMirror/ShareInsightButton'
```

Then, in the `status === 'shown' && insight && segment` block, add the button immediately after the closing bottom `<LotusGlyph className="w-4 h-4 opacity-50" />`, still inside that block's `<div>`:

```tsx
          <LotusGlyph className="w-4 h-4 opacity-50" />
          <ShareInsightButton
            sutraOriginal={segment.original}
            reflection={insight.reflection}
          />
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/MindMirror/ShareInsightButton.tsx src/components/MindMirror/DailyInsightCard.tsx
git commit -m "feat(share): 分享此刻 button + preview overlay on Daily Insight"
```

---

## Task 4: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `pnpm test`
Expected: all suites pass, including `tests/share-card.test.ts` (5) and `tests/share-image.test.ts` (3).

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build (static export)**

Run: `pnpm build`
Expected: build succeeds (no route added, so page count is unchanged from the prior build).

- [ ] **Step 4: Manual browser smoke**

Run `pnpm dev:fresh` (cleans `.next`/`out` after the build, then dev). With an API key stored and at least one day of analytics:
- Go to `/mirror` → 今日靜觀 card → tap 請示今日靜觀 (if not already shown).
- Once the reflection shows, tap **分享此刻** → BreathingLoader → preview overlay appears with the rendered 1080×1080 card: gold frame, lotus, 今日靜觀, the sutra line (wrapped), divider, the reflection (wrapped), 心經數位道場 + the github.io URL.
- Verify spacing looks balanced. If vertical spacing is off for a very long sutra/reflection, nudge the constants in `renderInsightCard` (`sutraLH`, `reflLH`, `GAP1`, `GAP2`, `regionTop`, `regionBottom`) and re-check.
- On desktop: tap 分享 → a PNG downloads as `sutramind-insight-<today>.png`. Open it to confirm fidelity.
- On a mobile device / device-emulation with share support: tap 分享 → the native share sheet opens with the image; cancelling it does not throw (check console).
- Tap 關閉 → overlay closes, no console errors.

- [ ] **Step 5: Commit (only if Step 4 required spacing tweaks)**

```bash
git add src/lib/share-card.ts
git commit -m "fix(share): tune insight card vertical spacing"
```

---

## Self-Review notes (author)

- **Spec coverage:** renderer + wrapText (Task 1), Web Share + fallback + canUseFileShare (Task 2), button/preview-overlay wired to the shown Daily Insight (Task 3), unit tests for both pure helpers + build/static check + manual smoke (Tasks 1,2,4). Card layout, colors, font, URL, privacy (reflection-only + preview), user-activation (share fires from overlay gesture) all reflected.
- **Type consistency:** `InsightCardInput { sutraOriginal, reflection }` defined in Task 1 is exactly what `ShareInsightButton` passes in Task 3 (`segment.original`, `insight.reflection`). `shareOrDownloadImage(blob, filename, meta{title,text})` signature matches its call site. `canUseFileShare(nav, file)` matches its test and its use inside `shareOrDownloadImage`.
- **No placeholders:** every code step is complete and runnable; the only tunables (vertical spacing constants) are real values with a smoke-time adjustment note, not placeholders.
- **Deviation from spec:** added only `ZEN_BG` (not `ZEN_SURFACE`) to avoid an unused export — the card ground uses `ZEN_BG`.

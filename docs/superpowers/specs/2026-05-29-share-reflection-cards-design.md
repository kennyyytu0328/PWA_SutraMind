# Shareable Reflection Cards — Design

**Date:** 2026-05-29
**Status:** Approved (design), pending implementation plan
**Topic:** Let a user export the 今日靜觀 Daily Insight as a beautiful gold-frame image and share it — 100% client-side.

## Problem & goal

The app's gold-leaf aesthetic is a genuine differentiator, but nothing leaves the
browser, so there's no organic discovery loop. A shareable reflection card turns
the existing 今日靜觀 (Daily Insight) into an image the user can post. It is
generated entirely in-browser; nothing is uploaded anywhere. Each card carries
the wordmark + URL, so it becomes a privacy-safe viral loop:

```
card seen on social → kennyyytu0328.github.io/PWA_SutraMind → welcome landing + /preview → convert
```

This is idea #2 from the popularity discussion; it feeds the welcome/preview
funnel shipped 2026-05-29 (`2026-05-29-preview-onboarding-design.md`).

## Decisions (locked with user)

| Decision | Choice |
|---|---|
| Card source | **Daily Insight only** (今日靜觀: sutra line + Gemma reflection) |
| Export size | **Square 1080×1080** only |
| Rendering | **Canvas 2D**, no new dependency |
| Font | **System serif** (`"Noto Serif TC", serif`) — same as the app |
| App URL on card | `kennyyytu0328.github.io/PWA_SutraMind` |

## Non-goals (YAGNI)

- Portrait / 3:4 export, size toggle.
- Sharing a session's `mind_summary` / closing practice (separate entry points).
- Bundling a CJK webfont (reflection text is arbitrary → cannot subset; a full
  CJK serif is multi-MB, not worth it for a PWA).
- Multiple card templates / themes.

All are easy to add later on top of this foundation.

## Architecture (3 small units + 1 wiring + 1 color addition)

| Path | Responsibility |
|---|---|
| `src/lib/share-card.ts` | NEW. `renderInsightCard(input): Promise<Blob>` draws the 1080×1080 PNG. Exports pure `wrapText(text, maxWidth, measure)`. |
| `src/lib/share-image.ts` | NEW. `shareOrDownloadImage(blob, filename, meta)`. Exports pure `canUseFileShare(nav, file)`. |
| `src/components/MindMirror/ShareInsightButton.tsx` | NEW. Button → generate → in-flow preview overlay → share/download. |
| `src/components/MindMirror/DailyInsightCard.tsx` | MODIFY. Render `<ShareInsightButton>` in the `status === 'shown'` block. |
| `src/lib/mirror-colors.ts` | MODIFY. Add `ZEN_BG = '#121212'` and `ZEN_SURFACE = '#1E1E1E'` (canvas needs literal hex; the file already exists for exactly this "non-Tailwind contexts" purpose). |

### `share-card.ts`

```ts
export interface InsightCardInput {
  sutraOriginal: string  // segment.original — the 經文 line
  reflection: string     // insight.reflection — Gemma's gentle distillation
}

export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number
): string[]

export function renderInsightCard(input: InsightCardInput): Promise<Blob>
```

- `wrapText`: greedy per-character accumulation (CJK has no word spaces). Pure —
  takes a `measure` fn so it's unit-tested without a canvas. Breaks on width;
  preserves existing characters including punctuation.
- `renderInsightCard`: creates an off-screen 1080×1080 `<canvas>`, fills the
  ground + vignette, draws the gold double-line frame, rasterizes the **existing
  lotus SVG** (build the `<symbol>` path markup as an SVG string → data URL →
  `Image` → `drawImage`; no external refs, so no canvas taint), draws title /
  sutra (via `wrapText`) / divider / reflection (via `wrapText`) / wordmark +
  URL, then resolves `canvas.toBlob(..., 'image/png')`. Uses
  `await document.fonts.ready` before drawing so the serif is settled.

### `share-image.ts`

```ts
export function canUseFileShare(nav: Navigator, file: File): boolean

export function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  meta: { title: string; text: string }
): Promise<'shared' | 'downloaded'>
```

- `canUseFileShare`: `typeof nav.canShare === 'function' && nav.canShare({ files: [file] })`.
  Pure given an injected `nav` → unit-testable.
- `shareOrDownloadImage`: wrap blob in a `File`; if `canUseFileShare`, call
  `nav.share({ files, title, text })` → `'shared'`; else create an object URL,
  click a temporary `<a download={filename}>`, revoke the URL → `'downloaded'`.
  If `nav.share` rejects with `AbortError` (user cancelled the sheet), swallow it
  (not an error).

### `ShareInsightButton.tsx`

- Props: `{ sutraOriginal: string; reflection: string }`.
- State: `'idle' | 'rendering' | 'preview' | 'error'` + the generated object URL.
- Flow: tap 「分享此刻」 → `rendering` (BreathingLoader) → `renderInsightCard` →
  `preview`: a lightweight in-flow overlay (React, **not** a native dialog) shows
  the card `<img>` + two buttons: **分享** (calls `shareOrDownloadImage`, fired
  from this gesture to keep Web Share's user-activation valid) and **關閉**.
  Errors → a quiet zen line, with retry.
- Filename: `sutramind-insight-<YYYY-MM-DD>.png` (ASCII-safe). Date via
  `todayLocalISO()`.

## Card layout (1080×1080)

```
zen-bg #121212 ground + soft radial vignette
 ╔══════════════════════════════╗   gold double-line frame (echoes .gold-frame),
 ║            (lotus)           ║   ~48px inset, accent #C9A961
 ║           今 日 靜 觀         ║   small, letter-spaced, muted-gold
 ║                              ║
 ║   觀自在菩薩，行深般若波羅    ║   sutra original · serif · letter-spaced
 ║   蜜多時…                    ║   · centered · wrapText
 ║          ──────              ║   ~60px gold divider, accent @ 0.4
 ║   你此刻的緊繃，並非來自      ║   reflection · serif body · text color
 ║   現實，而來自緊抓的想像…    ║   · centered · wrapText
 ║                              ║
 ║      ❀  心經數位道場          ║   small lotus + wordmark (muted)
 ║   kennyyytu0328.github.io/…  ║   URL (muted, smaller) — the funnel hook
 ╚══════════════════════════════╝
```

Colors: `ZEN_BG #121212`, `ZEN_SURFACE #1E1E1E`, `ZEN_TEXT #EAE0D5`,
`ZEN_MUTED #8A8079`, `ZEN_ACCENT #C9A961`; lotus golds `#a8843a / #c29a4a /
#dfb866` (inside the rasterized SVG). Font stack `"Noto Serif TC", serif`.

## Privacy

- The card shows only the **sutra line + the reflection** (Gemma's distillation),
  never raw chat input or metrics.
- The **preview overlay** means the user sees exactly what will ship before
  tapping share — explicit consent.
- No server, no telemetry, no network. Web Share / download are local browser
  APIs. Fully consistent with the BYOK / client-only hard rules.

## Entry point

Only the `DailyInsightCard` `status === 'shown'` state renders the button — i.e.
once the user has requested today's insight. No new route, no nav change.

## Testing

- **Unit** (`tests/share-card.test.ts`): `wrapText` — single line under width
  stays one line; long CJK string wraps at the measured boundary; empty string
  returns `[]`; a width that fits exactly N chars wraps after N. Uses an injected
  `measure` (e.g. 1 unit/char).
- **Unit** (`tests/share-image.test.ts`): `canUseFileShare` — true when
  `nav.canShare` exists and returns true for files; false when absent or returns
  false. Injected `nav` stub.
- **Manual browser smoke** (per the project's "component tests skipped"
  convention): on `/mirror`, request today's insight → 「分享此刻」 → preview
  overlay shows the rendered card correctly (sutra, reflection, lotus, wordmark,
  URL, gold frame) → on mobile the native share sheet appears; on desktop a PNG
  downloads. Cancelling the share sheet does not throw.

## Risks / notes

- **Canvas drawing isn't unit-tested** (jsdom lacks a real Canvas 2D) — covered
  by the pure `wrapText` test + manual visual smoke. Acceptable and matches
  convention.
- **Web Share file support varies** (great on iOS Safari/Android Chrome; absent
  on many desktops) — the download fallback always works.
- **Font varies by device** (Noto Serif TC only if installed) — accepted
  tradeoff; bundling deferred.
- **User-activation:** `share()` must fire from the overlay button's gesture, not
  buried behind the async render, or some browsers reject it.
```

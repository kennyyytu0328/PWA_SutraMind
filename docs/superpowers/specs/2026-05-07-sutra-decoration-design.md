# Design: Sutra Decoration — Gold-Leaf Aesthetic

**Date:** 2026-05-07
**Author:** Claude (collaborating with Kenny Tu)
**Status:** Approved (ready for implementation plan)
**Tracks:** UI polish — inspired by traditional 木雕貼金 Heart Sutra panel artwork

---

## 1. Goal

Layer a coherent gold-leaf decorative language across the app that visually echoes traditional carved-wood Heart Sutra panel artwork. The decoration is **inspired-by** (not literal): a single reusable lotus SVG, a double-line gold frame applied to two card surfaces, and a header signature mark. After this change the app feels like a 數位道場 not just functionally but visually.

## 2. Non-goals

- **No raster artwork.** No PNG/WebP assets; everything is SVG/CSS so it scales and themes cleanly.
- **No new fonts.** Existing `font-serif` (Noto Serif TC) carries the ritual surfaces.
- **No animation work.** The Zen-animation system (Phase 2 #2) is untouched. The lotus and frames are static.
- **No new color tokens in Tailwind config.** Existing `zen-accent` (`#C9A961`) plus a small set of hardcoded SVG fill values inside the Lotus component cover the gold tones.
- **No restructuring of `CategoryGrid` interaction model** — same `onSelect` callback, same disabled-tile fallback (now dead code, removed inline).
- **No changes to `lib/`, `hooks/`, persistence, prompts, or the chat state machine.** Pure presentation.

## 3. Approach summary

Brainstorming locked these choices:
- **Style fidelity:** Inspired-by, not literal (option B in Q1).
- **Scope:** Header + category tiles + SegmentReference card (option C in Q2).
- **Lotus motif:** Option E — single 3/4-view bloom in gold-leaf style (5 overlapping petals, 3 gold tones for depth, darker-gold radial vein lines).
- **Frame style:** Option H — double hairline (outer 1px border + inner 1px line via `box-shadow: inset`, 4px gap of surface color between).

## 4. Architecture

Pure presentation/asset change. New shared SVG `<symbol>` mounted once in the root layout via React's portal-like idiom (`<symbol>` referenced by `<use href="#lotus-e"/>` from anywhere in the document). New components for the header and the lotus glyph; existing components extended in place.

```
src/components/Lotus.tsx              NEW — exports {LotusSymbol, LotusGlyph}
src/components/AppHeader.tsx          NEW — header band (lotus + title + gold rule)
src/app/layout.tsx                    MODIFY — mount LotusSymbol once + render AppHeader
src/components/CategoryGrid.tsx       MODIFY — apply .gold-frame class + LotusGlyph on tiles
src/components/SegmentReference.tsx   MODIFY — restructure expanded view: .gold-frame + LotusGlyph closing flourish
src/styles/globals.css                MODIFY — add `.gold-frame` component class
```

`tailwind.config.ts` is not modified — the gold tones used inside the lotus SVG are passed as raw hex via `fill`/`stroke` attributes (these don't belong as Tailwind tokens because they only exist inside the lotus and aren't reused elsewhere).

## 5. Component & file changes

### 5.1 `src/components/Lotus.tsx` (NEW)

Two named exports.

**`<LotusSymbol />`** — renders an inline `<svg>` with `width=0 height=0 style={{ position: 'absolute' }}` containing a single `<symbol id="lotus-e" viewBox="0 0 120 120">` definition with the locked 5-petal lotus paths (5 petals via `<g transform="rotate(...)">` blocks; gold tones `#a8843a` / `#c29a4a` / `#dfb866` for back/mid/front; vein lines `#5a4115` / `#6a4d18` / `#7a5a1a`; central pistil dot `#7a5a1a`). Mounted once in `layout.tsx`. No props.

**`<LotusGlyph className?: string />`** — renders `<svg className={className} viewBox="0 0 120 120" aria-hidden><use href="#lotus-e"/></svg>`. Default `className="w-6 h-6"` if undefined. Used everywhere the lotus appears.

Lotus SVG paths (locked from brainstorming option E):

```tsx
// Inside the <symbol id="lotus-e" viewBox="0 0 120 120">:
// back-left petal
<g transform="rotate(-72 60 100)">
  <path d="M60 100 C 42 92, 43 60, 60 50 C 77 60, 78 92, 60 100 Z" fill="#a8843a"/>
  <path d="M60 98 L 60 54" stroke="#5a4115" strokeWidth="0.6" fill="none"/>
</g>
// back-right petal (rotate 72)  — same path, fill #a8843a
// mid-left petal (rotate -36)   — slightly fuller path: "M60 100 C 40 92, 41 56, 60 46 C 79 56, 80 92, 60 100 Z", fill #c29a4a
// mid-right petal (rotate 36)   — same as mid-left, mirrored
// front-center petal (rotate 0) — fullest path: "M60 100 C 38 90, 40 50, 60 38 C 80 50, 82 90, 60 100 Z", fill #dfb866
// pistil
<circle cx="60" cy="100" r="2.5" fill="#7a5a1a"/>
```

### 5.2 `src/components/AppHeader.tsx` (NEW)

Tiny presentational component. No state, no client-side hooks (server component is fine).

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

### 5.3 `src/app/layout.tsx` (MODIFY)

Add `LotusSymbol` mount + `AppHeader` render. Restructure the body so the header sits above the existing `<main>`:

```tsx
<body className="bg-zen-bg text-zen-text antialiased">
  <LotusSymbol />
  <AppHeader />
  <main className="mx-auto max-w-2xl px-6 py-12">
    {children}
  </main>
</body>
```

Note: `min-h-screen` moves off `<main>` (header now consumes some of the viewport). Verified visually OK in mockup; if the route-guard "redirecting…" splash on `/` looks too short, we can re-add `min-h-screen` to `<main>`.

### 5.4 `src/components/CategoryGrid.tsx` (MODIFY)

- Apply `.gold-frame` class to each tile button (replaces the current ad-hoc `border` styling).
- Insert `<LotusGlyph className="w-5 h-5 flex-shrink-0" />` to the left of the label.
- **Remove** the now-dead disabled branch (`!c.enabled`, `bg-zen-surface/40 opacity-50 cursor-not-allowed`, `即將開放` badge) — all 5 categories were enabled in the four-categories work; the disabled fallback is unreachable code.

Resulting markup shape:

```tsx
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
        <p className="mt-2 text-sm text-zen-muted">{c.presets.join('、')}</p>
      </div>
    </button>
  ))}
</div>
```

The `Props.onSelect` signature is unchanged.

### 5.5 `src/components/SegmentReference.tsx` (MODIFY)

Keep the collapsible behavior (button toggles `open`). When open, the expanded panel becomes a `.gold-frame` card with a centered layout:
- `original` rendered larger, in `font-serif`, with letter-spacing.
- a 60px gold hairline rule below (`<div className="w-15 h-px bg-zen-accent/40 mx-auto my-3" />`).
- `vernacular` in `text-zen-muted`.
- `<LotusGlyph className="w-9 h-9 mx-auto mt-2" />` as the closing flourish.
- Tiny segment label below the lotus: `<p className="text-[10px] tracking-[2px] text-zen-muted/70 mt-1">SEGMENT {s.id.split('_')[1]}</p>` (matches the numbering pattern already in the collapsed-button text).

The collapsed-state button keeps its current text (`引用：般若波羅蜜多心經 §...`) and toggle chevron, just text color tightened to `text-zen-muted hover:text-zen-accent` (no change).

### 5.6 `src/styles/globals.css` (MODIFY)

Add a `.gold-frame` component class inside `@layer components`:

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

The `#1E1E1E` literal is `zen-surface` — kept hardcoded inside `box-shadow` because Tailwind's `theme()` is not available in raw `box-shadow` syntax (and `@apply` doesn't expand inside `box-shadow:` values).

## 6. Visual specifications

| Property | Value |
|---|---|
| Frame outer border | `1px solid rgba(201, 169, 97, 0.55)` |
| Frame inner line gap | 4px (filled with `#1E1E1E` = zen-surface) |
| Frame inner line | `1px rgba(201, 169, 97, 0.25)` via inset box-shadow |
| Frame border-radius | 4px |
| Lotus back petals fill | `#a8843a` |
| Lotus mid petals fill | `#c29a4a` |
| Lotus front petal fill | `#dfb866` |
| Lotus vein strokes | `#5a4115` / `#6a4d18` / `#7a5a1a` (back/mid/front) |
| Lotus pistil | `#7a5a1a` |
| Header lotus size | `w-7 h-7` (28px) |
| Header rule | `border-b border-zen-accent/25` |
| Header title | `font-serif text-xl tracking-[0.25em]` |
| Tile lotus size | `w-5 h-5` (20px) |
| SegmentReference flourish lotus size | `w-9 h-9` (36px) |
| SegmentReference original text | `font-serif`, larger, `letter-spacing: 8px` (already approx via `tracking-widest`) |

## 7. Data flow

None. Purely presentational. The lotus `<symbol>` is mounted once at the top of `<body>`; every `<LotusGlyph>` is just `<svg><use href="#lotus-e"/></svg>` — the browser handles the reference natively. No JavaScript, no React state, no props beyond an optional className.

## 8. Error handling

None. SVG `<use href>` is universally supported (including IE11+, but we don't target IE anyway). If the symbol element somehow fails to mount (e.g., a future regression in `layout.tsx`), every `<LotusGlyph>` simply renders as an empty SVG — graceful no-op, not a crash.

## 9. Testing strategy

- **Unit tests:** none. The components are presentational and have no state or branching logic worth asserting on; Component tests remain skipped per CLAUDE.md.
- **Snapshot tests:** explicitly avoided. They'd lock in the exact path data which is the design intent we want to be free to revise.
- **Manual smoke (Kenny):**
  1. `pnpm exec tsc --noEmit && pnpm build` — clean typecheck, clean static export.
  2. `pnpm dev:fresh`. Visit `/categories`: header has lotus + 心經數位道場 title + thin gold rule; all 5 tiles have frame + lotus glyph beside the label; no disabled-state text anywhere.
  3. Start a chat session, complete one round to get an AI reply with a sutra reference. Tap the `引用：般若波羅蜜多心經 §N` toggle to expand. Verify: gold-frame panel, original text in serif with wider tracking, hairline rule, vernacular below, lotus closing flourish, tiny `SEGMENT N` label.
  4. Visit `/history` and `/history/detail?id=...` — same header should appear globally (it's in `layout.tsx`). Confirm the sand-art dissolve animation still works (regression check on Phase 2 #2).
  5. Reduced-motion check (system setting): no animation regressions; the decoration is static so nothing changes.

## 10. Acceptance criteria

- [ ] Header (lotus + 心經數位道場 + thin gold rule) appears on every page (`/setup`, `/categories`, `/chat`, `/history`, `/history/detail`).
- [ ] All 5 tiles in `/categories` have the gold double-line frame and a lotus glyph beside the label.
- [ ] The `即將開放` disabled-tile fallback is removed (now dead code).
- [ ] Tapping the `引用：` button on an assistant reply expands a gold-frame panel containing original text, hairline rule, vernacular, lotus closing flourish, segment label.
- [ ] All 71 unit tests still pass; clean typecheck; clean static export.
- [ ] No visual regression on existing animations (BreathingLoader, InkDropText, SandArtExit) — verified by Kenny's manual smoke.
- [ ] No new external assets, no new fonts, no new HTTP requests beyond Gemini.

## 11. Out of scope (for follow-up backlog)

- Per-category-color lotus tints (e.g., bluer for `health_pain`, redder for `emotion_relation`). Considered briefly; rejected — the single gold lotus reads as the brand, and tinting would dilute it.
- Lotus animation on hover. Tempting but the Zen voice suggests stillness; if added, it'd be a slow opacity pulse, not a transform. Defer to a later "delight pass."
- Background watermark — a very-low-opacity lotus or sutra-text watermark on the `/categories` or `/setup` hero. Could complement the header without competing. Deferred.
- Per-category SVG icon (a different symbol per category). The single lotus suffices for now; tile differentiation comes from the label and presets text.
- The 引用 button itself getting a frame. Currently it's a plain text toggle; framing it would compete with the expanded panel below. Skip.

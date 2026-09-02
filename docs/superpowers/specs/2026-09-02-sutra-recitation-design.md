# Sutra Recitation (誦經) Design

**Status:** Approved in brainstorm, awaiting implementation plan
**Date:** 2026-09-02
**Depends on:** `src/data/sutra-db.json` (9 segments), `useReducedMotion`, `LotusGlyph`, gold-leaf decoration system — all shipped

---

## 1. Intent

Users want to recite the Heart Sutra aloud but do not have the 260 characters memorised. A new `/recite` page surfaces the sutra one phrase at a time at a chant-like cadence, so the user reads along and recites the full text without a printed copy.

Constraints inherited from CLAUDE.md:

- 數位道場 voice. Zen vocabulary for every control (see §4).
- 100% client-side. No network, no Gemini call, no persistence. Works offline through the existing service worker.
- `prefers-reduced-motion` is honored.
- `sutra-db.json` is read, never modified.
- No native dialogs.

## 2. User-visible behaviour

| State       | What the page shows                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **idle**    | Title 「般若波羅蜜多心經」 in serif, speed pills 緩 / 中 / 疾 (中 selected), a single 「開始」 glow button. Back link 「← 回到道場」.                                    |
| **playing** | Current phrase large, serif, gold-tinted, centred. It fades in while drifting slowly upward, then dissolves as the next phrase surfaces from below. The 2 previous phrases linger faintly above, progressively dimmer. Thin gold hairline at the bottom fills left-to-right as progress. Speed pills remain visible and switchable. |
| **paused**  | Same stage frozen. Centre overlay text 「止」 in muted serif. Tap anywhere on the stage to resume.                                                                        |
| **done**    | Lotus glyph flourish, 「一遍圓滿」 in serif, two buttons: 「再誦一遍」 (restart from phrase 0, same speed) and 「回到道場」 (link to `/categories`).                       |

Interactions:

- Tap on the stage toggles playing ↔ paused.
- Changing speed while playing reschedules the pending timer using the new duration for the current phrase (no phrase is skipped or repeated).
- When the tab becomes hidden (`visibilitychange`), playback pauses automatically. It does not auto-resume; user taps to continue.
- Leaving the page clears all timers.

Reduced motion: the rise/dissolve animation is replaced by a plain opacity crossfade of the same duration. Timing and controls are unchanged.

## 3. Architecture

```
/recite page (thin, 'use client')
  └─ <RecitationStage current recent status onTap />      presentational
  └─ <RecitationControls speed status progress onSpeed onStart />
  └─ <RecitationDone onRestart />
  └─ useRecitation(phrases)                               state machine + timers
       └─ splitPhrases(segments) / phraseDurationMs(phrase, speed)
                                                          [src/lib/recitation.ts, pure]
```

### 3.1 `src/lib/recitation.ts` (pure, unit-tested)

```ts
export type RecitationSpeed = '緩' | '中' | '疾'

export const RECITATION_SPEEDS: Record<RecitationSpeed, { baseMs: number; perCharMs: number }> = {
  緩: { baseMs: 2200, perCharMs: 180 },
  中: { baseMs: 1600, perCharMs: 120 },
  疾: { baseMs: 1000, perCharMs: 80 },
}

export const SUTRA_TITLE = '般若波羅蜜多心經'

export interface RecitationPhrase {
  index: number        // 0-based, title is 0
  text: string         // includes trailing punctuation when present
  segmentId: string    // 'title' for the opening, otherwise segment id
}

export function splitPhrases(segments: SutraSegment[]): RecitationPhrase[]
export function phraseDurationMs(phrase: RecitationPhrase, speed: RecitationSpeed): number
```

Splitting rules:

- Split each `original` after every `，`, `、`, `；`, `。`, `！`. Punctuation stays attached to the end of the preceding phrase.
- Trim whitespace; drop empty results.
- Prepend the title phrase once (`segmentId: 'title'`).
- Character count for duration = text length excluding punctuation.
- Duration = `baseMs + perCharMs × charCount`. Example at 中: 「觀自在菩薩，」 (5 chars) = 2200 ms.

Expected total: roughly 50 phrases, about 3 minutes at 中.

### 3.2 `src/hooks/useRecitation.ts`

```ts
type RecitationStatus = 'idle' | 'playing' | 'paused' | 'done'

interface RecitationState {
  index: number
  status: RecitationStatus
  speed: RecitationSpeed
}

interface RecitationApi extends RecitationState {
  current: RecitationPhrase | null
  recent: RecitationPhrase[]      // up to 2 phrases before current, oldest first
  progress: number                // 0..1
  start(): void                   // idle | done → playing at index 0
  toggle(): void                  // playing ↔ paused; no-op in idle/done
  setSpeed(speed): void
}
```

- State held in a single `useReducer`; every transition returns a new object (no mutation).
- A single `setTimeout` is live at any time, stored in a ref. It is scheduled in an effect keyed on `[status, index, speed]`, so a speed change or pause naturally clears and reschedules.
- On timeout: if `index + 1 < phrases.length` → `index + 1`, else `status: 'done'`.
- `visibilitychange` listener pauses when `document.hidden` and status is `playing`.
- Effect cleanup clears the timer and the listener.

### 3.3 Components (`src/components/Recitation/`)

- `RecitationStage.tsx` — renders `recent` + `current` in a fixed-height stage (`min-h-[40vh]`). Each phrase is a `<p className="font-serif tracking-[0.35em] ...">` keyed by `phrase.index`. Current phrase gets class `recite-rise`; recent phrases get `recite-linger` with inline `--depth` (1 or 2) for opacity. Under reduced motion, the classes become `recite-fade`. Paused overlay renders 「止」. `onClick` → `onTap`.
- `RecitationControls.tsx` — speed pills as a `role="radiogroup"` of three buttons; 「開始」 / 「再誦一遍」 button; progress hairline (`div` with width = `progress × 100%`, gold, 1px, `transition: width`).
- `RecitationDone.tsx` — lotus + 「一遍圓滿」 + the two actions.

CSS keyframes live in `src/styles/globals.css` beside the existing zen animations:

- `recite-rise`: `opacity 0→1`, `translateY(24px)→0`, `filter: blur(6px)→0`, 900 ms ease-out.
- `recite-linger`: static, `opacity: calc(0.45 / var(--depth))`, `translateY(calc(var(--depth) * -2.2em))`, `transition` 900 ms so promotion from current to recent is smooth.
- `recite-fade`: opacity-only 600 ms, used under reduced motion.

### 3.4 Page and entry

- `src/app/recite/page.tsx` composes the three components with `useRecitation(splitPhrases(sutraDb))` where `sutraDb` is `import sutraDb from "@/data/sutra-db.json"` typed as `SutraSegment[]` (from `@/types/chat`). Static route, no search params.
- Categories header nav gains a third link: `誦經 →` before `心鏡 →`.
- `sw.js` needs no change: the route is part of the exported shell.

## 4. Copy (Zen vocabulary)

| Action        | Copy       |
| ------------- | ---------- |
| Start         | 開始       |
| Pause overlay | 止         |
| Speed         | 緩 / 中 / 疾 |
| Finished      | 一遍圓滿   |
| Repeat        | 再誦一遍   |
| Leave         | 回到道場   |
| Nav link      | 誦經 →     |

## 5. Error handling

There are no network or persistence operations. Defensive cases:

- `splitPhrases` on an empty segment list returns only the title phrase; the hook completes after one phrase.
- Timer scheduled while unmounting is cleared in effect cleanup; `start()` after `done` resets `index` to 0.
- `document` is only touched inside effects (SSR-safe for static export).

## 6. Testing

Unit (Vitest):

- `tests/recitation.test.ts`: title first; punctuation attached; no empty phrases; total phrase count against the real `sutra-db.json` (snapshot the number); duration formula at each speed; punctuation excluded from char count.
- `tests/useRecitation.test.ts` (`@testing-library/react` `renderHook` + fake timers): start → index 0 playing; advance after `phraseDurationMs`; toggle pauses and no advance occurs; toggle again resumes; `setSpeed` mid-phrase reschedules with the new duration; last phrase → `done`; `start()` from done restarts at 0; `recent` never exceeds 2 and never includes current; unmount clears timers.

Manual (per project convention, components are verified in the browser):

- Full pass at 中 reads naturally aloud.
- Reduced motion in DevTools shows crossfade only.
- Switching tabs pauses; tap resumes.
- Route loads offline after one online visit (production build only).

## 7. Out of scope

- Audio chanting or TTS.
- Recording recitation count or streaks (would need a Dexie migration; revisit if users ask).
- Continuous loop mode.
- Vernacular translation display during recitation.

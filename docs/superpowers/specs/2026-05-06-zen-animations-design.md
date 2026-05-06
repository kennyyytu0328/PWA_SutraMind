# SutraMind PWA — Zen Animations Design

**Date:** 2026-05-06
**Author:** Brainstorm session
**Status:** Approved, pending implementation plan
**Source:** `TODO.md` Phase 2 candidate #2 (Zen animations) and `AGENTS.md` §4

---

## 1. Purpose & Scope

The Walking Skeleton ships a functional 3-round chat with the Heart Sutra, but visually it is plain. The product's stated differentiator — that this is a **數位道場** (digital meditation space), not a productivity app — is not yet present in motion. This design adds three named animations from `AGENTS.md` §4 that together carry the Zen aesthetic into the moments where the user is most likely to feel friction (waiting, reading, letting go).

### In Scope

1. **Breathing Loader** — replaces the basic CSS pulse during Gemini API calls. Soft glow circle on a 5s breath cycle.
2. **Ink-Drop Rendering** — char-by-char reveal of fresh assistant replies; whole-message bloom for replay in history.
3. **Sand-Art Disposal** — slow scale/blur/fade exit when the user confirms 心無罣礙 on a session.
4. `prefers-reduced-motion` honoring across all three.
5. Add `framer-motion` as a dependency.

### Out of Scope (Explicit Non-Goals)

- **Real Gemini streaming** (`generateContentStream`). Char-by-char reveal is driven client-side from the full response, deliberately preserving the existing `callGemini` contract, schema validation, error classification, retry logic, and round-counter discipline.
- Service Worker / PWA manifest / offline mode (separate Phase 2 candidate).
- Animation for category selection, route transitions, or page-load skeletons. The Breathing Loader is reserved for the AI-thinking moment only.
- Light theme, animation toggles in settings, custom motion preferences beyond OS-level `prefers-reduced-motion`.
- Changes to `prompt-builder.ts`, `sutra.ts`, `gemini.ts`, `db.ts`, or any persistence concern.
- Component testing for `ChatMessage` beyond what already exists; full RTL coverage stays deferred per Walking Skeleton spec §9.

---

## 2. Aesthetic Direction

**Hybrid soft glow** (chosen over Minimal Restraint and Atmospheric Imagery during brainstorm). Common visual language across all three animations:

- Color: warm accent `#b89968` (existing `zen-accent`), sometimes with radial-gradient falloff to transparent.
- Effect vocabulary: blur (CSS `filter: blur(...)`), opacity, scale. **No** harsh transitions, no rotation, no overt imagery (no lotus shapes, no ink-stroke graphics, no kanji-as-decoration).
- Easing: ease-in-out for breathing; `cubic-bezier(0.4, 0, 0.2, 1)` for entrance reveals; `cubic-bezier(0.25, 0.1, 0.25, 1)` for the sand-art exit.
- Atmosphere without metaphor — the user can read a lotus, a breath, a candle, ink, or sand into the motion, but nothing is named.

---

## 3. Architecture

```
src/
  components/
    BreathingLoader.tsx        [NEW]
    InkDropText.tsx            [NEW]
    SandArtExit.tsx            [NEW]   AnimatePresence + motion.div wrapper
    ChatMessage.tsx            [MOD]   accepts `revealMode: 'live'|'replay'|'static'`
    SessionListItem.tsx        [MOD]   wraps body in SandArtExit
  hooks/
    useReducedMotion.ts        [NEW]   thin wrapper around framer's hook + matchMedia fallback
    useChatSession.ts          [MOD]   exposes `freshAssistantIndex: number | null`
  app/
    chat/page.tsx              [MOD]   uses BreathingLoader; passes revealMode to ChatMessage
    history/detail/page.tsx    [MOD]   passes revealMode='replay' to ChatMessage; uses IntersectionObserver
package.json                   [MOD]   add framer-motion ^11
```

The "fresh vs replay vs static" decision is centralized: `useChatSession` tags the index of the most-recently-appended assistant message; the chat page passes `revealMode='live'` for that one index, `'static'` for the rest. The history detail page passes `revealMode='replay'` for all assistant messages and lets the IntersectionObserver inside `InkDropText` trigger the bloom on first scroll-into-view.

No changes flow into `lib/`. The walking-skeleton spec's §3 architecture is preserved.

---

## 4. Component Specifications

### 4.1 `BreathingLoader`

| Property | Value |
|---|---|
| Visual | 64px diameter, radial-gradient background `rgba(184,153,104,0.55)` core → `rgba(184,153,104,0.05)` at 70% → transparent |
| Cycle duration | 5000ms, ease-in-out, infinite |
| Animated properties | `scale: 0.7 → 1.1 → 0.7`, `opacity: 0.55 → 1 → 0.55`, `filter: blur(0.5px) → blur(0) → blur(0.5px)` |
| Reduced-motion | Static circle at scale 0.9, opacity 0.7, no animation |
| Placement | `app/chat/page.tsx` only, when `status === 'sending'` (replaces the inline `animate-breath` dot at chat/page.tsx:80) |
| Implementation | Pure CSS keyframes (no framer-motion needed for this one) |

### 4.2 `InkDropText`

Renders a string with one of three reveal modes.

**Props:** `{ text: string, mode: 'live' | 'replay' | 'static', skip?: boolean, onComplete?: () => void }`

**Mode `'live'` — fresh assistant reply:**

- Splits `text` into characters.
- Each character starts at `{ opacity: 0, filter: blur(3px), transform: translateY(2px) }`.
- Animates to `{ opacity: 1, filter: blur(0), transform: translateY(0) }` over 350ms, easing `cubic-bezier(0.4, 0, 0.2, 1)`.
- Stagger between characters: `min(40, 6000 / text.length)` ms — caps total reveal at ~6 seconds for long replies.
- **Skip on tap:** when the `skip` prop flips to `true` mid-animation, all characters jump to final state immediately and `onComplete` fires synchronously. `ChatMessage` owns the `skipped` state, attaches `onClick` to the bubble wrapper, sets `skipped = true` on click, and passes it down via `skip`.
- Calls `onComplete()` when the last char's animation ends; consumer uses this to fade in dependent content (segment refs, closing practice).

**Mode `'replay'` — past message in history detail:**

- Wraps the entire string in a single element.
- Uses `IntersectionObserver` (threshold 0.3) to detect first scroll-into-view.
- On first intersect: animates `{ opacity: 0, filter: blur(6px) }` → `{ opacity: 1, filter: blur(0) }` over 400ms.
- Animates exactly once per mount; subsequent intersections are no-ops.

**Mode `'static'`:**

- Renders text directly. No animation, no observer.
- Used for non-fresh messages in chat (i.e., messages from earlier rounds in the same session).

**Reduced-motion (any mode):** renders text directly with no animation; `onComplete` fires synchronously on first paint.

### 4.3 `SandArtExit`

Thin wrapper around Framer Motion `<AnimatePresence>` + `<motion.div>`.

**Props:** `{ visible: boolean, onExited: () => void, children: ReactNode }`

| Property | Value |
|---|---|
| Initial / animate state | `{ opacity: 1, scale: 1, filter: 'blur(0)' }` |
| Exit state | `{ opacity: 0, scale: 1.15, filter: 'blur(8px)' }` |
| Exit duration | 1000ms, easing `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| Order of operations | When `visible` flips false: animation runs; on `onAnimationComplete`, `onExited()` fires; consumer triggers the actual `deleteSession()` call inside `onExited` |
| Reduced-motion | Skip animation; call `onExited()` on next tick |

The reason `deleteSession` is deferred to `onExited`: if the row's parent (`useSessions` `useLiveQuery`) removed the row before the animation completes, React would unmount the `<motion.div>` mid-animation, breaking the effect. Order is animation-first, persistence-second.

### 4.4 `useReducedMotion` (hook)

Thin wrapper around Framer's `useReducedMotion()` (which reads `matchMedia('(prefers-reduced-motion: reduce)')`). Exists as a project-local hook so future swaps (e.g., user-toggleable preference in settings) have one call site to update.

### 4.5 `ChatMessage` modification

Adds `revealMode: 'live' | 'replay' | 'static'` prop (default `'static'` to preserve existing behavior).

When `revealMode !== 'static'`, replaces the current `<p>{message.content}</p>` with `<InkDropText text={message.content} mode={revealMode} skip={skipped} onComplete={...} />`. ChatMessage holds local `skipped: boolean` state and binds `onClick` to the bubble wrapper to flip it (live mode only). The `SegmentReference` and `closingPractice` blocks are wrapped in a wrapper that fades them in (200ms opacity) once `onComplete` fires; in `'replay'` and `'static'` modes they appear immediately.

The bubble itself remains visually unchanged (existing rounded surface, padding, max-width). No layout shift between modes.

### 4.6 `useChatSession` modification

Adds one piece of state: `freshAssistantIndex: number | null`.

- Set to the new index immediately after a successful `appendMessage` of an assistant turn (in both `performSend` and `retry`).
- Cleared when:
  - the user starts a new send (next `performSend` call sets it to `null` until the new assistant message arrives), OR
  - the hook unmounts.

The chat page reads `freshAssistantIndex` and passes `revealMode='live'` only when `i === freshAssistantIndex`; all other assistant messages get `revealMode='static'`.

This preserves the round-counter invariant: `freshAssistantIndex` is set after `appendMessage` succeeds, in the same place where the round counter advances. They cannot diverge.

### 4.7 `SessionListItem` modification

Wraps the visible row in `<SandArtExit visible={!exiting} onExited={performDelete}>`. Existing two-tap confirmation logic is unchanged. The "心無罣礙" tap sets `exiting = true` instead of calling `deleteSession` directly; `performDelete` (passed to `onExited`) is the existing `deleteSession(session.id)` call. The `useSessions` `useLiveQuery` will then re-render and remove the row from the list — by which point the unmount is invisible because the row is already at opacity 0.

### 4.8 `app/history/detail/page.tsx` modification

For each rendered assistant message, pass `revealMode='replay'`. User messages remain `'static'`. No other changes.

---

## 5. Data Flow

**Live reveal:**

```
user submits → performSend → callGemini (unchanged) → response arrives →
appendMessage → setFreshAssistantIndex(newIndex) → rerender →
ChatMessage[newIndex] renders <InkDropText mode='live' /> → chars animate in →
onComplete fires → SegmentReference + closingPractice fade in →
status flips to 'awaiting_user' or 'completed'
```

The Breathing Loader is visible from the moment `status === 'sending'` until the response arrives. The handoff is: loader unmounts → `<InkDropText>` mounts on the same line → first char appears. There is no explicit cross-fade; relying on natural mount/unmount provides a clean ~50ms gap that reads as a beat.

**Replay:**

```
/history/detail mounts → loads session → renders ChatMessage list →
each assistant ChatMessage uses InkDropText mode='replay' →
IntersectionObserver waits → on first scroll-into-view (threshold 0.3) →
single 400ms bloom animation runs → observer disconnects
```

**Sand-Art exit:**

```
user taps 放下 → confirming = true → user taps 心無罣礙 → exiting = true →
SandArtExit AnimatePresence sees children disappear → motion.div runs exit (1s) →
onAnimationComplete → onExited() → deleteSession(id) → useSessions liveQuery re-renders →
<SandArtExit> unmounts (already invisible) → row gone
```

---

## 6. Reduced Motion Behavior

Detection: `useReducedMotion()` returning `true` (driven by `matchMedia('(prefers-reduced-motion: reduce)')`) **plus** a CSS `@media (prefers-reduced-motion: reduce)` rule for the BreathingLoader keyframes (in case SSR-rendered initial paint races the hook).

| Animation | Reduced-motion behavior |
|---|---|
| Breathing Loader | Static glow circle, scale 0.9, opacity 0.7 |
| InkDropText (live) | Renders full text immediately; `onComplete` fires synchronously |
| InkDropText (replay) | Renders full text immediately; observer not attached |
| Sand-Art Exit | Skips animation; `onExited()` fires on next tick |

---

## 7. Error Handling

The animation layer does not introduce new error paths. Existing error semantics in `useChatSession` are preserved:

- If `callGemini` throws, the assistant message is never appended → `freshAssistantIndex` stays null → no Ink-Drop animation runs. The error banner renders normally.
- If retry succeeds, the resulting assistant message becomes the fresh one → animates as live.
- If `deleteSession` rejects (rare; fake-indexeddb hasn't been observed to throw), `onExited` still fires the call; the catch in the existing `try/finally` (SessionListItem.tsx:46-52) handles it. The row is already invisible; it simply remains in the list until next reload. Acceptable degradation.

The `<InkDropText>` component itself does not throw and does not need an error boundary.

---

## 8. Testing Strategy

### Unit (Vitest, jsdom)

- `BreathingLoader.test.tsx` — renders; reduced-motion variant renders with no animation class
- `InkDropText.test.tsx` —
  - live mode: renders all chars (each in its own span), respects `text.length === 0` (no chars, no callback delay)
  - skip-on-tap: clicking the container before completion forces all chars to final-state class
  - replay mode: renders single bloom element; observer attaches; firing the observed callback adds the `show` class once and only once
  - static mode: renders text as plain string, no per-char wrapping
  - reduced-motion: all modes render plain text immediately and call `onComplete` synchronously
- `useReducedMotion.test.ts` — true when `matchMedia` returns `matches: true`; false otherwise
- `useChatSession.test.ts` (extension) — `freshAssistantIndex` is set after a successful send; null after a failure; updated correctly across retry

`IntersectionObserver` is jsdom-incompatible; tests use a manual mock that exposes `trigger(intersecting: boolean)` to drive the observer's callback synchronously.

### Manual smoke (per Walking Skeleton spec §10 pattern)

After unit tests pass, manually verify in the browser:

1. Start a fresh chat, type a message, observe: breath cycle visible during loader, smooth handoff to ink-drop reveal, segment reference fades in after text completes
2. Send a long message (>200 chars in reply): total reveal stays under ~6s
3. Tap the message bubble during ink-drop reveal: text snaps to full instantly
4. Open history → tap into a past session → scroll: each assistant message blooms in once on first scroll-into-view; scrolling past and back does not re-animate
5. From history list, tap 放下 → tap 心無罣礙: row dissolves over ~1s before disappearing
6. Toggle OS reduced-motion (Windows: Settings → Accessibility → Visual effects → Animation effects off). Re-run steps 1–5; all animations should be inert (text appears, row disappears, no motion)
7. Confirm the existing 39 unit tests stay green and `pnpm exec tsc --noEmit` is clean

### What's not tested

- Frame-rate / GPU-acceleration smoothness — judgment call, no automation
- Visual regression — out of scope; we don't have a visual-diff harness yet

---

## 9. Validation Criteria

The feature is "done" when:

1. All three animations work in Chrome (latest), Firefox (latest), and Safari (latest) on desktop
2. `prefers-reduced-motion` correctly disables all three
3. Existing 39 unit tests + new tests all pass
4. Build (`pnpm build`) succeeds with `output: 'export'` static export
5. No console errors during the manual smoke flow above
6. Subjective check: the chat experience feels meaningfully more 數位道場 than before — confirmed by user (project owner)

---

## 10. Scope Boundary (Reiterated)

**In:** the three animations described above, framer-motion install, reduced-motion handling.

**Out:**
- Real Gemini streaming (deferred — char-by-char is client-side animation of the full response)
- Service Worker / PWA manifest
- Animation for category selection, route transitions, splash, page-load skeletons
- Sound, haptics, ambient music
- User-configurable animation speed
- Light theme
- Any change to `lib/` (prompt-builder, gemini, db, sutra, categories) or `data/sutra-db.json`

If during implementation the animations reveal a deeper need (e.g., "the wait before ink-drop feels too long, we need real streaming after all"), surface it as a separate spec — do not expand this one.

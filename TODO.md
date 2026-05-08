# TODO — SutraMind PWA

Backlog of work deferred from the Walking Skeleton phase. Roughly priority-ordered within each section.

Walking Skeleton status: ✅ complete (2026-05-06). 39 tests passing, build green, AI quality smoke verified by user.

---

## Phase 2 candidates (each can become its own spec → plan → implementation cycle)

### 1. Other 4 dilemma categories ✅ shipped 2026-05-07
Spec: `docs/superpowers/specs/2026-05-07-four-categories-design.md` · Plan: `docs/superpowers/plans/2026-05-07-four-categories-plan.md`
- `career_achievement`, `self_existence`, `health_pain`, `sudden_emotion` are all `enabled: true` in `src/lib/categories.ts`.
- Per-category placeholder copy lives on `CategoryMeta.placeholder` and is threaded into `ChatInput` via `chat/page.tsx`.
- `tests/categories.test.ts` regression-locks each category injecting label + strategy + likelySegments into the system instruction.
- Strategies remain verbatim from `AGENTS.md` §3 (any reactive tuning would be recorded as separate `fix(categories): tune …` commits).

### 2. Zen animations (the differentiator) ✅ shipped 2026-05-07
Spec: `docs/superpowers/specs/2026-05-06-zen-animations-design.md` · Plan: `docs/superpowers/plans/2026-05-06-zen-animations-plan.md`
- **Breathing Loader** — `src/components/BreathingLoader.tsx`, 5s soft-glow breath cycle on chat-page Gemini calls. `prefers-reduced-motion` shows static glow.
- **Ink-Drop Rendering** — `src/components/InkDropText.tsx`, char-by-char reveal for fresh assistant turns (skip-on-tap snaps full), 400ms whole-message bloom on history detail replay. **Fake streaming** — `callGemini` contract unchanged; reveal is client-side animation only, so error classification + round-counter discipline are untouched.
- **Sand-Art Disposal** — `src/components/SandArtExit.tsx`, ~1s scale/blur/fade dissolve on session delete, then Dexie `deleteSession` fires from `onExited` callback.
- All three honor `useReducedMotion` (`src/hooks/useReducedMotion.ts`).
- 65 tests passing, static export green. Note: Framer Motion installed but unused — final implementation is pure CSS transitions/keyframes for testability.

### Visual decoration (gold-leaf aesthetic) ✅ shipped 2026-05-07
Spec: `docs/superpowers/specs/2026-05-07-sutra-decoration-design.md` · Plan: `docs/superpowers/plans/2026-05-07-sutra-decoration-plan.md` · Inspired by traditional 木雕貼金 Heart Sutra panel artwork.
- **Lotus glyph** — `src/components/Lotus.tsx` exports `LotusSymbol` (mounted once globally in `layout.tsx`) and `LotusGlyph` (consumer; `<svg><use href="#lotus-e"/></svg>` with optional `className`). Pure SVG, single shared `<symbol>`, no rasters.
- **`.gold-frame` card class** — `src/styles/globals.css`, double-line gold picture-frame via `box-shadow: inset` (no extra DOM). Used on category tiles and the SegmentReference card.
- **Global `AppHeader`** — `src/components/AppHeader.tsx`, lotus + 心經數位道場 + thin gold rule on every page (mounted in root `layout.tsx`).
- **CategoryGrid** — gold-frame tiles with lotus glyph beside each label. The dead `!enabled / 即將開放` branch was removed (all 5 categories enabled per `tests/categories.test.ts`).
- **SegmentReference** — expanded panel restructured as a centered gold-frame card: original sutra (`font-serif tracking-[0.5em]`) → 60px hairline → vernacular → lotus closing flourish → tiny `SEGMENT N` label.
- 71 tests passing, static export green. Cosmetic polish open: concentric corner radius on `.gold-frame`, multi-page `<h1>` hierarchy audit, `SEGMENT N` Latin caption could become 第N節.

### 3. PWA proper ✅ shipped 2026-05-08
- `public/manifest.webmanifest` with name, theme color (#121212), `display: standalone`, lotus SVG icon (`any maskable`).
- Hand-rolled Service Worker at `public/sw.js`: shell network-first, `_next/static/*` cache-first, audio cache-first lazy-populate, Gemini API never intercepted, auto-update via `skipWaiting` + `clients.claim`.
- Registered in production only via `src/components/RegisterServiceWorker.tsx` (dev keeps live reload).
- basePath-aware (start_url, scope, swUrl, manifest URL all derived from `NEXT_PUBLIC_BASE_PATH`).
- Open follow-ups: install prompt UX (none yet — relies on browser default), graceful offline copy on /chat (currently bubbles up the NETWORK error), per-platform PNG icons for older iOS.

### 4. API-key encryption
Replace plain storage with Web Crypto:
- Generate device-bound AES-GCM key from `crypto.subtle.generateKey`, persist key in IndexedDB
- Encrypt API key on save, decrypt on load
- Migration path for existing plain-stored keys (read once, re-save encrypted)
- Risk: device-bound key with no passphrase is convenience-encryption (recoverable by anyone with device access). Document the limit honestly. True passphrase-based encryption blocks the BYOK quick-start UX — not worth it for this app.

### 5. GitHub Pages deploy workflow
- `.github/workflows/deploy.yml`: pnpm install → test → build → publish `out/` to `gh-pages` branch
- Configure `next.config.mjs` `basePath` and `assetPrefix` for the `<repo>.github.io/<project>/` path (or set up a custom domain)
- Manual smoke against the deployed URL before announcing

### 6. History analytics (read-only stats)
Brainstormed in design phase as option C; deferred. If pursued, decide between:
- A simple stats card on /history showing category distribution + session count
- A dedicated /insights page
Either way, all aggregation runs locally; no remote anything.

---

## Smaller follow-ups (nice-to-have, not phase-level)

- **`/history/[id]` proper static route.** Currently we use `?id=` because Next 14 + `output: 'export'` rejects `'use client' + generateStaticParams`. Worth revisiting in Next 15 or finding a trampoline pattern. Cosmetic only; functionally fine.
- **Component tests (RTL).** Skipped at skeleton stage. Worthwhile for `ChatInput`, `RoundIndicator`, `SegmentReference` once UI stabilizes.
- **E2E smoke (Playwright).** A single happy-path test against the dev server (paste fake key → see error banner; or use a recorded fixture). Catches regressions in the Suspense / route-guard flow.
- **`abandonStaleActiveSessions` sharpening.** Currently fires on every / mount, which would mark a mid-chat session as abandoned if user manually navigates back to /. Edge case but worth fixing — only abandon if `Date.now() - startedAt > some threshold`.
- **Streaming Gemini response.** Phase 2 #2 used fake streaming (client-side reveal of a full single-shot reply) to keep the `callGemini` contract intact. Real `generateContentStream` would let the first ink-drop appear within ~600ms vs ~3-5s for full reply — quality win, not blocking anything.
- **Model switching UI.** AGENTS.md mentions Gemini 3.1 Flash Lite as an experimental option. A simple settings toggle on /setup. Probably waits until Phase 2.
- **Multi-language UI.** Currently zh-Hant only. Lower priority since the audience is Chinese-speaking and Sutra-DB is in classical Chinese.
- **Light theme.** Project is currently dark-only by design (matches 數位道場 aesthetic). Reconsider only if accessibility feedback warrants.

---

## Tech debt / paper cuts

- `@types/node` is at v25.x — ahead of the Node LTS we'd actually deploy against. Pin to `^22` or `^24` next time someone is in `package.json`.
- License field is `ISC` (default from `pnpm init`) — pick a real license (probably MIT or noncommercial) before any public release.
- No `engines` field constraining Node version. Add `"engines": { "node": ">=20.10" }` once we settle on a target.
- `src/styles/globals.css` imports Google Fonts via `@import url(...)` — a remote round-trip on first paint. Migrate to `next/font` for self-hosted, render-blocking-free font loading.
- `pnpm` warns "Ignored build scripts: @google/genai, protobufjs". Run `pnpm approve-builds` once and verify nothing breaks at runtime.

---

## Questions to revisit later (no action yet)

- Should rounds be configurable per category? (Sudden-emotion might want 1 round; existence might want 5.) Currently hardcoded to 3.
- Should we let users edit the System Instruction? Power-user feature; might dilute brand voice.
- Cross-session memory (AI knows "you've been struggling with X"). Has privacy implications and prompt-engineering cost. Keep deferred.
- Export / backup of session history? Useful for users switching devices. Adds a "you can export your data" affordance, which is nice for trust.

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

### 4. API-key encryption — ⚖️ decided against 2026-05-20
Decision: keep plain storage, document the limit honestly in `/setup` copy.
- Threat model review showed device-bound AES-GCM is convenience-encryption only — the AES key would sit in the same IndexedDB as the ciphertext, so any attacker with code/filesystem access on the device defeats it trivially. Only real defense it adds is against casual DevTools peeking.
- True protection needs a user passphrase (PBKDF2/Argon2 → AES key, never persisted), which breaks BYOK's "paste key, start meditating" UX. Not worth the ritual for an app this size.
- `ApiKeyForm` footnote updated to disclose: 「金鑰以明文存放、未加密；請勿在共用或公用裝置上使用。」
- Revisit only if (a) we ever ship multi-user or shared-device support, or (b) a credible XSS surface appears (third-party scripts, user-generated HTML).

### 5. GitHub Pages deploy workflow ✅ shipped 2026-05-07
- `.github/workflows/deploy.yml`: push-to-main + manual dispatch; `pnpm install --frozen-lockfile` → `pnpm test` (gates the build) → `pnpm build` with `BASE_PATH=/PWA_SutraMind` → upload `out/` via `actions/upload-pages-artifact@v3` → `actions/deploy-pages@v4` (native Pages flow, not a `gh-pages` branch).
- `next.config.mjs` reads `BASE_PATH` env and wires `basePath` + `assetPrefix` + exposes `NEXT_PUBLIC_BASE_PATH` for the SW / manifest registration code paths.
- Open follow-up: manual smoke against the live URL after first deploy; consider a custom domain later.

### 6. History analytics (read-only stats) — superseded by Phase 3-A/B (Mind Mirror)
Original brainstorm shipped in a richer form as the `/mirror` page (Phase 3-A/B below).

### 7. Phase 3-A: analytics pipeline ✅ shipped 2026-05-16
Spec: `docs/superpowers/specs/2026-05-16-analytics-mind-mirror-design.md` · Plan: `docs/superpowers/plans/2026-05-16-analytics-mind-mirror-plan.md`
- After each 3-round session, `pipelineChatToAnalytics` (fire-and-forget) calls Gemma to extract 5-dim metrics (attachment / aversion / fear / clinging-to-self / wisdom-seed) per session.
- Tolerant JSON parser (markdown fence strip, brace balancing, value clamping) in `src/lib/analytics-parser.ts`; pure prompt builder in `analytics-prompt-builder.ts`.
- Dexie v2 schema adds `analytics` + `profile` tables. Same-day second session merges with per-dim max + latest mind_summary.
- Offline / Gemma error → analytics drops silently; chat UX unaffected; round counter discipline preserved.

### 8. Phase 3-B: /mirror page ✅ shipped 2026-05-16
Same spec/plan as 3-A.
- `/mirror` route with `AttachmentIndex` + `RadarPanel` (今日 / 7日 toggle) + `TrendPanel` (≥ 3 distinct dates) + `EmptyMirror` empty state.
- Recharts radar + line chart, animations honor `prefers-reduced-motion`.
- `AppHeader` gains 心鏡 / 歷史 nav entries.

### 9. Phase 3-C: Daily Insight ✅ shipped 2026-05-17
Spec: `docs/superpowers/specs/2026-05-17-daily-insight-design.md` · Plan: `docs/superpowers/plans/2026-05-17-daily-insight-plan.md`
- `/mirror` shows a top-of-page `DailyInsightCard` with four states: empty / ready / requesting / shown.
- Tap 「請示今日靜觀」 → Gemma call with 7-day mean metrics + client-picked segment (argmax across 5 dims, deterministic priority tie-break) → 30-60 zh-char reflection persisted in new `dailyInsight` Dexie table keyed by local YYYY-MM-DD.
- Same-day guard returns existing row without burning quota; no row is ever written on error so the user can retap freely.
- Two `analytics-labels.ts` + `mirror-colors.ts` shared libs absorbed two Phase 3-A/B polish items en route.

### 10. Sutra recitation (誦經) ✅ shipped 2026-09-02
Spec: `docs/superpowers/specs/2026-09-02-sutra-recitation-design.md` · Plan: `docs/superpowers/plans/2026-09-02-sutra-recitation-plan.md`
- `/recite`: title + ~50 punctuation-split phrases surface one at a time (rising mist), 緩/中/疾 cadence, tap-to-pause, auto-pause on tab hide, 一遍圓滿 closing with 再誦一遍.
- Open follow-ups: chant audio/TTS, recitation count in Dexie (would feed /mirror), continuous loop mode.

---

## Smaller follow-ups (nice-to-have, not phase-level)

- **`/history/[id]` proper static route.** Currently we use `?id=` because Next 14 + `output: 'export'` rejects `'use client' + generateStaticParams`. Worth revisiting in Next 15 or finding a trampoline pattern. Cosmetic only; functionally fine.
- **Component tests (RTL).** Skipped at skeleton stage. Worthwhile for `ChatInput`, `RoundIndicator`, `SegmentReference` once UI stabilizes.
- **E2E smoke (Playwright).** A single happy-path test against the dev server (paste fake key → see error banner; or use a recorded fixture). Catches regressions in the Suspense / route-guard flow.
- ~~**`abandonStaleActiveSessions` sharpening.**~~ ✅ done 2026-05-20. Now takes an optional `staleThresholdMs` (default `STALE_SESSION_THRESHOLD_MS = 1h`); only abandons sessions older than the threshold. Mid-chat back-nav to `/` no longer kills the session. Also fixed a latent bug — the prior `.where('status').equals('active')` query always threw `SchemaError` because `status` isn't in the Dexie index schema, so stale-session abandonment had silently never worked in production (`page.tsx` `.catch(() => {})` swallowed it). Replaced with `.filter()` (full scan; sessions table is tiny). 5 new tests in `tests/db.test.ts`.
- **Streaming Gemini response.** Phase 2 #2 used fake streaming (client-side reveal of a full single-shot reply) to keep the `callGemini` contract intact. Real `generateContentStream` would let the first ink-drop appear within ~600ms vs ~3-5s for full reply — quality win, not blocking anything.
- **Model switching UI.** AGENTS.md mentions Gemini 3.1 Flash Lite as an experimental option. A simple settings toggle on /setup. Probably waits until Phase 2.
- **Multi-language UI.** Currently zh-Hant only. Lower priority since the audience is Chinese-speaking and Sutra-DB is in classical Chinese.
- **Light theme.** Project is currently dark-only by design (matches 數位道場 aesthetic). Reconsider only if accessibility feedback warrants.

### Phase 3-A/B polish (from 2026-05-16 final review)

- ~~**`firstMountRef` flip pattern in RadarPanel / TrendPanel.**~~ ✅ done 2026-05-20. Moved from `queueMicrotask`-during-render to `useEffect(() => { firstMountRef.current = false }, [])` in both panels — concurrent-mode safe.
- ~~**AttachmentIndex header copy: 今日 vs 近日.**~~ ✅ done 2026-05-20. Heading now reads 「今日執著指數」 only when `row.date === todayLocalISO()`, otherwise 「近日執著指數」.
- **CLAUDE.md invariant note.** Add a one-liner that `pipelineChatToAnalytics` is the *only* code path outside chat that calls a Gemini endpoint — useful safety invariant to spell out for future contributors.
- **Recharts 3.x visual smoke.** Plan assumed `^2.x` but `pnpm add recharts` installed `3.8.1`. tsc + manual smoke pass, but worth a re-look if Recharts publishes 3.x-specific guidance we should follow.

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

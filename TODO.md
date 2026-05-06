# TODO — SutraMind PWA

Backlog of work deferred from the Walking Skeleton phase. Roughly priority-ordered within each section.

Walking Skeleton status: ✅ complete (2026-05-06). 39 tests passing, build green, AI quality smoke verified by user.

---

## Phase 2 candidates (each can become its own spec → plan → implementation cycle)

### 1. Other 4 dilemma categories
Wire up `career_achievement`, `self_existence`, `health_pain`, `sudden_emotion`. Each needs:
- Strategy block tuning in `prompt-builder.ts` (the metadata exists in `lib/categories.ts`; just flip `enabled: true`)
- Per-category AI quality smoke test (3 representative inputs each, eyeball Zen vs moralizing)
- Possibly per-category UI accent (different opening prompt placeholder?)

### 2. Zen animations (the differentiator)
Three explicit asks from `AGENTS.md` §4 that we deliberately skipped in skeleton:
- **Breathing Loader** — currently a minimal CSS pulse. Upgrade to a full ~5s breath cycle that visually invites the user to synchronize breathing while the API call runs.
- **Ink-Drop Rendering** — switch `callGemini` to streaming, and render `response_text` chunks with a Framer Motion `staggerChildren` + `filter: blur()` to simulate ink soaking into rice paper. Replace the current "wait then dump full reply" flow.
- **Sand-Art Disposal** — when the user taps 放下/心無罣礙, animate the card dissolving (Framer Motion `exit` with `scale: 1.2`, `opacity: 0`, `blur(10px)`) before the actual Dexie delete. Currently the row just disappears.

These need Framer Motion as a new dep (`pnpm add framer-motion`).

### 3. PWA proper
- `public/manifest.webmanifest` with icons + name + theme color (#121212)
- Service Worker via `next-pwa` or hand-rolled, caching app shell + Sutra-DB.json for offline reads (note: chat itself requires network for Gemini — make offline UX graceful, e.g., "離線中：你可以閱讀過去的對話" on /history)
- Install prompt UX
- Verify `output: 'export'` still works alongside SW registration

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
- **Streaming Gemini response.** Required for Ink-Drop animation (see #2) but also a quality win on its own — first ink-drop appears within ~600ms vs ~3-5s for full reply.
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

# CLAUDE.md — SutraMind PWA

Orientation for Claude working in this repo. Read this first; pull deeper context only as needed.

## What this project is

A 100% client-side PWA that pairs the Heart Sutra (般若波羅蜜多心經) with Gemini-powered conversations to help users sit with emotional difficulty. Privacy-first: BYOK (Bring Your Own Gemini API Key), all chat history lives in the user's browser IndexedDB, no server, no telemetry, ever.

This is a **數位道場** (digital meditation space), not a productivity app. The voice is Zen, not corporate.

## Source-of-truth docs

| File | What it is |
|---|---|
| `AGENTS.md` | Original design vision in Chinese — vision, tech stack, 5 dilemma categories, Zen UI/UX spec, Sutra-DB content, System Instruction template |
| `docs/superpowers/specs/2026-05-06-sutramind-walking-skeleton-design.md` | Approved Walking Skeleton spec (English). Reflects what's actually built. |
| `docs/superpowers/plans/2026-05-06-sutramind-walking-skeleton-plan.md` | Step-by-step implementation plan that produced the current code |
| `docs/superpowers/specs/2026-05-06-zen-animations-design.md` + matching plan | Phase 2 #2: BreathingLoader, InkDropText, SandArtExit (shipped) |
| `docs/superpowers/specs/2026-05-07-four-categories-design.md` + matching plan | Phase 2 #1: all 5 dilemma categories enabled (shipped) |
| `docs/superpowers/specs/2026-05-07-sutra-decoration-design.md` + matching plan | Gold-leaf visual decoration (shipped) |
| `TODO.md` | Deferred work / next-phase backlog |
| `~/.claude/projects/D--MyWorkData-WebApp-Tools-SutraMind-PWA/memory/` | Cross-session memory. Read `MEMORY.md` index first. |

## Tech stack

- Next.js 14 (App Router) with `output: 'export'` (static export)
- TypeScript 5, React 18, Tailwind CSS 3 (NOT 4 — pinned for config-model compatibility)
- Dexie.js 4 + dexie-react-hooks for IndexedDB
- `@google/genai` SDK (Gemma 4 `gemma-4-31b-it`, structured JSON via prompt-embedded `[Output Contract]` + SDK `responseSchema` belt-and-suspenders)
- Vitest + fake-indexeddb for unit tests
- pnpm (10.x) is the package manager

## Architecture in one paragraph

UI calls `useChatSession` (state machine) which calls `buildPrompt` (pure, all prompt engineering centralized) → `callGemini` (SDK wrapper with error classification). Persistence goes through `lib/db.ts` only — UI never touches Dexie directly. Sessions have 3 rounds; round counter only advances on a successful, schema-valid AI response. History page reads sessions via Dexie `useLiveQuery` so deletions update reactively.

## Module map (don't skip)

```
src/
  app/                  # Next.js App Router pages — thin orchestration only
    page.tsx            # entry: route guard (apiKey? -> /categories else /setup)
    setup/              # BYOK key entry
    categories/         # 5-category grid (all enabled)
    chat/               # 3-round chat with Suspense-wrapped useSearchParams
    history/            # session list
    history/detail/     # single session detail (uses ?id= query param, not [id]
                        # — Next 14 static export rejects [id] + 'use client' + empty params)
    mirror/             # /mirror — Recharts radar + trend, AppHeader nav entry
    layout.tsx          # mounts <LotusSymbol/> + <AppHeader/> globally above <main>
  components/           # presentational UI:
                        #   ApiKeyForm, CategoryGrid, ChatMessage, ChatInput,
                        #   RoundIndicator, SegmentReference, SessionListItem,
                        #   AppHeader, Lotus (LotusSymbol + LotusGlyph),
                        #   BreathingLoader, InkDropText, SandArtExit
                        # MindMirror/ : AttachmentIndex, RadarPanel,
                        #               TrendPanel, EmptyMirror
  hooks/
    useApiKey.ts        # apiKey CRUD wrapper
    useSessions.ts      # liveQuery list + by-id read-only
    useChatSession.ts   # chat state machine — owns round counting + retry logic
    useReducedMotion.ts # matchMedia-based prefers-reduced-motion
  lib/
    db.ts               # Dexie schema + ALL persistence helpers
    sutra.ts            # segment lookup + validation
    categories.ts       # 5 category metadata + enabled flags
    prompt-builder.ts   # PURE function building Gemini payload — highest-leverage file
    gemini.ts           # SDK wrapper + GeminiError classification
    analytics-prompt-builder.ts  # pure builder for the 5-dim extraction prompt
    analytics-parser.ts          # tolerant JSON parser (markdown fence, brace balance, clamp)
    analytics-pipeline.ts        # fire-and-forget pipelineChatToAnalytics
    mirror-stats.ts              # attachmentIndex, last7/30Days, aggregateMetricsMax
    date-utils.ts                # todayLocalISO
  data/sutra-db.json    # 9 Heart Sutra segments (canonical content; do not modify)
  types/chat.ts         # all shared types — import from here, never redefine
```

## Conventions

**Voice / copy:** Zen vocabulary over literal verbs. See `memory/feedback_zen_vocabulary.md` for the mapping (Delete → 放下 / 心無罣礙, Save → 安住, Loading → 觀照中, etc.). Ask "what would the Heart Sutra call this action?" before reaching for 刪除/提交/確認.

**Styling:** Use the `zen-*` Tailwind palette tokens (`zen-bg`, `zen-surface`, `zen-text`, `zen-muted`, `zen-accent`). Don't introduce raw hex colors *outside* of the lotus SVG paths in `Lotus.tsx` (those gold tones `#a8843a` / `#c29a4a` / `#dfb866` only exist inside the lotus and are spec-mandated). Serif (`font-serif`) for sutra original text or ritual moments; sans-serif default elsewhere.

**Decoration system:** A coherent gold-leaf visual language is established. When you need a "carved-panel" surface, reach for the existing pieces — don't invent new ones:
- `<LotusGlyph className="w-N h-N" />` — import from `@/components/Lotus`. Renders the shared lotus by `<use href="#lotus-e">`. The single `<LotusSymbol />` is mounted once in `layout.tsx`; do NOT mount additional copies (would duplicate the `id="lotus-e"` and only the first would be visible).
- `.gold-frame` CSS class (in `globals.css`) — applies the double-line gold picture-frame (1px outer border + 4px gap + 1px inner shadow line) on any card. Used on `CategoryGrid` tiles and the open `SegmentReference` panel.
- `<AppHeader />` is global (rendered in `layout.tsx`). The header `<h1>` is `心經數位道場` — page-level titles should use `<h2>` to keep the heading hierarchy valid.

**Animation system:** Three Zen animations all honor `useReducedMotion()`:
- `<BreathingLoader />` (5s soft-glow breath cycle) — rendered while `useChatSession` is in `sending` status.
- `<InkDropText mode="live" | "replay" | "static" />` — `live` for fresh assistant turns (char-by-char with skip-on-tap), `replay` for past messages on `/history/detail` (whole-message bloom on first scroll into view).
- `<SandArtExit visible={!exiting} onExited={...} />` — wrap a row to dissolve it before deletion. The actual `deleteSession` Dexie call must fire from `onExited`, not before.

**Privacy hard rules:** API key stays in IndexedDB (currently plain — encryption on the TODO list). Never send anything to a server we control. No analytics. No telemetry. The `<a>` tag to Google AI Studio in `ApiKeyForm` is the only non-Gemini network call this app makes.

**Prompt changes:** All prompt engineering lives in `src/lib/prompt-builder.ts` and is unit-tested in `tests/prompt-builder.test.ts`. Changes there should keep tests passing AND get manually re-smoked against the 3 standard inputs in spec §10 to verify Zen quality didn't regress.

**Round counter discipline:** It advances ONLY on a successful schema-valid assistant turn. Errors and rate limits don't burn a round. Any change to `useChatSession` must preserve this — see `tests/db.test.ts` and the spec §7 error table.

**No native dialogs:** No `window.confirm`, `alert`, or `prompt`. Use in-flow two-tap confirmation patterns (see `SessionListItem` delete) — they fit the Zen vibe and don't block the event loop.

## Common commands

```bash
pnpm dev                # local dev (most days)
pnpm dev:fresh          # clean .next/out then dev — use after pnpm build
pnpm clean              # wipe .next + out
pnpm test               # unit tests (Vitest)
pnpm test:watch         # tests in watch mode
pnpm exec tsc --noEmit  # type-check only
pnpm build              # static export to ./out
```

## Things to NOT do without explicit user approval

- Add a backend service or proxy. The whole point is BYOK + client-only.
- Add analytics, telemetry, or remote logging.
- Replace Zen-vocabulary copy with literal action verbs.
- Modify `src/data/sutra-db.json` — that's the canonical Heart Sutra content.
- Add native browser dialogs (`window.confirm` etc.).
- Pin Tailwind to v4 (incompatible config model — would require a separate migration).
- Bypass `lib/db.ts` and call Dexie directly from UI.
- Run `next build` and `next dev` against the same `.next/` without cleaning between them.

## Known shortcuts (still in place)

These are intentional and tracked in `TODO.md`:

- API key stored in plain text (Web Crypto encryption deferred — Phase 2 #4)
- `/history/detail?id=N` instead of proper `/history/[id]/` (Next 14 static-export limitation)
- Component tests skipped — manual browser verification per each spec's §9
- No streaming responses — Zen animations use **fake streaming** (single-shot `generateContent` + client-side char-by-char reveal) so the `callGemini` contract stays simple
- No GitHub Pages deploy workflow yet (Phase 2 #5)

## Recently shipped (don't re-implement)

- ✅ Phase 3-A/B: analytics pipeline (Gemma extracts 5-dim metrics per session) + /mirror page (Recharts radar + trend); Dexie v2 (`analytics` + `profile` tables); AppHeader 心鏡/歷史 nav (2026-05-16)
- ✅ All 5 dilemma categories enabled (Phase 2 #1, 2026-05-07)
- ✅ Zen animations: BreathingLoader / InkDropText / SandArtExit + `useReducedMotion` (Phase 2 #2, 2026-05-06)
- ✅ Gold-leaf decoration: lotus SVG, `.gold-frame` cards, global `AppHeader` (2026-05-07)
- ✅ PWA: `public/manifest.webmanifest` + `public/sw.js` (hand-rolled) + `RegisterServiceWorker` mounted in `layout.tsx`. Installable, app shell offline. Gemini API never cached. Audio (`.mp3`) cache-first lazy-populate. SW only registers in production (2026-05-08)

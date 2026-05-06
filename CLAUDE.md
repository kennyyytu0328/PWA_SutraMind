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
| `TODO.md` | Deferred work / next-phase backlog |
| `~/.claude/projects/D--MyWorkData-WebApp-Tools-SutraMind-PWA/memory/` | Cross-session memory. Read `MEMORY.md` index first. |

## Tech stack

- Next.js 14 (App Router) with `output: 'export'` (static export)
- TypeScript 5, React 18, Tailwind CSS 3 (NOT 4 — pinned for config-model compatibility)
- Dexie.js 4 + dexie-react-hooks for IndexedDB
- `@google/genai` SDK (Gemini 2.5 Flash, structured JSON output)
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
    categories/         # 5-category grid (only emotion_relation enabled in skeleton)
    chat/               # 3-round chat with Suspense-wrapped useSearchParams
    history/            # session list
    history/detail/     # single session detail (uses ?id= query param, not [id]
                        # — Next 14 static export rejects [id] + 'use client' + empty params)
  components/           # presentational UI (ApiKeyForm, CategoryGrid, ChatMessage,
                        # ChatInput, RoundIndicator, SegmentReference, SessionListItem)
  hooks/
    useApiKey.ts        # apiKey CRUD wrapper
    useSessions.ts      # liveQuery list + by-id read-only
    useChatSession.ts   # chat state machine — owns round counting + retry logic
  lib/
    db.ts               # Dexie schema + ALL persistence helpers
    sutra.ts            # segment lookup + validation
    categories.ts       # 5 category metadata + enabled flags
    prompt-builder.ts   # PURE function building Gemini payload — highest-leverage file
    gemini.ts           # SDK wrapper + GeminiError classification
  data/sutra-db.json    # 9 Heart Sutra segments (canonical content; do not modify)
  types/chat.ts         # all shared types — import from here, never redefine
```

## Conventions

**Voice / copy:** Zen vocabulary over literal verbs. See `memory/feedback_zen_vocabulary.md` for the mapping (Delete → 放下 / 心無罣礙, Save → 安住, Loading → 觀照中, etc.). Ask "what would the Heart Sutra call this action?" before reaching for 刪除/提交/確認.

**Styling:** Use the `zen-*` Tailwind palette tokens (`zen-bg`, `zen-surface`, `zen-text`, `zen-muted`, `zen-accent`). Don't introduce raw hex colors. Serif (`font-serif`) for sutra original text or ritual moments; sans-serif default elsewhere.

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

## Known skeleton-stage shortcuts

These are intentional and tracked in `TODO.md`:

- API key stored in plain text (Web Crypto encryption deferred)
- Only `emotion_relation` category is wired up (other 4 visibly disabled)
- No PWA manifest, no Service Worker, no offline mode
- No Ink-Drop / Sand-Art / Breathing Loader animations beyond a basic CSS pulse
- `/history/detail?id=N` instead of proper `/history/[id]/` (Next 14 static-export limitation)
- Component tests skipped — manual browser verification per spec §9
- No streaming responses (single-shot generateContent)
- No GitHub Pages deploy workflow

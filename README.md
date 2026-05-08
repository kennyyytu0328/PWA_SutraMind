# SutraMind PWA · 心經數位道場

> 一個 100% 客戶端的 Heart Sutra (般若波羅蜜多心經) 對話空間。當你被情緒卡住，跟它聊聊。

SutraMind is a privacy-first Progressive Web App that pairs the Heart Sutra with Gemini-powered conversation to help users sit with emotional difficulty. **BYOK** (Bring Your Own Gemini API Key); chat history lives only in your browser's IndexedDB; no server, no telemetry, ever.

This is a **數位道場** (digital meditation space), not a productivity app. The voice is Zen, not corporate.

---

## ✨ Features

- **Heart Sutra-anchored dialogue.** Each AI reply cites a relevant 心經 segment, grounding the conversation in the Sutra rather than generic life advice.
- **3-round structure.** Sessions are bounded — 觀照 (observe) → 照見 (see through) → 度一切 (release). Round counter only advances on a successful, schema-valid AI response, so errors don't burn a round.
- **Zen animations.**
  - 🫧 **Breathing Loader** — soft-glow 5s breath cycle while the AI thinks; an invitation to synchronize breathing.
  - 🖋 **Ink-Drop reveal** — fresh assistant replies appear character-by-character (tap to skip); past messages on /history bloom in as you scroll.
  - 🏖 **Sand-Art dissolve** — when you tap 心無罣礙 to release a session, it dissolves over ~1s before deletion.
  - All three honor `prefers-reduced-motion`.
- **Gold-leaf visual identity.** Inspired by traditional 木雕貼金 Heart Sutra panel artwork: a shared lotus SVG (`LotusSymbol` + `LotusGlyph`), a double-line `.gold-frame` card class, a global header band, and a centered SegmentReference card with sutra original / hairline rule / vernacular / lotus closing flourish.
- **Zen vocabulary, not literal verbs.** Delete → 放下 / 心無罣礙. Save → 安住. Loading → 觀照中.
- **Privacy hard rules.** API key in IndexedDB, never sent anywhere except `generativelanguage.googleapis.com`. No analytics. No telemetry. The only non-Gemini outbound link is the `<a>` to Google AI Studio for getting a key.

---

## 🚀 Getting started

### Prerequisites

- Node.js ≥ 20.10
- pnpm 10.x
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Run locally

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. On first run you'll be prompted to paste your Gemini key — it's stored only in your browser.

### Production build

```bash
pnpm build
```

Static export lands in `./out/`. Drop it on any static host (GitHub Pages, Cloudflare Pages, S3 + CloudFront, etc.).

---

## 🛠 Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router (`output: 'export'`) |
| Language | TypeScript 5 |
| UI | React 18 + Tailwind CSS 3 |
| Storage | Dexie.js 4 + dexie-react-hooks (IndexedDB) |
| LLM | `@google/genai` (configurable model — defaults to a Gemma 4 instruction-tuned variant) |
| Tests | Vitest 4 + jsdom + fake-indexeddb + Testing Library |
| Package manager | pnpm 10 |

---

## 📂 Project layout

```
src/
  app/                  Next.js App Router pages
    page.tsx            entry: route guard (apiKey? → /categories else /setup)
    setup/              BYOK key entry
    categories/         5-category grid
    chat/               3-round chat
    history/            session list
    history/detail/     single-session detail (?id=N — static-export friendly)
  components/           presentational UI (AppHeader, Lotus, BreathingLoader,
                        InkDropText, SandArtExit, CategoryGrid, SegmentReference, …)
  hooks/
    useApiKey.ts        API-key CRUD wrapper
    useSessions.ts      liveQuery list + by-id read-only
    useChatSession.ts   chat state machine — owns round counting + retry logic
    useReducedMotion.ts matchMedia-based prefers-reduced-motion
  lib/
    db.ts               Dexie schema + ALL persistence helpers
    sutra.ts            segment lookup + validation
    categories.ts       5 category metadata + enabled flags
    prompt-builder.ts   PURE function building Gemini payload — highest-leverage file
    gemini.ts           SDK wrapper + GeminiError classification
  data/sutra-db.json    9 Heart Sutra segments (canonical content)
  types/chat.ts         shared types
tests/                  Vitest unit + component tests
docs/superpowers/       design specs and implementation plans
```

---

## 🧪 Common commands

```bash
pnpm dev                # local dev
pnpm dev:fresh          # clean .next/out then dev (use after pnpm build)
pnpm clean              # wipe .next + out
pnpm test               # unit tests (Vitest)
pnpm test:watch         # tests in watch mode
pnpm exec tsc --noEmit  # type-check only
pnpm build              # static export to ./out
```

---

## 🔐 Privacy model

- **Your API key** lives in IndexedDB on your device. Currently plaintext (Web Crypto encryption is on the roadmap).
- **Your chat history** lives in IndexedDB on your device. No backup, no sync.
- **Outbound network calls** go to `generativelanguage.googleapis.com` only — and only when you send a message.
- **Clearing data:** browser site-data → clear; or use the in-app 心無罣礙 action per session.

If you don't trust this README, read `src/lib/gemini.ts` and grep the codebase for `fetch(` — it's a small enough app that you can audit it in an evening.

---

## 🗺 Roadmap

See [`TODO.md`](./TODO.md) for the full backlog. Phase 2 highlights:

- ✅ **Zen animations** (Breathing Loader / Ink-Drop / Sand-Art) — shipped 2026-05-06
- ✅ **All 5 dilemma categories** (career, existence, health, sudden emotion + emotion_relation) — shipped 2026-05-07
- ✅ **Gold-leaf decoration** (lotus glyph + `.gold-frame` cards + global header) — shipped 2026-05-07
- ✅ **Real PWA** (manifest + Service Worker + installable + offline app shell) — shipped 2026-05-08
- 🔲 Web Crypto API-key encryption
- 🔲 GitHub Pages deploy workflow

---

## 📚 Source-of-truth docs

| File | What it is |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Original design vision in Chinese — vision, 5 dilemma categories, Zen UI/UX spec, Sutra-DB content, System Instruction template |
| [`CLAUDE.md`](./CLAUDE.md) | Orientation for Claude Code working in this repo |
| `docs/superpowers/specs/` | Approved design specs (Walking Skeleton, Zen Animations, Four Categories, Sutra Decoration) |
| `docs/superpowers/plans/` | Step-by-step implementation plans (one per spec) |
| [`TODO.md`](./TODO.md) | Deferred / next-phase backlog |

---

## 🎵 Credits

- **Ambient music:** *Nomadic Spirit* by [meditativetiger](https://meditativetiger.com/) — used as the optional background track (toggle in the header). Please confirm the track's license terms before redistribution.

---

## ⚖️ License

ISC (placeholder — to be revisited before any public release).

---

> 觀自在菩薩，行深般若波羅蜜多時，照見五蘊皆空，度一切苦厄。

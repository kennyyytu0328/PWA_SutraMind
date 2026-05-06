# SutraMind PWA — Walking Skeleton Design

**Date:** 2026-05-06
**Author:** Brainstorm session
**Status:** Approved, pending implementation plan
**Source spec:** `AGENTS.md` (SutraMind PWA v1.1)

---

## 1. Purpose & Scope

Build a **Walking Skeleton** — the smallest end-to-end vertical slice that validates the riskiest part of the product: whether the BYOK + Gemini + System Instruction + Sutra-DB injection chain produces Zen-quality replies that reference Heart Sutra segments without lapsing into chicken-soup moralizing.

This is **not** the full v1.1 product. PWA features, advanced animations, all five dilemma categories, encryption, and CI/deploy are explicitly out of scope and deferred to follow-up work.

### In Scope

1. BYOK API key setup flow (plain storage in IndexedDB)
2. Category selection screen (only "情感與關係" enabled; others visibly disabled)
3. Multi-turn chat capped at **3 rounds**, with structured JSON output and segment-reference rendering
4. Session persistence to IndexedDB (Dexie.js)
5. Read-only History page listing past sessions and allowing expansion to full conversation

### Out of Scope (Explicit Non-Goals)

- PWA: no Service Worker, no manifest, no offline mode
- Animations: no Ink-Drop, Sand-Art, Breathing Loader, no Framer Motion
- Other 4 categories' chat flow (UI present but disabled with "即將開放" label)
- Model switching UI (Flash Lite path unused; hardcoded to Gemini 2.5 Flash)
- API key encryption (plain in IndexedDB, README TODO)
- Multi-language UI (Traditional Chinese only)
- Streaming responses (non-streaming SDK call only)
- E2E tests, component tests, visual regression
- GitHub Pages CI/deploy workflow
- Analytics/telemetry (none, ever — privacy-first)
- Cross-session AI memory (history is read-only review, not fed back into prompts)

---

## 2. Tech Baseline

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) with `output: 'export'` |
| Language | TypeScript |
| Package manager | pnpm |
| Styling | Tailwind CSS |
| Local storage | Dexie.js (IndexedDB wrapper) |
| AI SDK | `@google/genai` (official Google Gen AI JavaScript SDK) |
| Default model | Gemini 2.5 Flash |
| Test framework | Vitest with `fake-indexeddb` |
| Hosting target | Static export → GitHub Pages (deploy not in skeleton) |

100% client-side. No backend, no server-side rendering of dynamic content.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────┐
│  Browser (Next.js Static Export)                │
│                                                 │
│  ┌──────────────┐    ┌──────────────────────┐  │
│  │  React UI    │◄──►│  React State (3 rds) │  │
│  └──────┬───────┘    └──────────────────────┘  │
│         │                                       │
│         ▼                                       │
│  ┌──────────────┐    ┌──────────────────────┐  │
│  │ Prompt       │◄──►│ Sutra-DB.json        │  │
│  │ Builder      │    │ (bundled at build)   │  │
│  └──────┬───────┘    └──────────────────────┘  │
│         │                                       │
│         ▼                                       │
│  ┌──────────────┐    ┌──────────────────────┐  │
│  │ Gemini API   │    │ Dexie (IndexedDB)    │  │
│  │ Client       │    │ - apiKey             │  │
│  └──────┬───────┘    │ - sessions           │  │
└─────────┼────────────┴──────────────────────────┘
          │
          ▼  (HTTPS, BYOK)
   Google Gemini API (2.5 Flash)
```

### Routing & State Flow

```
/             → (check Dexie) → /setup or /categories
/setup        → enter API key  → /categories
/categories   → click "情感與關係" → create session → /chat?sessionId=N
/chat         → 3 rounds → [查看歷史] or [放下並重新開始]
/history      → list all sessions, newest first
/history/[id] → display single session full conversation
```

---

## 4. File & Module Structure

```
SutraMind_PWA/
├── AGENTS.md
├── package.json
├── next.config.mjs                      # output: 'export'
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── public/
│   └── (favicon only; no PWA assets)
├── src/
│   ├── app/                             # Next.js App Router
│   │   ├── layout.tsx                   # global dark theme + fonts
│   │   ├── page.tsx                     # entry: route based on apiKey
│   │   ├── setup/page.tsx               # BYOK setup
│   │   ├── categories/page.tsx          # 5-category grid
│   │   ├── chat/page.tsx                # chat (3 rounds)
│   │   └── history/
│   │       ├── page.tsx                 # session list
│   │       └── [id]/page.tsx            # single session detail
│   ├── data/
│   │   └── sutra-db.json                # 9 Heart Sutra segments
│   ├── lib/
│   │   ├── db.ts                        # Dexie instance & schema
│   │   ├── gemini.ts                    # Gemini client wrapper + errors
│   │   ├── prompt-builder.ts            # system instruction & payload
│   │   ├── sutra.ts                     # Sutra-DB types & helpers
│   │   └── categories.ts                # 5 category metadata
│   ├── components/
│   │   ├── ApiKeyForm.tsx
│   │   ├── CategoryGrid.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── RoundIndicator.tsx
│   │   ├── SegmentReference.tsx
│   │   └── SessionListItem.tsx
│   ├── hooks/
│   │   ├── useApiKey.ts
│   │   ├── useSession.ts                # current chat state machine
│   │   └── useSessions.ts               # history list (Dexie liveQuery)
│   ├── types/
│   │   └── chat.ts
│   └── styles/
│       └── globals.css                  # Tailwind + Zen palette
├── tests/
│   ├── prompt-builder.test.ts
│   ├── sutra.test.ts
│   └── db.test.ts                       # uses fake-indexeddb
└── docs/superpowers/specs/
    └── 2026-05-06-sutramind-walking-skeleton-design.md
```

### Module Responsibilities

- **`lib/prompt-builder.ts`** — Pure function. All prompt engineering is centralized here. No I/O. Produces the full Gemini API payload.
- **`lib/gemini.ts`** — Wraps `@google/genai` SDK. Handles error classification into `GeminiError` kinds. Non-streaming for skeleton; interface ready for streaming later.
- **`lib/db.ts`** — Dexie instance, schema, and all IndexedDB CRUD. UI and hooks never touch Dexie API directly.
- **`hooks/useSession.ts`** — Chat state machine. States: `idle → sending → awaiting_user → sending → ... → completed`. Owns round counting, Dexie upsert per turn, error-aware round advancement.
- **`app/page.tsx`** — Route guard: redirects to `/setup` if no API key, otherwise `/categories`.

---

## 5. Data Model

### Dexie Schema

```ts
db.version(1).stores({
  apiKey: '++id',
  sessions: '++id, category, startedAt'
})

interface ApiKeyRecord {
  id?: number
  value: string             // plain text, BYOK, never leaves device
  savedAt: number
}

interface Session {
  id?: number
  category: CategoryId      // skeleton uses only 'emotion_relation'
  startedAt: number         // Date.now() at /chat entry
  endedAt?: number
  messages: ChatMessage[]   // full conversation
  status: 'active' | 'completed' | 'abandoned'
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string                       // user input or response_text
  referencedSegmentIds?: string[]       // assistant only
  closingPractice?: string | null       // assistant only
  timestamp: number
}
```

### Session lifecycle

- Session created on `/categories` → `/chat` transition; `status='active'`.
- Each successful round upserts the session with new messages.
- Round 3 success → `status='completed'`, `endedAt` set.
- User leaves mid-session and returns later → existing session marked `abandoned` on next app boot if `status='active'` and `startedAt` older than current boot.

### Sutra-DB

Bundled at build time as `src/data/sutra-db.json`. Content matches AGENTS.md §核心靜態資料庫. Type:

```ts
interface SutraSegment {
  id: string                  // 'segment_1' .. 'segment_9'
  original: string
  vernacular: string
  keywords: string[]
  therapeutic_focus: string
}
```

---

## 6. Prompt Builder Design

### Function signature

```ts
export interface BuildPromptInput {
  category: CategoryId
  history: ChatMessage[]
  userMessage: string
  sutraDB: SutraSegment[]
  roundNumber: 1 | 2 | 3
}

export interface GeminiPayload {
  systemInstruction: string
  contents: Content[]
  responseSchema: object
  generationConfig: {
    temperature: number              // 0.7
    responseMimeType: 'application/json'
  }
}

export function buildPrompt(input: BuildPromptInput): GeminiPayload
```

### System Instruction blocks (assembled, not hardcoded)

1. **Role Block** — fixed; from AGENTS.md §5: digital mentor blending Mahayana wisdom with CBT, four behavioral rules (deep listening, sutra mapping, de-labeling, Zen response).
2. **Sutra Knowledge Block** — full `sutraDB` JSON wrapped in `<SUTRA_DB>...</SUTRA_DB>` tags.
3. **Category Strategy Block** — varies by category. For `emotion_relation`: reinforce 心無罣礙, guide healthy psychological boundaries, likely relevant segments segment_4 and segment_6.
4. **Round-Aware Closing Rules** — round 1-2: end with reflective question or micro-awareness practice, no moralizing; round 3 (final): provide a concrete present-moment practice, then a brief blessing.
5. **Output Contract Block** — instructs the model to emit JSON matching `responseSchema`. Forbids including segment original text in `response_text` (UI renders it from `referenced_segment_ids`).

### Response schema (Gemini structured output)

```ts
{
  type: 'object',
  properties: {
    referenced_segment_ids: { type: 'array', items: { type: 'string' } },
    response_text: { type: 'string' },
    closing_practice: { type: 'string', nullable: true }
  },
  required: ['referenced_segment_ids', 'response_text']
}
```

### History formatting

`ChatMessage[]` is translated into Gemini's `{role: 'user' | 'model', parts: [{text}]}` array. For assistant turns, only `response_text` is fed back (not the JSON wrapper) so the model sees a clean dialogue.

### Test surface

```
prompt-builder.test.ts
  ✓ includes the role block
  ✓ embeds full sutra DB inside <SUTRA_DB> tags
  ✓ injects category-specific strategy for emotion_relation
  ✓ uses round-3 closing rules when roundNumber === 3
  ✓ formats history into Gemini's user/model parts shape
  ✓ feeds only response_text back for assistant history (not JSON)
  ✓ responseSchema requires referenced_segment_ids + response_text
```

---

## 7. Error Handling

| Failure | Where | UX | Recovery |
|---|---|---|---|
| No API key in IndexedDB | App boot | Auto-redirect to `/setup` | User pastes key |
| Invalid API key (Gemini 401/403) | First chat send | Inline banner: "Key seems invalid. Update it?" + button to `/setup` | Re-enter key; existing session preserved |
| Rate limit (Gemini 429) | Mid-chat | Inline message bubble with retry button | Manual retry; round counter NOT advanced |
| Network failure | Mid-chat | Same retry pattern | Manual retry |
| Gemini returns invalid JSON | Response parse | One automatic retry; if fails again, error message + manual retry | Round counter NOT advanced |
| `referenced_segment_ids` contains unknown id | Response validation | Log to console, render `response_text` only | Silent degradation |
| IndexedDB write fails | Session save | Toast: "Couldn't save this session locally" | Chat continues in memory; user warned |
| 3-round limit hit | After 3rd reply | Input disabled, banner + `[查看歷史] [放下並開始新對話]` buttons | Designed end state |
| User closes tab mid-round | — | On restart, /categories loads; partial session marked `abandoned` | None needed |

### Error class

```ts
export class GeminiError extends Error {
  constructor(
    public kind: 'AUTH_FAILED' | 'RATE_LIMIT' | 'NETWORK'
              | 'INVALID_RESPONSE' | 'UNKNOWN',
    message: string,
    public retryable: boolean
  ) { super(message) }
}
```

Round advances **only on successful, schema-valid response**.

---

## 8. UI Notes (skeleton level)

- Dark theme: `#121212` background, `#1E1E1E` surface, `#EAE0D5` primary text (per AGENTS.md §4 Zen palette).
- Typography: serif (Noto Serif TC) for sutra original text; sans-serif (Noto Sans TC) for UI and AI replies.
- Generous spacing using Tailwind `p-8`/`p-12` defaults.
- No animations beyond the browser default focus/hover transitions.
- Disabled categories use reduced opacity + non-interactive pointer cursor + "即將開放" badge.
- Round indicator: `第 X / 3 輪` text plus three small dots filling as rounds complete.
- Segment reference: collapsed by default with `▶ 引用：般若波羅蜜多心經 §4`. Expands to show original + vernacular.

---

## 9. Testing Strategy

### Unit tests (Vitest)

| Module | Tested? | Reason |
|---|---|---|
| `prompt-builder.ts` | Yes — heavy | Highest leverage; see §6 test list |
| `lib/sutra.ts` | Yes | id lookup, validation helpers |
| `lib/db.ts` | Yes (with `fake-indexeddb`) | CRUD + schema migration |
| `lib/gemini.ts` | Yes — partial | Error classification only; mock fetch |
| `categories.ts` | Yes | Metadata structural check |
| React components | No | Manual browser verification faster at this stage |
| E2E (Playwright) | No | Setup overhead, low skeleton-stage value |

### Manual verification checklist

- [ ] Cold start with no API key → setup page appears
- [ ] Invalid key → AUTH_FAILED banner, recover via /setup
- [ ] Valid key → 3 rounds, each AI reply valid JSON, segments render
- [ ] Round counter does not advance on rate-limit / network error
- [ ] Reload mid-session → partial conversation visible in /history
- [ ] Other 4 categories visibly disabled with "即將開放" label
- [ ] Round 3 → input disabled, two CTA buttons appear
- [ ] /history lists newest-first; click expands full conversation

---

## 10. Validation Criteria ("Done" Definition)

All four required:

1. `pnpm test` unit tests all pass.
2. `pnpm build` succeeds with `output: 'export'`.
3. Manual checklist (§9) completes with no blockers.
4. **AI quality smoke test** — these 3 inputs in 3 separate sessions, each AI reply must:
   - Reference at least one valid segment id
   - Avoid moralizing phrases: 你應該、要學會、請記住、時間會治癒
   - End with a question or present-moment practice (per round rules)
   - Stay under ~180 Chinese characters per reply

   Test inputs:
   - "我跟交往三年的伴侶分手了，每天晚上都睡不著"
   - "覺得自己永遠交不到真心朋友，活在一個人的世界"
   - "明明知道該放下了，但還是忍不住一直去看他的社群"

   Eyeball checks. If any reply fails, tune `prompt-builder.ts` and re-run.

---

## 11. Open Questions / Deferred Decisions

These are deliberately deferred until after skeleton is validated:

- **API key encryption** — plain storage now; later: Web Crypto + device-bound key.
- **Streaming response** — non-streaming for now; SDK supports streaming when we add Ink-Drop animation.
- **History analytics** — only listing for now; no aggregate stats, no AI-driven insights.
- **Other 4 categories' strategies** — defined in AGENTS.md §3 but not wired up.
- **Cross-session AI memory** — explicitly out of skeleton scope; revisit when designing v1.1 full release.
- **PWA offline mode** — Service Worker + manifest deferred until skeleton AI quality is validated.

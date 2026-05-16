# SutraMind PWA — Analytics Pipeline + The Mind Mirror

**Spec date:** 2026-05-16
**Scope:** Phase 3-A (analytics pipeline) + Phase 3-B (Mind Mirror visualization), combined.
**Out of scope:** Phase 3-C Daily Insight ritual; cultivation_rank gamification; bell audio. See §10.
**Source of vision:** `docs/SutraMind PWA 系統設計文件 (v2.0).md` §2, §3, §5.

---

## 1. Goal

Turn the existing chat-only walking skeleton into a **data-driven self-observation surface**. Every completed 3-round session is silently analyzed by Gemma into 5 quantified emotional dimensions; the user can open a new `/mirror` page to see today's "attachment index" and the radar/trend visualizations that emerge as data accumulates. Privacy and Zen tone unchanged.

## 2. Locked design decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Scope | Phase 3-A pipeline + Phase 3-B Mirror combined in one spec; Daily Insight deferred |
| 2 | Pipeline trigger | Session completion (round 3 done) → fire-and-forget |
| 3 | Mirror route | Standalone `/mirror`; AppHeader gets nav link「心鏡」alongside「歷史」|
| 4 | Model | `gemma-4-31b-it` (same as chat); prompt-embedded `[Output Contract]` + SDK `responseSchema` double-protection |
| 5 | Schema migration | Dexie `version(2)` adds `analytics` + `profile` tables only; `apiKey` / `sessions` untouched |
| 6 | Same-day aggregation | Per-dimension `max`; `mind_summary` and `recommended_segment` overwritten by latest session; 執著指數 computed on-the-fly (not stored) |

## 3. Architecture

```
[Round 3 done] ──fire-and-forget──> [pipelineChatToAnalytics(apiKey, session)]
                                                │
                                      [buildAnalyticsPrompt → Gemma 4]
                                                │
                                      [parseAnalyticsResponse]
                                                │
                                      [mergeDailyAnalytics(date, ...)]
                                                │
                                            db.analytics
                                                │
[/mirror page] ───useLiveQuery──────────────────┘
       │
       ├── AttachmentIndex (今日執著指數 + mind_summary)
       ├── RadarPanel      (5 維 max 分布, toggle 今日/7日)
       └── TrendPanel      (執著指數最近 30 日, line chart)
```

**Key invariant:** the analytics pipeline never blocks, never surfaces error UI, never affects chat. If it fails, the day simply has no analytics row — the next session's pipeline call will merge into the same date and recover.

## 4. Data model

### 4.1 New types — `src/types/analytics.ts`

```typescript
// 5 dimensions, each 0-10 integer
export interface EmotionMetrics {
  work_anxiety: number          // 職場焦慮
  relationship_clinging: number // 關係執著
  existential_emptiness: number // 存在虛無 / 年齡焦慮
  health_fear: number           // 健康 / 病痛恐懼
  acute_emotion: number         // 突發性情緒衝擊
}

export const EMOTION_DIMENSIONS = [
  'work_anxiety',
  'relationship_clinging',
  'existential_emptiness',
  'health_fear',
  'acute_emotion',
] as const

export type EmotionDimension = (typeof EMOTION_DIMENSIONS)[number]

export interface DailyAnalytics {
  date: string                       // PK, local-TZ 'YYYY-MM-DD'
  metrics: EmotionMetrics            // per-dimension max over the day
  mind_summary: string               // latest session's summary, ≤80 chars
  recommended_segment: string | null // 'segment_1' .. 'segment_9' from latest session
  updated_at: number                 // epoch ms (debug / cache invalidation)
  source_session_ids: number[]       // contributing session ids (debug + future reweighting)
}

export interface ProfileRecord {
  key: string                        // PK
  value: unknown                     // arbitrary JSON
}
```

### 4.2 Dexie migration — `src/lib/db.ts`

```typescript
this.version(1).stores({
  apiKey: '++id',
  sessions: '++id, category, startedAt',
})
this.version(2).stores({
  apiKey: '++id',                    // unchanged
  sessions: '++id, category, startedAt',  // unchanged
  analytics: 'date',                 // NEW — PK = YYYY-MM-DD
  profile: 'key',                    // NEW — generic kv
})
```

Dexie's auto-migration handles `version(1) → version(2)` by adding the new stores; no data transformation needed. Existing users keep all their sessions.

### 4.3 New db helpers (all in `lib/db.ts` — UI never touches Dexie directly)

```typescript
export async function getDailyAnalytics(date: string): Promise<DailyAnalytics | undefined>
export async function listAnalytics(): Promise<DailyAnalytics[]>  // ordered by date asc
export async function mergeDailyAnalytics(
  date: string,
  incoming: {
    metrics: EmotionMetrics
    mind_summary: string
    recommended_segment: string | null
    source_session_id: number
  },
): Promise<void>
export async function getProfile<T = unknown>(key: string): Promise<T | null>
export async function setProfile(key: string, value: unknown): Promise<void>
```

`mergeDailyAnalytics` semantics:
- If no row for `date`: insert new row with `metrics = incoming.metrics`, `source_session_ids = [incoming.source_session_id]`
- If row exists: per-dimension `Math.max(existing[dim], incoming.metrics[dim])`, overwrite `mind_summary`, overwrite `recommended_segment`, push `source_session_id` (dedupe), update `updated_at`

### 4.4 Date helper — `src/lib/date-utils.ts` (new)

```typescript
export function todayLocalISO(now: Date = new Date()): string {
  // 'YYYY-MM-DD' in user's local TZ
  return now.toLocaleDateString('sv-SE')   // 'sv-SE' yields ISO format
}
```

## 5. Pipeline

### 5.1 Prompt builder — `src/lib/analytics-prompt-builder.ts` (new, pure)

```typescript
export interface BuildAnalyticsPromptInput {
  messages: ChatMessage[]
  category: CategoryId
}

export function buildAnalyticsPrompt(input: BuildAnalyticsPromptInput): GeminiPayload
```

The systemInstruction has these blocks (joined with `\n\n`):

```
[Role]
你是專精心經與情緒量化分析的 observer。理性、客觀地把對話內容
抽取成 5 維情緒指標。不評論、不安慰、不勸誡。

[Dimension Definitions]
- work_anxiety           職場 / 工作 / 成就焦慮
- relationship_clinging  關係 / 親密 / 人際執著
- existential_emptiness  存在虛無 / 年齡 / 意義匱乏
- health_fear            身體病痛 / 死亡 / 失能恐懼
- acute_emotion          突發性情緒高峰（憤怒、悲慟、恐慌）

[Scoring Rules]
- 每維 0-10 整數
- 0 = 對話完全未觸及；3 = 隱約提及；6 = 明確困擾；9-10 = 強烈痛苦
- 評估「使用者本人」的狀態，不評估 AI 回覆

[Sutra Hint]
從 segment_1 .. segment_9 挑 1 個最對應使用者主要痛苦的段落

[Output Contract]
{
  "metrics": {
    "work_anxiety": int,
    "relationship_clinging": int,
    "existential_emptiness": int,
    "health_fear": int,
    "acute_emotion": int
  },
  "mind_summary": string,        // ≤80 字，第三人稱客觀觀察，無安慰語
  "recommended_segment": string  // "segment_1" .. "segment_9"
}
```

`contents` formats the session's user/model messages chronologically as Gemini `Content[]`.

`responseSchema` field is also set (belt-and-suspenders — Gemma may or may not honor it; if not, the `[Output Contract]` block carries the burden). Same pattern as `prompt-builder.ts:79-94`.

### 5.2 Pipeline orchestrator — `src/lib/analytics-pipeline.ts` (new)

```typescript
export async function pipelineChatToAnalytics(
  apiKey: string,
  session: Session,
): Promise<void>
```

Algorithm:
1. `buildAnalyticsPrompt({ messages: session.messages, category: session.category })`
2. `callGeminiRaw(apiKey, payload)` → raw text
3. `parseAnalyticsResponse(raw)` → validated `{ metrics, mind_summary, recommended_segment }`
4. `mergeDailyAnalytics(todayLocalISO(), { ...parsed, source_session_id: session.id })`

### 5.3 gemini.ts refactor

Split current `callGemini` into:
- `callGeminiRaw(apiKey, payload): Promise<string>` — owns the SDK call, retry on NETWORK/UNKNOWN, error classification. Returns raw text.
- `callGemini(apiKey, payload): Promise<GeminiStructuredResponse>` — calls `callGeminiRaw`, then chat-specific schema parse (referenced_segment_ids + response_text).

Both share `GeminiError`, `classifyGeminiError`, retry constants. **No duplication of error logic.**

**Chat behavioral contract preserved:** `callGemini` returns the exact same shape as today; the chat path (`useChatSession`, `prompt-builder.ts`, error classification, retry semantics, INVALID_RESPONSE detection) sees no functional change. The refactor is purely internal extraction.

### 5.4 Analytics response parser — `src/lib/analytics-parser.ts` (new)

```typescript
export function parseAnalyticsResponse(raw: string): {
  metrics: EmotionMetrics
  mind_summary: string
  recommended_segment: string | null
}
```

Logic:
1. **Extract JSON**: find first `{` and matching balanced `}` (tolerates markdown fences like \`\`\`json…\`\`\` and prefix text)
2. `JSON.parse` the extracted substring; throw `GeminiError('INVALID_RESPONSE', ..., true)` on failure
3. Validate shape: `metrics` object exists, all 5 dimension keys present and numeric, `mind_summary` is string
4. **Clamp**: each dimension to `[0, 10]` integer (Math.round then Math.min(10, Math.max(0, x)))
5. Validate `recommended_segment` is `segment_1` .. `segment_9`; if missing or invalid, set to `null` (don't throw — it's optional)

### 5.5 Trigger — `src/hooks/useChatSession.ts`

In the existing `finalizeSession` (or wherever round 3 transitions to `done`), after `completeSession(sessionId)`:

```typescript
// fire-and-forget — never block UI, never surface errors
getSession(sessionId)
  .then((full) => {
    if (full) {
      return pipelineChatToAnalytics(apiKey, full)
    }
  })
  .catch((err) => {
    console.warn('[analytics] pipeline failed silently', err)
  })
```

The promise chain is NOT `await`ed. UI navigation continues immediately.

## 6. Mind Mirror UI

### 6.1 Route

`src/app/mirror/page.tsx` — `'use client'` page using `useLiveQuery(() => listAnalytics())`.

### 6.2 Components

```
src/components/MindMirror/
  RadarPanel.tsx         # Recharts RadarChart
  TrendPanel.tsx         # Recharts LineChart
  AttachmentIndex.tsx    # large numeric display + mind_summary
  EmptyMirror.tsx        # cold-start CTA
src/lib/mirror-stats.ts  # pure: attachmentIndex(m), last7Days(a), last30Days(a)
```

### 6.3 Layout (vertical stack, same on mobile and desktop)

```
┌──────────────────────────────────────────────┐
│ AppHeader (心經數位道場)        [心鏡][歷史]│
├──────────────────────────────────────────────┤
│ <h2>心鏡</h2>  「映照本週執著之分布」        │
├──────────────────────────────────────────────┤
│ ┌── .gold-frame ──┐                          │
│ │ 今日執著指數     │  ← AttachmentIndex      │
│ │   4.2 / 10      │                          │
│ │ 心靈摘要文字... │                          │
│ └─────────────────┘                          │
├──────────────────────────────────────────────┤
│ ┌── .gold-frame ──┐                          │
│ │ 五維執著分布     │  ← RadarPanel           │
│ │  [Radar]         │     (toggle: 今日/7日)  │
│ └─────────────────┘                          │
├──────────────────────────────────────────────┤
│ ┌── .gold-frame ──┐                          │
│ │ 空性趨勢         │  ← TrendPanel (30 日)   │
│ │  [Line Chart]    │                          │
│ │ 「執著漸消，度一切苦厄」                   │
│ └─────────────────┘                          │
└──────────────────────────────────────────────┘
```

### 6.4 Cold-start rules

"Rows" below means **total `analytics` rows in IndexedDB** (one per distinct local date), not rows within any time window.

| Data state | Display |
|---|---|
| 0 analytics rows | `<EmptyMirror />`: LotusGlyph + 「心鏡未起。請先安住於對話，讓執著浮現」+ CTA 連 `/categories` |
| 1-2 rows | `AttachmentIndex` + `RadarPanel`; `TrendPanel` shows placeholder「累積至 3 日方可觀照趨勢」|
| ≥ 3 rows | All three panels render; `TrendPanel` shows last 30 days (or all if fewer) |

`AttachmentIndex` always sources the **most recent** row (by `date` desc). `RadarPanel`'s "今日" toggle uses that same row's metrics; "7日" toggle uses `aggregateMetricsMax(last7Days(rows))`.

### 6.5 Chart specs (Recharts)

- **Radar**: 5 axes; `domain={[0, 10]}`; fill `zen-accent` with `fillOpacity={0.3}`; stroke same color solid; grid dashed `zen-muted`
- **Trend Line**: x = date as `MM/DD`; y = 執著指數 `[0, 10]`; line stroke `zen-accent`; solid dots; no area fill
- **Tooltip**: custom component using `zen-surface` background + 1px gold border + `font-serif`
- **Animation**: `isAnimationActive={true}, animationDuration={800}` on first mount; disabled on subsequent liveQuery updates (prevent flicker). Implement via a `useRef<boolean>(true)` that flips to `false` in a `useEffect` after first render; pass `isAnimationActive={firstMountRef.current}` to Recharts. When `useReducedMotion()` returns true → force `animationDuration={0}` regardless

### 6.6 Stats functions — `src/lib/mirror-stats.ts`

```typescript
export function attachmentIndex(m: EmotionMetrics): number {
  return (
    m.work_anxiety + m.relationship_clinging +
    m.existential_emptiness + m.health_fear + m.acute_emotion
  ) / 5  // 0-10
}

export function last7Days(rows: DailyAnalytics[]): DailyAnalytics[]    // up to 7 most recent by date desc
export function last30Days(rows: DailyAnalytics[]): DailyAnalytics[]   // up to 30 most recent by date desc
export function aggregateMetricsMax(rows: DailyAnalytics[]): EmotionMetrics
// returns per-dimension max across all input rows; if rows is empty, all dimensions = 0
```

### 6.7 AppHeader nav update

`src/components/AppHeader.tsx` adds nav links right-aligned:

```tsx
<nav className="flex gap-4 text-sm text-zen-muted">
  <Link href="/mirror" className="hover:text-zen-accent">心鏡</Link>
  <Link href="/history" className="hover:text-zen-accent">歷史</Link>
</nav>
```

Existing `<h1>心經數位道場</h1>` stays. Mirror page uses `<h2>心鏡</h2>` to keep heading hierarchy valid (per CLAUDE.md convention).

## 7. Error handling matrix

| Error kind | Pipeline behavior | User perception | Mirror impact |
|---|---|---|---|
| `AUTH_FAILED` | `catch` → `console.warn` → drop; do NOT clear key (chat will surface on next user input) | None | No row for this date |
| `RATE_LIMIT` (429) | `callGeminiRaw` retries (3s/5s); final fail → drop | None | No row; next session retries |
| `NETWORK` | Same as RATE_LIMIT | None | Same |
| `INVALID_RESPONSE` (bad JSON / shape) | `parseAnalyticsResponse` throws → caught → `console.warn` with first 200 chars of raw | None | No row; next session retries |
| Out-of-range dimension (e.g., `work_anxiety: 15`) | `parseAnalyticsResponse` clamps to `[0, 10]`, continues; `console.warn('analytics clamped', dim, value)` | None | Row written (clamped) |
| `mergeDailyAnalytics` write fails (quota / corruption) | Throw → caught → `console.warn` | None | No row |

**Core discipline:** the analytics pipeline NEVER surfaces error UI. There is no "資料載入失敗" message anywhere in Mirror. Either data exists (render it) or it doesn't (render `EmptyMirror`).

## 8. Privacy reaffirmation

- All analytics data stays in the same IndexedDB the chat history lives in — never leaves the device
- The new `pipelineChatToAnalytics` call goes to Gemini API just like chat calls; uses the same user-provided BYOK key; no new endpoints
- `source_session_ids` references local Dexie IDs only — meaningless outside the device
- No new telemetry, no analytics service, no logging beyond `console.warn` for dev debugging

## 9. Testing strategy

Unit tests (Vitest + fake-indexeddb):

| Test file | Subject under test | Coverage focus |
|---|---|---|
| `tests/analytics-prompt-builder.test.ts` | `buildAnalyticsPrompt` | systemInstruction blocks present; 5 dimensions in Output Contract; category injected; responseSchema shape correct |
| `tests/analytics-parser.test.ts` | `parseAnalyticsResponse` | (a) clean JSON; (b) markdown-fenced; (c) prefixed text + fence; (d) out-of-range clamp; (e) missing optional `recommended_segment` → null; (f) missing required field → INVALID_RESPONSE |
| `tests/analytics-merge.test.ts` | `mergeDailyAnalytics` | (a) first write; (b) same-day per-dim max; (c) `mind_summary` overwrite; (d) `source_session_ids` push with dedupe |
| `tests/analytics-pipeline.test.ts` | `pipelineChatToAnalytics` | mock `callGeminiRaw`: happy path writes; AUTH/RATE/INVALID/quota each don't throw to caller |
| `tests/mirror-stats.test.ts` | `attachmentIndex`, `last7Days`, `last30Days`, `aggregateMetricsMax` | numeric correctness; 0/1/30/100 row edges; missing intermediate days |
| `tests/gemini-raw.test.ts` | `callGeminiRaw` / `callGemini` split | retry logic unchanged; chat path still validates referenced_segment_ids + response_text |

Coverage goal: **≥ 80%** of new code (matches project standard).

Manual browser verification (record in spec §9 follow-up):

1. `/mirror` with 0 rows → EmptyMirror; CTA links to `/categories`
2. After 1 completed session → AttachmentIndex + RadarPanel render; TrendPanel placeholder
3. After 3 completed sessions across 3 dates → all three panels; TrendPanel line has 3 points
4. AppHeader nav: 「心鏡」/「歷史」both reachable and active states correct
5. Same-day second session merges: dimensions go up (max), `mind_summary` updates to latest
6. `prefers-reduced-motion`: Recharts animations disabled
7. Network offline mid-session: chat completes, analytics drops silently, no error UI
8. Mirror page re-renders smoothly when liveQuery updates (no flicker from animation re-runs)

## 10. Out of scope / explicit non-goals

| Item | Why deferred | Future trigger |
|---|---|---|
| Daily Insight morning ritual (v2.0 §4) | Phase 3-C; needs ≥7 days of data to be meaningful | Two weeks after 3-A/3-B ship |
| Bell audio | Belongs with Daily Insight ritual | Phase 3-C |
| `cultivation_rank` gamification | `profile` table is pre-built but UI/logic out of MVP | Phase 3-D |
| CSV export / backup | No user demand signal | Not planned |
| Week-over-week radar overlay | High design cost, low MVP value | Re-evaluate after heavy usage |
| Backfill of pre-v2.0 sessions | Accepted: data starts now (禪意 "begin where you are") | Not planned |
| Historical row deduplication of `source_session_ids` push | Insignificant size (300 ints / 30 days) | Not planned |
| Mirror skeleton loader | Reuses `<BreathingLoader />` for liveQuery undefined state | N/A |

## 11. Known trade-offs

- **+1 API call per completed session**: ~3 sessions/day × 1 = 3 extra calls vs. Gemma 4's 1500 RPD — negligible
- **No backfill**: pre-v2.0 sessions never analyzed; accepted as feature
- **`source_session_ids` grows unbounded** within a day's row, but bounded in practice (~10/day max) and small per-entry (int)
- **`gemma-4-31b-it` structured-output undocumented**: production has been running with prompt-embedded contract; this spec inherits that proven pattern
- **Recharts adds ~80 KB gz bundle** — accepted, no alternative meets the chart requirements

## 12. File-level change inventory

**New files:**
- `src/types/analytics.ts`
- `src/lib/date-utils.ts`
- `src/lib/analytics-prompt-builder.ts`
- `src/lib/analytics-parser.ts`
- `src/lib/analytics-pipeline.ts`
- `src/lib/mirror-stats.ts`
- `src/app/mirror/page.tsx`
- `src/components/MindMirror/AttachmentIndex.tsx`
- `src/components/MindMirror/RadarPanel.tsx`
- `src/components/MindMirror/TrendPanel.tsx`
- `src/components/MindMirror/EmptyMirror.tsx`
- `tests/analytics-prompt-builder.test.ts`
- `tests/analytics-parser.test.ts`
- `tests/analytics-merge.test.ts`
- `tests/analytics-pipeline.test.ts`
- `tests/mirror-stats.test.ts`
- `tests/gemini-raw.test.ts`

**Modified files:**
- `src/lib/db.ts` — `version(2)` migration + new helpers
- `src/lib/gemini.ts` — extract `callGeminiRaw`; existing `callGemini` becomes thin wrapper
- `src/hooks/useChatSession.ts` — fire-and-forget pipeline trigger on session completion
- `src/components/AppHeader.tsx` — add nav links 心鏡 / 歷史
- `CLAUDE.md` — update tech stack (Gemma 4 not Gemini 2.5 Flash); add module map entries; note Phase 3-A/B shipped
- `TODO.md` — move Phase 3-A/B from backlog to shipped; note Phase 3-C is next
- `package.json` — add `recharts` dependency

## 13. Dependency additions

- `recharts` (^2.x) — only new runtime dep; ~80 KB gz

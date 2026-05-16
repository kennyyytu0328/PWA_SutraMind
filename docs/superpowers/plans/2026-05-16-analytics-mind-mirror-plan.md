# Analytics Pipeline + Mind Mirror Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 3-A analytics pipeline (Gemma-powered 5-dimension emotional extraction triggered at every session completion, persisted to a new Dexie `analytics` table) and Phase 3-B Mind Mirror page (`/mirror` with Recharts radar + trend line) — as specified in `docs/superpowers/specs/2026-05-16-analytics-mind-mirror-design.md`.

**Architecture:** Round-3-done in `useChatSession` fire-and-forgets `pipelineChatToAnalytics(apiKey, session)`. The pipeline calls Gemma 4 with a prompt-embedded `[Output Contract]` (belt-and-suspenders pattern, since Gemma's `responseSchema` support is undocumented), parses the JSON with markdown-fence + brace-balancing tolerance, clamps each dimension to `[0, 10]`, and merges into a per-date `analytics` row (per-dimension `max`; `mind_summary` and `recommended_segment` overwritten by latest session). `/mirror` reads via `useLiveQuery(listAnalytics)` and renders Recharts radar + trend + a numeric attachment-index card. Pipeline failures never surface UI — chat is untouched.

**Tech Stack:** Next.js 14 App Router (`output: 'export'`), TypeScript 5, React 18, Tailwind 3, Dexie 4 + `dexie-react-hooks`, `@google/genai` 1.x, **`recharts` ^2.x (new dependency)**, Vitest + fake-indexeddb.

---

## File Structure

**New source files (12):**

| File | Responsibility |
|---|---|
| `src/types/analytics.ts` | `EmotionMetrics`, `EMOTION_DIMENSIONS`, `DailyAnalytics`, `ProfileRecord` types |
| `src/lib/date-utils.ts` | `todayLocalISO(now?: Date): string` — local-TZ `YYYY-MM-DD` |
| `src/lib/analytics-prompt-builder.ts` | Pure `buildAnalyticsPrompt(input)` returning a `GeminiPayload` |
| `src/lib/analytics-parser.ts` | `parseAnalyticsResponse(raw)` with markdown/brace tolerance + clamp |
| `src/lib/analytics-pipeline.ts` | `pipelineChatToAnalytics(apiKey, session)` orchestrator |
| `src/lib/mirror-stats.ts` | `attachmentIndex`, `last7Days`, `last30Days`, `aggregateMetricsMax` |
| `src/app/mirror/page.tsx` | `/mirror` page assembly with `useLiveQuery` + cold-start branching |
| `src/components/MindMirror/AttachmentIndex.tsx` | Numeric card + mind_summary |
| `src/components/MindMirror/RadarPanel.tsx` | Recharts RadarChart + today/7-day toggle |
| `src/components/MindMirror/TrendPanel.tsx` | Recharts LineChart + cold-start placeholder |
| `src/components/MindMirror/EmptyMirror.tsx` | 0-row CTA |
| (No barrel) | Components import directly |

**Modified source files (4):**

| File | Change |
|---|---|
| `src/lib/db.ts` | Dexie `version(2)` adds `analytics` + `profile`; add helpers `getDailyAnalytics`, `listAnalytics`, `mergeDailyAnalytics`, `getProfile`, `setProfile` |
| `src/lib/gemini.ts` | Extract `callGeminiRaw`; `callGemini` becomes thin wrapper preserving identical chat behavior |
| `src/hooks/useChatSession.ts` | After each of 3 `completeSession` calls, fire-and-forget `triggerAnalytics(sessionId, apiKey)` |
| `src/components/AppHeader.tsx` | Add right-aligned nav links `心鏡` (`/mirror`) and `歷史` (`/history`) |

**New test files (6):**

| File | Tests |
|---|---|
| `tests/date-utils.test.ts` | Local-TZ formatting, leap-year edge |
| `tests/analytics-parser.test.ts` | Clean JSON, markdown fence, prefixed text, clamp, missing field, null recommended |
| `tests/analytics-prompt-builder.test.ts` | Role/dimension/scoring/contract blocks; category injection; responseSchema shape; chronological history mapping |
| `tests/analytics-merge.test.ts` | First write, same-day max, mind_summary overwrite, source_session_ids dedupe |
| `tests/analytics-pipeline.test.ts` | Happy path; AUTH/RATE/INVALID/quota all don't throw |
| `tests/mirror-stats.test.ts` | Index math, windowing, max aggregation, empty input |

**Documentation updates:** `CLAUDE.md`, `TODO.md` updated in final task.

**Dependency additions:** `recharts` ^2 (added in Task 9).

---

## Task 1: Add `EmotionMetrics`, `DailyAnalytics`, `ProfileRecord` types

**Files:**
- Create: `src/types/analytics.ts`

- [ ] **Step 1: Create the types file**

Write `src/types/analytics.ts`:

```typescript
export interface EmotionMetrics {
  work_anxiety: number          // 職場焦慮 0-10
  relationship_clinging: number // 關係執著 0-10
  existential_emptiness: number // 存在虛無 / 年齡焦慮 0-10
  health_fear: number           // 健康 / 病痛恐懼 0-10
  acute_emotion: number         // 突發性情緒衝擊 0-10
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
  date: string                       // PK, local-TZ YYYY-MM-DD
  metrics: EmotionMetrics
  mind_summary: string               // <=80 chars
  recommended_segment: string | null // segment_1 .. segment_9
  updated_at: number                 // epoch ms
  source_session_ids: number[]
}

export interface ProfileRecord {
  key: string
  value: unknown
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors (file is type-only, no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add src/types/analytics.ts
git commit -m "feat(types): add EmotionMetrics, DailyAnalytics, ProfileRecord types"
```

---

## Task 2: Add `todayLocalISO` date helper (TDD)

**Files:**
- Create: `src/lib/date-utils.ts`
- Test: `tests/date-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/date-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { todayLocalISO } from '@/lib/date-utils'

describe('todayLocalISO', () => {
  it('returns YYYY-MM-DD for a given Date in local TZ', () => {
    // 2026-05-16 noon local
    const d = new Date(2026, 4, 16, 12, 0, 0)
    expect(todayLocalISO(d)).toBe('2026-05-16')
  })

  it('handles single-digit month/day with zero padding', () => {
    const d = new Date(2026, 0, 5, 9, 0, 0) // Jan 5
    expect(todayLocalISO(d)).toBe('2026-01-05')
  })

  it('uses local date (not UTC) — late-night case', () => {
    // 23:30 local on May 16; in many TZs this is May 17 UTC.
    // The helper must report local date = 2026-05-16.
    const d = new Date(2026, 4, 16, 23, 30, 0)
    expect(todayLocalISO(d)).toBe('2026-05-16')
  })

  it('uses current date when called with no argument', () => {
    const result = todayLocalISO()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

Run: `pnpm exec vitest run tests/date-utils.test.ts`
Expected: FAIL — `Cannot find module '@/lib/date-utils'`.

- [ ] **Step 3: Implement minimal helper**

Create `src/lib/date-utils.ts`:

```typescript
export function todayLocalISO(now: Date = new Date()): string {
  // 'sv-SE' (Swedish) locale renders dates as YYYY-MM-DD natively,
  // and toLocaleDateString uses the system local time zone.
  return now.toLocaleDateString('sv-SE')
}
```

- [ ] **Step 4: Run test to confirm GREEN**

Run: `pnpm exec vitest run tests/date-utils.test.ts`
Expected: all 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/date-utils.ts tests/date-utils.test.ts
git commit -m "feat(date): todayLocalISO returns local-TZ YYYY-MM-DD"
```

---

## Task 3: Dexie `version(2)` migration + analytics/profile helpers (TDD)

**Files:**
- Modify: `src/lib/db.ts`
- Test: `tests/analytics-merge.test.ts` (new)
- Test: `tests/db.test.ts` (existing — must still pass unchanged)

- [ ] **Step 1: Write the failing test**

Create `tests/analytics-merge.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  db,
  getDailyAnalytics,
  listAnalytics,
  mergeDailyAnalytics,
  getProfile,
  setProfile,
} from '@/lib/db'
import type { EmotionMetrics } from '@/types/analytics'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const baseMetrics: EmotionMetrics = {
  work_anxiety: 3,
  relationship_clinging: 2,
  existential_emptiness: 1,
  health_fear: 0,
  acute_emotion: 4,
}

describe('mergeDailyAnalytics — first write', () => {
  it('inserts a new row when date has no prior data', async () => {
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics,
      mind_summary: 'first summary',
      recommended_segment: 'segment_4',
      source_session_id: 101,
    })
    const row = await getDailyAnalytics('2026-05-16')
    expect(row).toBeDefined()
    expect(row!.metrics).toEqual(baseMetrics)
    expect(row!.mind_summary).toBe('first summary')
    expect(row!.recommended_segment).toBe('segment_4')
    expect(row!.source_session_ids).toEqual([101])
    expect(row!.updated_at).toBeTypeOf('number')
  })
})

describe('mergeDailyAnalytics — same-day merge', () => {
  it('takes per-dimension max', async () => {
    await mergeDailyAnalytics('2026-05-16', {
      metrics: { work_anxiety: 3, relationship_clinging: 8, existential_emptiness: 1, health_fear: 0, acute_emotion: 4 },
      mind_summary: 'first',
      recommended_segment: 'segment_4',
      source_session_id: 1,
    })
    await mergeDailyAnalytics('2026-05-16', {
      metrics: { work_anxiety: 7, relationship_clinging: 2, existential_emptiness: 5, health_fear: 6, acute_emotion: 4 },
      mind_summary: 'second',
      recommended_segment: 'segment_1',
      source_session_id: 2,
    })
    const row = await getDailyAnalytics('2026-05-16')
    expect(row!.metrics).toEqual({
      work_anxiety: 7,            // max(3,7)
      relationship_clinging: 8,   // max(8,2)
      existential_emptiness: 5,   // max(1,5)
      health_fear: 6,             // max(0,6)
      acute_emotion: 4,           // max(4,4)
    })
  })

  it('overwrites mind_summary with the latest', async () => {
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'old', recommended_segment: 'segment_1', source_session_id: 1,
    })
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'new', recommended_segment: 'segment_2', source_session_id: 2,
    })
    const row = await getDailyAnalytics('2026-05-16')
    expect(row!.mind_summary).toBe('new')
    expect(row!.recommended_segment).toBe('segment_2')
  })

  it('appends source_session_ids with dedupe', async () => {
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'a', recommended_segment: null, source_session_id: 1,
    })
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'b', recommended_segment: null, source_session_id: 2,
    })
    await mergeDailyAnalytics('2026-05-16', {
      metrics: baseMetrics, mind_summary: 'c', recommended_segment: null, source_session_id: 1, // duplicate
    })
    const row = await getDailyAnalytics('2026-05-16')
    expect(row!.source_session_ids).toEqual([1, 2])
  })
})

describe('listAnalytics', () => {
  it('returns rows in ascending date order', async () => {
    await mergeDailyAnalytics('2026-05-16', { metrics: baseMetrics, mind_summary: 'b', recommended_segment: null, source_session_id: 2 })
    await mergeDailyAnalytics('2026-05-15', { metrics: baseMetrics, mind_summary: 'a', recommended_segment: null, source_session_id: 1 })
    await mergeDailyAnalytics('2026-05-17', { metrics: baseMetrics, mind_summary: 'c', recommended_segment: null, source_session_id: 3 })
    const rows = await listAnalytics()
    expect(rows.map((r) => r.date)).toEqual(['2026-05-15', '2026-05-16', '2026-05-17'])
  })

  it('returns empty array when none stored', async () => {
    expect(await listAnalytics()).toEqual([])
  })
})

describe('profile kv', () => {
  it('returns null for missing key', async () => {
    expect(await getProfile('missing')).toBeNull()
  })

  it('round-trips a string value', async () => {
    await setProfile('cultivation_rank', 'beginner')
    expect(await getProfile<string>('cultivation_rank')).toBe('beginner')
  })

  it('round-trips an object value', async () => {
    await setProfile('settings', { bell: true, theme: 'dark' })
    expect(await getProfile<{ bell: boolean; theme: string }>('settings')).toEqual({
      bell: true,
      theme: 'dark',
    })
  })

  it('overwrites on second set', async () => {
    await setProfile('k', 1)
    await setProfile('k', 2)
    expect(await getProfile<number>('k')).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

Run: `pnpm exec vitest run tests/analytics-merge.test.ts`
Expected: FAIL — imports `getDailyAnalytics`, `listAnalytics`, `mergeDailyAnalytics`, `getProfile`, `setProfile` not exported.

- [ ] **Step 3: Modify `src/lib/db.ts`**

Open `src/lib/db.ts`. Replace the entire file content with:

```typescript
import Dexie, { type EntityTable } from 'dexie'
import type {
  ApiKeyRecord,
  Session,
  ChatMessage,
  CategoryId,
} from '@/types/chat'
import type {
  DailyAnalytics,
  EmotionMetrics,
  ProfileRecord,
} from '@/types/analytics'
import { EMOTION_DIMENSIONS } from '@/types/analytics'

class SutraMindDB extends Dexie {
  apiKey!: EntityTable<ApiKeyRecord, 'id'>
  sessions!: EntityTable<Session, 'id'>
  analytics!: EntityTable<DailyAnalytics, 'date'>
  profile!: EntityTable<ProfileRecord, 'key'>

  constructor() {
    super('SutraMindDB')
    this.version(1).stores({
      apiKey: '++id',
      sessions: '++id, category, startedAt',
    })
    this.version(2).stores({
      apiKey: '++id',
      sessions: '++id, category, startedAt',
      analytics: 'date',
      profile: 'key',
    })
  }
}

export const db = new SutraMindDB()

// ── apiKey CRUD ─────────────────────────────────────────────
export async function saveApiKey(value: string): Promise<void> {
  await db.transaction('rw', db.apiKey, async () => {
    await db.apiKey.clear()
    await db.apiKey.add({ value, savedAt: Date.now() })
  })
}

export async function loadApiKey(): Promise<string | null> {
  const row = await db.apiKey.toCollection().first()
  return row?.value ?? null
}

export async function clearApiKey(): Promise<void> {
  await db.apiKey.clear()
}

// ── sessions CRUD ───────────────────────────────────────────
export async function createSession(category: CategoryId): Promise<number> {
  return (await db.sessions.add({
    category,
    startedAt: Date.now(),
    messages: [],
    status: 'active',
  })) as number
}

export async function getSession(id: number): Promise<Session | undefined> {
  return db.sessions.get(id)
}

export async function appendMessage(
  id: number,
  message: ChatMessage
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const s = await db.sessions.get(id)
    if (!s) throw new Error(`Session ${id} not found`)
    await db.sessions.update(id, { messages: [...s.messages, message] })
  })
}

export async function completeSession(id: number): Promise<void> {
  await db.sessions.update(id, {
    status: 'completed',
    endedAt: Date.now(),
  })
}

export async function abandonStaleActiveSessions(): Promise<void> {
  const active = await db.sessions.where('status').equals('active').toArray()
  for (const s of active) {
    if (s.id != null) {
      await db.sessions.update(s.id, { status: 'abandoned', endedAt: Date.now() })
    }
  }
}

export async function listSessions(): Promise<Session[]> {
  return db.sessions.orderBy('startedAt').reverse().toArray()
}

export async function deleteSession(id: number): Promise<void> {
  await db.sessions.delete(id)
}

// ── analytics CRUD ──────────────────────────────────────────
export async function getDailyAnalytics(
  date: string
): Promise<DailyAnalytics | undefined> {
  return db.analytics.get(date)
}

export async function listAnalytics(): Promise<DailyAnalytics[]> {
  return db.analytics.orderBy('date').toArray()
}

export async function mergeDailyAnalytics(
  date: string,
  incoming: {
    metrics: EmotionMetrics
    mind_summary: string
    recommended_segment: string | null
    source_session_id: number
  }
): Promise<void> {
  await db.transaction('rw', db.analytics, async () => {
    const existing = await db.analytics.get(date)
    if (!existing) {
      await db.analytics.put({
        date,
        metrics: { ...incoming.metrics },
        mind_summary: incoming.mind_summary,
        recommended_segment: incoming.recommended_segment,
        updated_at: Date.now(),
        source_session_ids: [incoming.source_session_id],
      })
      return
    }
    const mergedMetrics = {} as EmotionMetrics
    for (const dim of EMOTION_DIMENSIONS) {
      mergedMetrics[dim] = Math.max(existing.metrics[dim], incoming.metrics[dim])
    }
    const dedupedIds = Array.from(
      new Set([...existing.source_session_ids, incoming.source_session_id])
    )
    await db.analytics.put({
      date,
      metrics: mergedMetrics,
      mind_summary: incoming.mind_summary,
      recommended_segment: incoming.recommended_segment,
      updated_at: Date.now(),
      source_session_ids: dedupedIds,
    })
  })
}

// ── profile kv ──────────────────────────────────────────────
export async function getProfile<T = unknown>(key: string): Promise<T | null> {
  const row = await db.profile.get(key)
  return row ? (row.value as T) : null
}

export async function setProfile(key: string, value: unknown): Promise<void> {
  await db.profile.put({ key, value })
}
```

- [ ] **Step 4: Run new + existing tests to confirm GREEN**

Run: `pnpm exec vitest run tests/analytics-merge.test.ts tests/db.test.ts`
Expected: both files pass — existing db tests should be UNCHANGED in behavior; new merge tests should all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts tests/analytics-merge.test.ts
git commit -m "feat(db): Dexie v2 adds analytics + profile tables with merge helpers"
```

---

## Task 4: Add `analytics-parser` with markdown-fence + clamp tolerance (TDD)

**Files:**
- Create: `src/lib/analytics-parser.ts`
- Test: `tests/analytics-parser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/analytics-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseAnalyticsResponse } from '@/lib/analytics-parser'
import { GeminiError } from '@/lib/gemini'

const valid = {
  metrics: {
    work_anxiety: 3,
    relationship_clinging: 7,
    existential_emptiness: 1,
    health_fear: 4,
    acute_emotion: 8,
  },
  mind_summary: '心緒翻湧，多在關係與情緒高峰之處執著',
  recommended_segment: 'segment_4',
}

describe('parseAnalyticsResponse — happy paths', () => {
  it('parses clean JSON', () => {
    const r = parseAnalyticsResponse(JSON.stringify(valid))
    expect(r.metrics).toEqual(valid.metrics)
    expect(r.mind_summary).toBe(valid.mind_summary)
    expect(r.recommended_segment).toBe('segment_4')
  })

  it('parses markdown-fenced JSON', () => {
    const raw = '```json\n' + JSON.stringify(valid) + '\n```'
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics).toEqual(valid.metrics)
  })

  it('parses JSON with prefix text and fence', () => {
    const raw = '這裡是分析結果：\n```json\n' + JSON.stringify(valid) + '\n```'
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics).toEqual(valid.metrics)
  })

  it('parses JSON with prefix text and no fence (brace extraction)', () => {
    const raw = 'preface\n' + JSON.stringify(valid) + '\ntrailing'
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics).toEqual(valid.metrics)
  })
})

describe('parseAnalyticsResponse — clamping', () => {
  it('clamps out-of-range dimensions to [0,10]', () => {
    const raw = JSON.stringify({
      ...valid,
      metrics: { ...valid.metrics, work_anxiety: 15, health_fear: -2 },
    })
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics.work_anxiety).toBe(10)
    expect(r.metrics.health_fear).toBe(0)
  })

  it('rounds floats to integers', () => {
    const raw = JSON.stringify({
      ...valid,
      metrics: { ...valid.metrics, work_anxiety: 3.7, acute_emotion: 4.2 },
    })
    const r = parseAnalyticsResponse(raw)
    expect(r.metrics.work_anxiety).toBe(4)
    expect(r.metrics.acute_emotion).toBe(4)
  })
})

describe('parseAnalyticsResponse — optional fields', () => {
  it('returns null for missing recommended_segment', () => {
    const { recommended_segment: _, ...rest } = valid
    const r = parseAnalyticsResponse(JSON.stringify(rest))
    expect(r.recommended_segment).toBeNull()
  })

  it('returns null when recommended_segment is invalid (not segment_N)', () => {
    const r = parseAnalyticsResponse(JSON.stringify({ ...valid, recommended_segment: 'segment_99' }))
    expect(r.recommended_segment).toBeNull()
  })

  it('returns null when recommended_segment is gibberish', () => {
    const r = parseAnalyticsResponse(JSON.stringify({ ...valid, recommended_segment: 'foo' }))
    expect(r.recommended_segment).toBeNull()
  })
})

describe('parseAnalyticsResponse — invalid input throws GeminiError(INVALID_RESPONSE)', () => {
  it('throws when no JSON object can be located', () => {
    expect(() => parseAnalyticsResponse('totally not json')).toThrow(GeminiError)
    try {
      parseAnalyticsResponse('totally not json')
    } catch (e) {
      expect((e as GeminiError).kind).toBe('INVALID_RESPONSE')
    }
  })

  it('throws when metrics object is missing', () => {
    const { metrics: _, ...rest } = valid
    expect(() => parseAnalyticsResponse(JSON.stringify(rest))).toThrow(GeminiError)
  })

  it('throws when a required dimension is missing from metrics', () => {
    const broken = { ...valid, metrics: { ...valid.metrics, work_anxiety: undefined } }
    expect(() => parseAnalyticsResponse(JSON.stringify(broken))).toThrow(GeminiError)
  })

  it('throws when mind_summary is missing', () => {
    const { mind_summary: _, ...rest } = valid
    expect(() => parseAnalyticsResponse(JSON.stringify(rest))).toThrow(GeminiError)
  })

  it('throws when JSON parse itself fails on malformed braces', () => {
    expect(() => parseAnalyticsResponse('{ "metrics": { bad')).toThrow(GeminiError)
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

Run: `pnpm exec vitest run tests/analytics-parser.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `analytics-parser.ts`**

Create `src/lib/analytics-parser.ts`:

```typescript
import { GeminiError } from '@/lib/gemini'
import { EMOTION_DIMENSIONS } from '@/types/analytics'
import type { EmotionMetrics } from '@/types/analytics'

export interface ParsedAnalytics {
  metrics: EmotionMetrics
  mind_summary: string
  recommended_segment: string | null
}

const SEGMENT_RE = /^segment_[1-9]$/

function extractJsonObject(raw: string): string {
  // Find the first '{' and walk braces to find the matching '}'.
  // Tolerates markdown fences (```json ... ```) and surrounding prose.
  const start = raw.indexOf('{')
  if (start === -1) {
    throw new GeminiError('INVALID_RESPONSE', 'No JSON object found in response', true)
  }
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  throw new GeminiError('INVALID_RESPONSE', 'Unbalanced braces in response', true)
}

function clampDim(v: unknown): number {
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new GeminiError('INVALID_RESPONSE', 'Dimension is not a number', true)
  }
  return Math.min(10, Math.max(0, Math.round(v)))
}

export function parseAnalyticsResponse(raw: string): ParsedAnalytics {
  const jsonStr = extractJsonObject(raw)
  let obj: unknown
  try {
    obj = JSON.parse(jsonStr)
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Analytics JSON failed to parse', true)
  }
  if (!obj || typeof obj !== 'object') {
    throw new GeminiError('INVALID_RESPONSE', 'Analytics root is not an object', true)
  }
  const root = obj as Record<string, unknown>
  const metricsRaw = root.metrics
  if (!metricsRaw || typeof metricsRaw !== 'object') {
    throw new GeminiError('INVALID_RESPONSE', 'Analytics metrics missing', true)
  }
  const mRaw = metricsRaw as Record<string, unknown>
  const metrics = {} as EmotionMetrics
  for (const dim of EMOTION_DIMENSIONS) {
    if (mRaw[dim] === undefined) {
      throw new GeminiError('INVALID_RESPONSE', `Metrics dimension ${dim} missing`, true)
    }
    metrics[dim] = clampDim(mRaw[dim])
  }
  if (typeof root.mind_summary !== 'string') {
    throw new GeminiError('INVALID_RESPONSE', 'Analytics mind_summary missing', true)
  }
  const rec = root.recommended_segment
  const recommended_segment =
    typeof rec === 'string' && SEGMENT_RE.test(rec) ? rec : null
  return {
    metrics,
    mind_summary: root.mind_summary,
    recommended_segment,
  }
}
```

- [ ] **Step 4: Run test to confirm GREEN**

Run: `pnpm exec vitest run tests/analytics-parser.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics-parser.ts tests/analytics-parser.test.ts
git commit -m "feat(analytics): parser with markdown fence, brace balance, clamp"
```

---

## Task 5: Refactor `gemini.ts` to split `callGeminiRaw` / `callGemini` (TDD)

**Files:**
- Modify: `src/lib/gemini.ts`
- Test: `tests/gemini-raw.test.ts` (new)

- [ ] **Step 1: Confirm current chat tests pass before refactor**

Run: `pnpm exec vitest run`
Expected: full suite green (sanity baseline). Note the pass count.

- [ ] **Step 2: Write the failing test for the split**

Create `tests/gemini-raw.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the SDK at the boundary so we don't make real network calls.
const generateContentMock = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: generateContentMock },
  })),
}))

import { callGeminiRaw, callGemini, GeminiError, classifyGeminiError, DEFAULT_MODEL } from '@/lib/gemini'
import type { GeminiPayload } from '@/lib/prompt-builder'

const payload: GeminiPayload = {
  systemInstruction: 'sys',
  contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
  responseSchema: { type: 'object' },
  generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
}

beforeEach(() => {
  generateContentMock.mockReset()
})

describe('DEFAULT_MODEL', () => {
  it('is gemma-4-31b-it', () => {
    expect(DEFAULT_MODEL).toBe('gemma-4-31b-it')
  })
})

describe('callGeminiRaw', () => {
  it('returns response.text on success', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '{"hello":"world"}' })
    const out = await callGeminiRaw('key', payload)
    expect(out).toBe('{"hello":"world"}')
    expect(generateContentMock).toHaveBeenCalledTimes(1)
  })

  it('returns empty string when response.text is undefined', async () => {
    generateContentMock.mockResolvedValueOnce({})
    const out = await callGeminiRaw('key', payload)
    expect(out).toBe('')
  })

  it('throws AUTH_FAILED (non-retryable) on 401', async () => {
    generateContentMock.mockRejectedValueOnce({ status: 401, message: 'unauth' })
    await expect(callGeminiRaw('key', payload)).rejects.toMatchObject({
      kind: 'AUTH_FAILED',
      retryable: false,
    })
    expect(generateContentMock).toHaveBeenCalledTimes(1) // no retry
  })

  it('throws RATE_LIMIT (does not auto-retry per shouldAutoRetry policy)', async () => {
    generateContentMock.mockRejectedValue({ status: 429, message: 'rate' })
    await expect(callGeminiRaw('key', payload)).rejects.toMatchObject({
      kind: 'RATE_LIMIT',
    })
    expect(generateContentMock).toHaveBeenCalledTimes(1)
  })
})

describe('callGemini (chat-specific wrapper) — behavior unchanged', () => {
  const chatJson = JSON.stringify({
    referenced_segment_ids: ['segment_4'],
    response_text: '請觀照呼吸',
    closing_practice: null,
  })

  it('parses + returns the validated chat shape on happy path', async () => {
    generateContentMock.mockResolvedValueOnce({ text: chatJson })
    const r = await callGemini('key', payload)
    expect(r.referenced_segment_ids).toEqual(['segment_4'])
    expect(r.response_text).toBe('請觀照呼吸')
  })

  it('throws INVALID_RESPONSE on non-JSON text', async () => {
    generateContentMock.mockResolvedValueOnce({ text: 'not json' })
    await expect(callGemini('key', payload)).rejects.toMatchObject({
      kind: 'INVALID_RESPONSE',
    })
  })

  it('throws INVALID_RESPONSE when response_text is missing', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({ referenced_segment_ids: ['segment_4'] }),
    })
    await expect(callGemini('key', payload)).rejects.toMatchObject({
      kind: 'INVALID_RESPONSE',
    })
  })
})

describe('classifyGeminiError — unchanged from pre-refactor', () => {
  it('classifies TypeError as NETWORK', () => {
    expect(classifyGeminiError(new TypeError('fetch failed')).kind).toBe('NETWORK')
  })

  it('classifies 400 + "API key invalid" as AUTH_FAILED', () => {
    expect(
      classifyGeminiError({ status: 400, message: 'API key not valid' }).kind
    ).toBe('AUTH_FAILED')
  })

  it('classifies unknown errors as UNKNOWN (retryable)', () => {
    const e = classifyGeminiError({ status: 500, message: 'server' })
    expect(e.kind).toBe('UNKNOWN')
    expect(e.retryable).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to confirm RED**

Run: `pnpm exec vitest run tests/gemini-raw.test.ts`
Expected: FAIL — `callGeminiRaw` not yet exported from `@/lib/gemini`.

- [ ] **Step 4: Refactor `src/lib/gemini.ts`**

Replace the existing file content with:

```typescript
import { GoogleGenAI } from '@google/genai'
import type { GeminiPayload } from '@/lib/prompt-builder'
import type { GeminiStructuredResponse } from '@/types/chat'

export type GeminiErrorKind =
  | 'AUTH_FAILED'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN'

export class GeminiError extends Error {
  constructor(
    public kind: GeminiErrorKind,
    message: string,
    public retryable: boolean
  ) {
    super(message)
    this.name = 'GeminiError'
  }
}

function extractStatus(err: unknown): number | undefined {
  const anyErr = err as { status?: unknown; code?: unknown; message?: unknown }
  if (typeof anyErr?.status === 'number') return anyErr.status
  if (typeof anyErr?.code === 'number') return anyErr.code
  const msg = typeof anyErr?.message === 'string' ? anyErr.message : ''
  const m = msg.match(/status:\s*(\d{3})/i) ?? msg.match(/"code"\s*:\s*(\d{3})/)
  return m ? Number(m[1]) : undefined
}

function looksLikeBadApiKey(message: string): boolean {
  return (
    /api[_\s-]?key/i.test(message) &&
    /(invalid|not valid|expired|denied)/i.test(message)
  ) || /API_KEY_INVALID/i.test(message)
}

export function classifyGeminiError(err: unknown): GeminiError {
  if (err instanceof TypeError) {
    return new GeminiError('NETWORK', err.message, true)
  }
  const message =
    typeof (err as { message?: unknown })?.message === 'string'
      ? ((err as { message: string }).message)
      : 'Unknown error'
  const status = extractStatus(err)

  if (status === 401 || status === 403) {
    return new GeminiError('AUTH_FAILED', message, false)
  }
  if (status === 400 && looksLikeBadApiKey(message)) {
    return new GeminiError('AUTH_FAILED', message, false)
  }
  if (status === 429) {
    return new GeminiError('RATE_LIMIT', message, true)
  }
  return new GeminiError('UNKNOWN', message, true)
}

export const DEFAULT_MODEL = 'gemma-4-31b-it'

const RETRY_DELAYS_MS = [3000, 5000]

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function shouldAutoRetry(err: GeminiError): boolean {
  return err.retryable && (err.kind === 'UNKNOWN' || err.kind === 'NETWORK')
}

/**
 * Low-level call: runs SDK request with retry + error classification.
 * Returns raw response text. Used by both chat and analytics paths.
 */
export async function callGeminiRaw(
  apiKey: string,
  payload: GeminiPayload
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey })
  let attempt = 0
  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: payload.contents,
        config: {
          systemInstruction: payload.systemInstruction,
          responseMimeType: payload.generationConfig.responseMimeType,
          responseSchema: payload.responseSchema,
          temperature: payload.generationConfig.temperature,
        },
      })
      return response.text ?? ''
    } catch (err) {
      const classified = classifyGeminiError(err)
      if (attempt < RETRY_DELAYS_MS.length && shouldAutoRetry(classified)) {
        await sleep(RETRY_DELAYS_MS[attempt])
        attempt++
        continue
      }
      throw classified
    }
  }
}

/**
 * Chat-specific call: wraps callGeminiRaw, validates the chat response shape
 * (referenced_segment_ids + response_text). Preserves the exact contract the
 * chat path has always relied on.
 */
export async function callGemini(
  apiKey: string,
  payload: GeminiPayload
): Promise<GeminiStructuredResponse> {
  const raw = await callGeminiRaw(apiKey, payload)
  let parsed: GeminiStructuredResponse
  try {
    parsed = JSON.parse(raw) as GeminiStructuredResponse
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Gemini returned non-JSON', true)
  }
  if (
    !Array.isArray(parsed.referenced_segment_ids) ||
    typeof parsed.response_text !== 'string'
  ) {
    throw new GeminiError(
      'INVALID_RESPONSE',
      'Gemini response missing required fields',
      true
    )
  }
  return parsed
}
```

- [ ] **Step 5: Run the new test file to confirm GREEN**

Run: `pnpm exec vitest run tests/gemini-raw.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Run full test suite to confirm chat behavior unchanged**

Run: `pnpm exec vitest run`
Expected: same pre-existing pass count as Step 1 plus the new gemini-raw tests — no regressions in chat-related tests.

- [ ] **Step 7: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/gemini.ts tests/gemini-raw.test.ts
git commit -m "refactor(gemini): split callGeminiRaw from callGemini (chat unchanged)"
```

---

## Task 6: Add `analytics-prompt-builder` (TDD)

**Files:**
- Create: `src/lib/analytics-prompt-builder.ts`
- Test: `tests/analytics-prompt-builder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/analytics-prompt-builder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildAnalyticsPrompt } from '@/lib/analytics-prompt-builder'
import type { ChatMessage } from '@/types/chat'

const sampleMessages: ChatMessage[] = [
  { role: 'user', content: '我跟伴侶冷戰三天了', timestamp: 1 },
  { role: 'assistant', content: '請觀照此刻呼吸', referencedSegmentIds: ['segment_4'], timestamp: 2 },
  { role: 'user', content: '心裡很慌', timestamp: 3 },
]

describe('analytics-prompt-builder: instruction blocks', () => {
  it('includes the observer role block', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/observer/i)
    expect(p.systemInstruction).toMatch(/不評論|不安慰|不勸誡/)
  })

  it('lists all 5 dimensions with Chinese descriptions', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/work_anxiety/)
    expect(p.systemInstruction).toMatch(/relationship_clinging/)
    expect(p.systemInstruction).toMatch(/existential_emptiness/)
    expect(p.systemInstruction).toMatch(/health_fear/)
    expect(p.systemInstruction).toMatch(/acute_emotion/)
    expect(p.systemInstruction).toMatch(/職場/)
    expect(p.systemInstruction).toMatch(/關係/)
  })

  it('includes 0-10 integer scoring rules', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/0-10/)
    expect(p.systemInstruction).toMatch(/整數/)
  })

  it('includes sutra recommendation hint pointing to segment_1..segment_9', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/segment_1.*segment_9/)
  })

  it('embeds the Output Contract with the 5 dimensions and mind_summary', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/\[Output Contract\]/)
    expect(p.systemInstruction).toMatch(/metrics/)
    expect(p.systemInstruction).toMatch(/mind_summary/)
    expect(p.systemInstruction).toMatch(/recommended_segment/)
    expect(p.systemInstruction).toMatch(/80/)
  })
})

describe('analytics-prompt-builder: responseSchema (belt for SDK that honors it)', () => {
  it('declares the 5 dimensions and mind_summary as required', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    const s = p.responseSchema as any
    expect(s.type).toBe('object')
    expect(s.required).toContain('metrics')
    expect(s.required).toContain('mind_summary')
    expect(s.properties.metrics.type).toBe('object')
    expect(s.properties.metrics.required).toEqual(
      expect.arrayContaining([
        'work_anxiety',
        'relationship_clinging',
        'existential_emptiness',
        'health_fear',
        'acute_emotion',
      ])
    )
  })
})

describe('analytics-prompt-builder: contents history', () => {
  it('maps assistant → model and preserves order', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.contents).toEqual([
      { role: 'user', parts: [{ text: '我跟伴侶冷戰三天了' }] },
      { role: 'model', parts: [{ text: '請觀照此刻呼吸' }] },
      { role: 'user', parts: [{ text: '心裡很慌' }] },
    ])
  })

  it('omits closingPractice / referencedSegmentIds from model parts (plain text only)', () => {
    const p = buildAnalyticsPrompt({
      messages: [
        {
          role: 'assistant',
          content: 'plain reply',
          referencedSegmentIds: ['segment_4'],
          closingPractice: 'breathe',
          timestamp: 1,
        },
      ],
      category: 'emotion_relation',
    })
    const modelTurn = p.contents.find((c) => c.role === 'model')!
    expect(modelTurn.parts[0].text).toBe('plain reply')
    expect(modelTurn.parts[0].text).not.toMatch(/closingPractice/)
    expect(modelTurn.parts[0].text).not.toMatch(/segment_4/)
  })
})

describe('analytics-prompt-builder: temperature + mime type', () => {
  it('uses application/json mime and a low-ish temperature for stable extraction', () => {
    const p = buildAnalyticsPrompt({ messages: sampleMessages, category: 'emotion_relation' })
    expect(p.generationConfig.responseMimeType).toBe('application/json')
    expect(p.generationConfig.temperature).toBeLessThanOrEqual(0.4)
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

Run: `pnpm exec vitest run tests/analytics-prompt-builder.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `analytics-prompt-builder.ts`**

Create `src/lib/analytics-prompt-builder.ts`:

```typescript
import type { CategoryId, ChatMessage } from '@/types/chat'
import type { GeminiContent, GeminiPayload } from '@/lib/prompt-builder'

export interface BuildAnalyticsPromptInput {
  messages: ChatMessage[]
  category: CategoryId
}

const ROLE_BLOCK = `
[Role]
你是專精心經與情緒量化分析的 observer。理性、客觀地把對話內容
抽取成 5 維情緒指標。不評論、不安慰、不勸誡。
`.trim()

const DIMENSION_BLOCK = `
[Dimension Definitions]
- work_anxiety           職場 / 工作 / 成就焦慮
- relationship_clinging  關係 / 親密 / 人際執著
- existential_emptiness  存在虛無 / 年齡 / 意義匱乏
- health_fear            身體病痛 / 死亡 / 失能恐懼
- acute_emotion          突發性情緒高峰（憤怒、悲慟、恐慌）
`.trim()

const SCORING_BLOCK = `
[Scoring Rules]
- 每維 0-10 整數
- 0 = 對話完全未觸及；3 = 隱約提及；6 = 明確困擾；9-10 = 強烈痛苦
- 評估「使用者本人」的狀態，不評估 AI 回覆
`.trim()

const SUTRA_HINT_BLOCK = `
[Sutra Hint]
從 segment_1 .. segment_9 挑 1 個最對應使用者主要痛苦的段落
`.trim()

const OUTPUT_CONTRACT_BLOCK = `
[Output Contract]
你 MUST 回傳單一 JSON 物件，符合此 schema：
{
  "metrics": {
    "work_anxiety": int (0-10),
    "relationship_clinging": int (0-10),
    "existential_emptiness": int (0-10),
    "health_fear": int (0-10),
    "acute_emotion": int (0-10)
  },
  "mind_summary": string,        // <=80 字，第三人稱客觀觀察，無安慰語
  "recommended_segment": string  // "segment_1" .. "segment_9"
}
`.trim()

function categoryBlock(category: CategoryId): string {
  return `[Session Category]\n${category}`
}

function formatHistory(messages: ChatMessage[]): GeminiContent[] {
  return messages.map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: m.content }],
  }))
}

export function buildAnalyticsPrompt(
  input: BuildAnalyticsPromptInput
): GeminiPayload {
  const systemInstruction = [
    ROLE_BLOCK,
    DIMENSION_BLOCK,
    SCORING_BLOCK,
    SUTRA_HINT_BLOCK,
    categoryBlock(input.category),
    OUTPUT_CONTRACT_BLOCK,
  ].join('\n\n')

  return {
    systemInstruction,
    contents: formatHistory(input.messages),
    responseSchema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'object',
          properties: {
            work_anxiety: { type: 'integer' },
            relationship_clinging: { type: 'integer' },
            existential_emptiness: { type: 'integer' },
            health_fear: { type: 'integer' },
            acute_emotion: { type: 'integer' },
          },
          required: [
            'work_anxiety',
            'relationship_clinging',
            'existential_emptiness',
            'health_fear',
            'acute_emotion',
          ],
        },
        mind_summary: { type: 'string' },
        recommended_segment: { type: 'string' },
      },
      required: ['metrics', 'mind_summary'],
    },
    generationConfig: {
      temperature: 0.3, // low for stable extraction
      responseMimeType: 'application/json',
    },
  }
}
```

- [ ] **Step 4: Run test to confirm GREEN**

Run: `pnpm exec vitest run tests/analytics-prompt-builder.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics-prompt-builder.ts tests/analytics-prompt-builder.test.ts
git commit -m "feat(analytics): prompt builder with [Output Contract] for Gemma"
```

---

## Task 7: Add `pipelineChatToAnalytics` orchestrator (TDD)

**Files:**
- Create: `src/lib/analytics-pipeline.ts`
- Test: `tests/analytics-pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/analytics-pipeline.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  db,
  getDailyAnalytics,
} from '@/lib/db'
import { pipelineChatToAnalytics } from '@/lib/analytics-pipeline'
import { GeminiError } from '@/lib/gemini'
import type { Session } from '@/types/chat'

vi.mock('@/lib/gemini', async () => {
  const actual = await vi.importActual<typeof import('@/lib/gemini')>('@/lib/gemini')
  return {
    ...actual,
    callGeminiRaw: vi.fn(),
  }
})

import * as gemini from '@/lib/gemini'

beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.clearAllMocks()
})

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 42,
    category: 'emotion_relation',
    startedAt: 1,
    messages: [
      { role: 'user', content: '我很焦慮', timestamp: 1 },
      { role: 'assistant', content: '深呼吸', referencedSegmentIds: ['segment_4'], timestamp: 2 },
    ],
    status: 'completed',
    ...overrides,
  }
}

const validRaw = JSON.stringify({
  metrics: {
    work_anxiety: 5,
    relationship_clinging: 2,
    existential_emptiness: 1,
    health_fear: 0,
    acute_emotion: 7,
  },
  mind_summary: '焦慮主導，情緒突發',
  recommended_segment: 'segment_4',
})

describe('pipelineChatToAnalytics — happy path', () => {
  it('writes analytics for today after Gemma returns valid JSON', async () => {
    vi.mocked(gemini.callGeminiRaw).mockResolvedValueOnce(validRaw)
    await pipelineChatToAnalytics('test-key', makeSession())
    const rows = await db.analytics.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].metrics.acute_emotion).toBe(7)
    expect(rows[0].mind_summary).toBe('焦慮主導，情緒突發')
    expect(rows[0].source_session_ids).toEqual([42])
  })
})

describe('pipelineChatToAnalytics — failure modes (must not throw)', () => {
  it('swallows AUTH_FAILED silently', async () => {
    vi.mocked(gemini.callGeminiRaw).mockRejectedValueOnce(
      new GeminiError('AUTH_FAILED', 'bad key', false)
    )
    await expect(
      pipelineChatToAnalytics('test-key', makeSession())
    ).resolves.toBeUndefined()
    expect(await db.analytics.count()).toBe(0)
  })

  it('swallows RATE_LIMIT silently', async () => {
    vi.mocked(gemini.callGeminiRaw).mockRejectedValueOnce(
      new GeminiError('RATE_LIMIT', '429', true)
    )
    await expect(
      pipelineChatToAnalytics('test-key', makeSession())
    ).resolves.toBeUndefined()
    expect(await db.analytics.count()).toBe(0)
  })

  it('swallows INVALID_RESPONSE when raw is not JSON', async () => {
    vi.mocked(gemini.callGeminiRaw).mockResolvedValueOnce('totally not json')
    await expect(
      pipelineChatToAnalytics('test-key', makeSession())
    ).resolves.toBeUndefined()
    expect(await db.analytics.count()).toBe(0)
  })

  it('swallows NETWORK errors', async () => {
    vi.mocked(gemini.callGeminiRaw).mockRejectedValueOnce(
      new GeminiError('NETWORK', 'offline', true)
    )
    await expect(
      pipelineChatToAnalytics('test-key', makeSession())
    ).resolves.toBeUndefined()
  })

  it('does nothing when session has no id', async () => {
    vi.mocked(gemini.callGeminiRaw).mockResolvedValueOnce(validRaw)
    await pipelineChatToAnalytics('test-key', makeSession({ id: undefined }))
    // Pipeline should not run a Gemini call without an id (avoids orphan rows).
    expect(gemini.callGeminiRaw).not.toHaveBeenCalled()
    expect(await db.analytics.count()).toBe(0)
  })

  it('does nothing when session has zero messages', async () => {
    vi.mocked(gemini.callGeminiRaw).mockResolvedValueOnce(validRaw)
    await pipelineChatToAnalytics('test-key', makeSession({ messages: [] }))
    expect(gemini.callGeminiRaw).not.toHaveBeenCalled()
    expect(await db.analytics.count()).toBe(0)
  })
})

describe('pipelineChatToAnalytics — same-day merge integration', () => {
  it('merges per-dim max on second call with same date', async () => {
    vi.mocked(gemini.callGeminiRaw)
      .mockResolvedValueOnce(JSON.stringify({
        metrics: { work_anxiety: 3, relationship_clinging: 8, existential_emptiness: 0, health_fear: 0, acute_emotion: 2 },
        mind_summary: 'a',
        recommended_segment: 'segment_4',
      }))
      .mockResolvedValueOnce(JSON.stringify({
        metrics: { work_anxiety: 9, relationship_clinging: 1, existential_emptiness: 5, health_fear: 4, acute_emotion: 2 },
        mind_summary: 'b',
        recommended_segment: 'segment_1',
      }))
    await pipelineChatToAnalytics('k', makeSession({ id: 1 }))
    await pipelineChatToAnalytics('k', makeSession({ id: 2 }))
    const rows = await db.analytics.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].metrics).toEqual({
      work_anxiety: 9,
      relationship_clinging: 8,
      existential_emptiness: 5,
      health_fear: 4,
      acute_emotion: 2,
    })
    expect(rows[0].mind_summary).toBe('b')
    expect(rows[0].source_session_ids).toEqual([1, 2])
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

Run: `pnpm exec vitest run tests/analytics-pipeline.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `analytics-pipeline.ts`**

Create `src/lib/analytics-pipeline.ts`:

```typescript
import type { Session } from '@/types/chat'
import { buildAnalyticsPrompt } from '@/lib/analytics-prompt-builder'
import { callGeminiRaw } from '@/lib/gemini'
import { parseAnalyticsResponse } from '@/lib/analytics-parser'
import { mergeDailyAnalytics } from '@/lib/db'
import { todayLocalISO } from '@/lib/date-utils'

/**
 * Fire-and-forget analytics extraction. NEVER throws to the caller:
 * any failure is swallowed with a console.warn so chat is unaffected.
 */
export async function pipelineChatToAnalytics(
  apiKey: string,
  session: Session
): Promise<void> {
  try {
    if (session.id == null || session.messages.length === 0) return
    const payload = buildAnalyticsPrompt({
      messages: session.messages,
      category: session.category,
    })
    const raw = await callGeminiRaw(apiKey, payload)
    const parsed = parseAnalyticsResponse(raw)
    await mergeDailyAnalytics(todayLocalISO(), {
      metrics: parsed.metrics,
      mind_summary: parsed.mind_summary,
      recommended_segment: parsed.recommended_segment,
      source_session_id: session.id,
    })
  } catch (err) {
    console.warn('[analytics] pipeline failed silently', err)
  }
}
```

- [ ] **Step 4: Run test to confirm GREEN**

Run: `pnpm exec vitest run tests/analytics-pipeline.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics-pipeline.ts tests/analytics-pipeline.test.ts
git commit -m "feat(analytics): pipeline orchestrator (silent failure, best-effort)"
```

---

## Task 8: Wire fire-and-forget trigger into `useChatSession`

**Files:**
- Modify: `src/hooks/useChatSession.ts`
- Test: full suite (no new tests; trigger is fire-and-forget and uses real `apiKey`)

- [ ] **Step 1: Modify `useChatSession.ts` — add trigger helper + 3 call sites**

Open `src/hooks/useChatSession.ts`. Add imports at the top (after existing `getSession`):

```typescript
import { pipelineChatToAnalytics } from '@/lib/analytics-pipeline'
```

Add this helper function near the bottom of the file (after `useChatSession` ends, **outside** the hook):

```typescript
function triggerAnalyticsFireAndForget(sessionId: number, apiKey: string): void {
  // Fire-and-forget. Never blocks UI. The pipeline itself swallows errors,
  // so this catch is a defense-in-depth no-op for any unexpected throw.
  getSession(sessionId)
    .then((full) => (full ? pipelineChatToAnalytics(apiKey, full) : undefined))
    .catch(() => undefined)
}
```

Now find the 3 places that call `completeSession(sessionId)` and add a trigger call immediately after each:

**Call site 1** — inside `performSend`, around line 112:

```typescript
        if (assistantCount >= 3) {
          await completeSession(sessionId)
          triggerAnalyticsFireAndForget(sessionId, apiKey)  // ← ADD
          await refresh()
          setStatus('completed')
        } else {
```

**Call site 2** — inside `retry`, around line 178:

```typescript
      if (assistants >= 3) {
        await completeSession(sessionId)
        triggerAnalyticsFireAndForget(sessionId, apiKey)    // ← ADD
        await refresh()
        setStatus('completed')
      } else {
```

**Call site 3** — inside `finishSession`, around line 192:

```typescript
  const finishSession = useCallback(async () => {
    await completeSession(sessionId)
    triggerAnalyticsFireAndForget(sessionId, apiKey)        // ← ADD
    await refresh()
    setStatus('completed')
  }, [sessionId, apiKey])                                   // ← add apiKey to deps
```

Note the third call site's dependency array gains `apiKey`.

- [ ] **Step 2: Run full suite to ensure nothing breaks**

Run: `pnpm exec vitest run`
Expected: all pass — `useChatSession` has no unit test currently; integration smoke is via build + manual.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Build to confirm production export works**

Run: `pnpm build`
Expected: green build, `/out` regenerated. If you see "Failed to compile", read the error — usually a missing import.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useChatSession.ts
git commit -m "feat(chat): fire-and-forget analytics on every completeSession path"
```

---

## Task 9: Add `recharts` dependency + `mirror-stats` helper (TDD)

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Create: `src/lib/mirror-stats.ts`
- Test: `tests/mirror-stats.test.ts`

- [ ] **Step 1: Add recharts**

Run: `pnpm add recharts`
Expected: `package.json` gains `"recharts": "^2.x"` under `dependencies`; lockfile updates.

- [ ] **Step 2: Write the failing test**

Create `tests/mirror-stats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  attachmentIndex,
  last7Days,
  last30Days,
  aggregateMetricsMax,
} from '@/lib/mirror-stats'
import type { DailyAnalytics, EmotionMetrics } from '@/types/analytics'

const m = (over: Partial<EmotionMetrics> = {}): EmotionMetrics => ({
  work_anxiety: 0,
  relationship_clinging: 0,
  existential_emptiness: 0,
  health_fear: 0,
  acute_emotion: 0,
  ...over,
})

const row = (date: string, metrics: EmotionMetrics): DailyAnalytics => ({
  date,
  metrics,
  mind_summary: '',
  recommended_segment: null,
  updated_at: 0,
  source_session_ids: [],
})

describe('attachmentIndex', () => {
  it('returns 0 for all-zero metrics', () => {
    expect(attachmentIndex(m())).toBe(0)
  })

  it('returns 10 for all-max metrics', () => {
    expect(
      attachmentIndex(
        m({
          work_anxiety: 10,
          relationship_clinging: 10,
          existential_emptiness: 10,
          health_fear: 10,
          acute_emotion: 10,
        })
      )
    ).toBe(10)
  })

  it('averages 5 dimensions correctly', () => {
    // (3+7+1+0+4)/5 = 3
    expect(attachmentIndex(m({ work_anxiety: 3, relationship_clinging: 7, acute_emotion: 4 }))).toBe(3)
  })
})

describe('last7Days / last30Days', () => {
  const rows = [
    row('2026-05-10', m()),
    row('2026-05-11', m()),
    row('2026-05-12', m()),
    row('2026-05-13', m()),
    row('2026-05-14', m()),
    row('2026-05-15', m()),
    row('2026-05-16', m()),
    row('2026-05-17', m()),
    row('2026-05-18', m()),
  ]

  it('last7Days returns the 7 most-recent rows (by trailing slice)', () => {
    const r = last7Days(rows)
    expect(r).toHaveLength(7)
    expect(r[0].date).toBe('2026-05-12')
    expect(r[6].date).toBe('2026-05-18')
  })

  it('last7Days returns all rows when fewer than 7', () => {
    const r = last7Days(rows.slice(0, 3))
    expect(r).toHaveLength(3)
  })

  it('last30Days returns up to 30 rows', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      row(`2026-04-${String(i + 1).padStart(2, '0')}`, m())
    )
    expect(last30Days(many)).toHaveLength(30)
  })

  it('last30Days returns empty for empty input', () => {
    expect(last30Days([])).toEqual([])
  })
})

describe('aggregateMetricsMax', () => {
  it('returns all-zero for empty input', () => {
    expect(aggregateMetricsMax([])).toEqual(m())
  })

  it('per-dimension max across rows', () => {
    const r = aggregateMetricsMax([
      row('a', m({ work_anxiety: 3, relationship_clinging: 8 })),
      row('b', m({ work_anxiety: 7, existential_emptiness: 5 })),
      row('c', m({ acute_emotion: 9 })),
    ])
    expect(r).toEqual({
      work_anxiety: 7,
      relationship_clinging: 8,
      existential_emptiness: 5,
      health_fear: 0,
      acute_emotion: 9,
    })
  })
})
```

- [ ] **Step 3: Run test to confirm RED**

Run: `pnpm exec vitest run tests/mirror-stats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `mirror-stats.ts`**

Create `src/lib/mirror-stats.ts`:

```typescript
import {
  EMOTION_DIMENSIONS,
  type DailyAnalytics,
  type EmotionMetrics,
} from '@/types/analytics'

export function attachmentIndex(m: EmotionMetrics): number {
  const sum =
    m.work_anxiety +
    m.relationship_clinging +
    m.existential_emptiness +
    m.health_fear +
    m.acute_emotion
  return sum / 5
}

export function last7Days(rows: DailyAnalytics[]): DailyAnalytics[] {
  return rows.slice(-7)
}

export function last30Days(rows: DailyAnalytics[]): DailyAnalytics[] {
  return rows.slice(-30)
}

export function aggregateMetricsMax(rows: DailyAnalytics[]): EmotionMetrics {
  const out: EmotionMetrics = {
    work_anxiety: 0,
    relationship_clinging: 0,
    existential_emptiness: 0,
    health_fear: 0,
    acute_emotion: 0,
  }
  for (const r of rows) {
    for (const dim of EMOTION_DIMENSIONS) {
      if (r.metrics[dim] > out[dim]) out[dim] = r.metrics[dim]
    }
  }
  return out
}
```

- [ ] **Step 5: Run test to confirm GREEN**

Run: `pnpm exec vitest run tests/mirror-stats.test.ts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/mirror-stats.ts tests/mirror-stats.test.ts
git commit -m "feat(mirror): add recharts dep + mirror-stats pure helpers"
```

---

## Task 10: Add `AttachmentIndex` component

**Files:**
- Create: `src/components/MindMirror/AttachmentIndex.tsx`

- [ ] **Step 1: Implement component**

Create `src/components/MindMirror/AttachmentIndex.tsx`:

```tsx
'use client'
import { attachmentIndex } from '@/lib/mirror-stats'
import type { DailyAnalytics } from '@/types/analytics'

interface Props {
  row: DailyAnalytics
}

export function AttachmentIndex({ row }: Props) {
  const idx = attachmentIndex(row.metrics)
  return (
    <section className="gold-frame p-6 text-center">
      <h3 className="text-sm tracking-widest text-zen-muted mb-3">
        今日執著指數
      </h3>
      <div className="font-serif">
        <span className="text-5xl text-zen-accent">{idx.toFixed(1)}</span>
        <span className="text-xl text-zen-muted ml-1">/ 10</span>
      </div>
      {row.mind_summary ? (
        <p className="mt-4 text-zen-text font-serif leading-relaxed">
          {row.mind_summary}
        </p>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MindMirror/AttachmentIndex.tsx
git commit -m "feat(mirror): AttachmentIndex card with attachment number + mind_summary"
```

---

## Task 11: Add `RadarPanel` component

**Files:**
- Create: `src/components/MindMirror/RadarPanel.tsx`

- [ ] **Step 1: Look up the actual Tailwind `zen-*` hex values**

Open `tailwind.config.ts` (or `tailwind.config.js`) and locate the `theme.extend.colors.zen` block. Note the actual hex values for `zen-accent`, `zen-muted`, and `zen-text`. You will paste those exact hex values into the chart code below.

Why this matters: Recharts renders SVG via React props that need real color strings (`stroke="#...."`). Tailwind utility classes don't work inside Recharts props. Using `var(--zen-...)` requires CSS custom properties that this project doesn't currently define. The cleanest pragmatic choice is to use the literal hex values from the Tailwind config in the chart code, with a comment naming the source so any future palette change can be propagated.

Substitute the placeholder values below:
- Replace every `#c29a4a` with the actual `zen-accent` hex
- Replace every `#8c7851` with the actual `zen-muted` hex
- Replace every `#d8c89c` with the actual `zen-text` hex

- [ ] **Step 2: Implement component**

Create `src/components/MindMirror/RadarPanel.tsx`:

```tsx
'use client'
import { useRef, useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { aggregateMetricsMax, last7Days } from '@/lib/mirror-stats'
import type { DailyAnalytics, EmotionMetrics } from '@/types/analytics'

interface Props {
  rows: DailyAnalytics[]
}

const DIMENSION_LABELS: Record<keyof EmotionMetrics, string> = {
  work_anxiety: '職場焦慮',
  relationship_clinging: '關係執著',
  existential_emptiness: '存在虛無',
  health_fear: '健康恐懼',
  acute_emotion: '突發情緒',
}

type Mode = 'today' | 'week'

export function RadarPanel({ rows }: Props) {
  const [mode, setMode] = useState<Mode>('today')
  const firstMountRef = useRef(true)
  const reduce = useReducedMotion()

  if (firstMountRef.current) {
    // flips after first commit; checked synchronously on subsequent renders
    queueMicrotask(() => {
      firstMountRef.current = false
    })
  }

  const today = rows[rows.length - 1]
  const metrics: EmotionMetrics =
    mode === 'today' ? today.metrics : aggregateMetricsMax(last7Days(rows))

  const chartData = (Object.keys(DIMENSION_LABELS) as (keyof EmotionMetrics)[]).map(
    (dim) => ({
      dimension: DIMENSION_LABELS[dim],
      value: metrics[dim],
    })
  )

  return (
    <section className="gold-frame p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm tracking-widest text-zen-muted">五維執著分布</h3>
        <div className="text-xs flex gap-3">
          <button
            type="button"
            onClick={() => setMode('today')}
            className={
              mode === 'today'
                ? 'text-zen-accent'
                : 'text-zen-muted hover:text-zen-accent'
            }
          >
            今日
          </button>
          <button
            type="button"
            onClick={() => setMode('week')}
            className={
              mode === 'week'
                ? 'text-zen-accent'
                : 'text-zen-muted hover:text-zen-accent'
            }
          >
            7日
          </button>
        </div>
      </div>
      {/* Color hex values mirror tailwind.config.ts theme.extend.colors.zen.
          Update both places when the palette changes. */}
      <div className="w-full" style={{ height: 280 }}>
        <ResponsiveContainer>
          <RadarChart data={chartData} outerRadius="75%">
            <PolarGrid stroke="#8c7851" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#d8c89c', fontSize: 12 }}
            />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#c29a4a"
              fill="#c29a4a"
              fillOpacity={0.3}
              isAnimationActive={!reduce && firstMountRef.current}
              animationDuration={reduce ? 0 : 800}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (If Recharts complains about missing types, that's a project-wide type issue, not Recharts; investigate the specific error.)

- [ ] **Step 4: Commit**

```bash
git add src/components/MindMirror/RadarPanel.tsx
git commit -m "feat(mirror): RadarPanel with today/7-day toggle + reduced-motion"
```

---

## Task 12: Add `TrendPanel` component

**Files:**
- Create: `src/components/MindMirror/TrendPanel.tsx`

- [ ] **Step 1: Implement component (reuse Task 11 Step 1 palette lookup)**

You already noted the actual `zen-accent` / `zen-muted` / `zen-text` hex values during Task 11 Step 1. Reuse them here — replace the placeholder hex values in the file below the same way.

Create `src/components/MindMirror/TrendPanel.tsx`:

```tsx
'use client'
import { useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { attachmentIndex, last30Days } from '@/lib/mirror-stats'
import type { DailyAnalytics } from '@/types/analytics'

interface Props {
  rows: DailyAnalytics[]
}

function formatDateLabel(iso: string): string {
  // 'YYYY-MM-DD' → 'MM/DD'
  const [, mm, dd] = iso.split('-')
  return `${mm}/${dd}`
}

function ZenTooltip({ active, payload }: { active?: boolean; payload?: { payload?: { date?: string; value?: number } }[] }) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]?.payload
  if (!p) return null
  // Tailwind classes work here because this is a regular JSX element,
  // not a Recharts SVG prop.
  return (
    <div className="bg-zen-surface border border-zen-accent/60 px-3 py-2 font-serif text-sm text-zen-text">
      <div className="text-zen-muted text-xs">{p.date}</div>
      <div>執著指數 {p.value?.toFixed(1)}</div>
    </div>
  )
}

export function TrendPanel({ rows }: Props) {
  const firstMountRef = useRef(true)
  const reduce = useReducedMotion()

  if (firstMountRef.current) {
    queueMicrotask(() => {
      firstMountRef.current = false
    })
  }

  if (rows.length < 3) {
    return (
      <section className="gold-frame p-6 text-center">
        <h3 className="text-sm tracking-widest text-zen-muted mb-3">空性趨勢</h3>
        <p className="font-serif text-zen-muted">累積至 3 日方可觀照趨勢</p>
      </section>
    )
  }

  const data = last30Days(rows).map((r) => ({
    date: r.date,
    label: formatDateLabel(r.date),
    value: attachmentIndex(r.metrics),
  }))

  return (
    <section className="gold-frame p-6">
      <h3 className="text-sm tracking-widest text-zen-muted mb-4">空性趨勢</h3>
      {/* Hex values mirror tailwind.config.ts theme.extend.colors.zen.
          Keep in sync with RadarPanel and the Tailwind palette. */}
      <div className="w-full" style={{ height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
            <CartesianGrid stroke="#8c7851" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#d8c89c', fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fill: '#d8c89c', fontSize: 11 }}
            />
            <Tooltip content={<ZenTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#c29a4a"
              strokeWidth={2}
              dot={{ r: 3, fill: '#c29a4a' }}
              isAnimationActive={!reduce && firstMountRef.current}
              animationDuration={reduce ? 0 : 800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-zen-muted font-serif text-center">
        執著漸消，度一切苦厄
      </p>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MindMirror/TrendPanel.tsx
git commit -m "feat(mirror): TrendPanel line chart + <3-row placeholder"
```

---

## Task 13: Add `EmptyMirror` component

**Files:**
- Create: `src/components/MindMirror/EmptyMirror.tsx`

- [ ] **Step 1: Implement component**

Create `src/components/MindMirror/EmptyMirror.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { LotusGlyph } from '@/components/Lotus'

export function EmptyMirror() {
  return (
    <section className="gold-frame p-10 text-center flex flex-col items-center gap-6">
      <LotusGlyph className="w-16 h-16 text-zen-accent" />
      <p className="font-serif text-lg text-zen-text leading-relaxed max-w-sm">
        心鏡未起。<br />
        請先安住於對話，讓執著浮現。
      </p>
      <Link
        href="/categories"
        className="font-serif text-sm text-zen-accent hover:text-zen-text border border-zen-accent/60 px-5 py-2"
      >
        前往揀擇煩惱
      </Link>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (If `LotusGlyph` import path fails, check `src/components/Lotus.tsx` — `LotusGlyph` is the named export per CLAUDE.md.)

- [ ] **Step 3: Commit**

```bash
git add src/components/MindMirror/EmptyMirror.tsx
git commit -m "feat(mirror): EmptyMirror cold-start CTA"
```

---

## Task 14: Add `/mirror` page + AppHeader navigation

**Files:**
- Create: `src/app/mirror/page.tsx`
- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Read current AppHeader to preserve structure**

Open `src/components/AppHeader.tsx` (read first to see current markup; you'll only need to add a nav element to its existing layout — do NOT replace unrelated structure).

- [ ] **Step 2: Update AppHeader with nav**

Modify `src/components/AppHeader.tsx`. Locate the existing header element and add a `<nav>` after the existing `<h1>` (inside the same container). The header should end up looking like:

```tsx
'use client'
import Link from 'next/link'
// keep all existing imports

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zen-accent/30">
      <h1 className="font-serif text-zen-text tracking-widest">
        心經數位道場
      </h1>
      <nav className="flex gap-5 text-sm text-zen-muted font-serif">
        <Link href="/mirror" className="hover:text-zen-accent">心鏡</Link>
        <Link href="/history" className="hover:text-zen-accent">歷史</Link>
      </nav>
    </header>
  )
}
```

**Important:** if the current `AppHeader` has additional children (lotus glyph alignment, accessibility attributes, custom class names), preserve them. Only the `<nav>` addition is required. Adjust the wrapper element to use `flex items-center justify-between` only if it doesn't already.

- [ ] **Step 3: Create `/mirror` page**

Create `src/app/mirror/page.tsx`:

```tsx
'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAnalytics } from '@/lib/db'
import { AttachmentIndex } from '@/components/MindMirror/AttachmentIndex'
import { RadarPanel } from '@/components/MindMirror/RadarPanel'
import { TrendPanel } from '@/components/MindMirror/TrendPanel'
import { EmptyMirror } from '@/components/MindMirror/EmptyMirror'
import { BreathingLoader } from '@/components/BreathingLoader'

export default function MirrorPage() {
  const rows = useLiveQuery(() => listAnalytics(), [])

  if (rows === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <BreathingLoader />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <header className="text-center mb-8">
          <h2 className="font-serif text-2xl text-zen-text tracking-widest">心鏡</h2>
          <p className="mt-2 text-zen-muted font-serif text-sm">
            映照本週執著之分布
          </p>
        </header>
        <EmptyMirror />
      </div>
    )
  }

  const today = rows[rows.length - 1]
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <header className="text-center">
        <h2 className="font-serif text-2xl text-zen-text tracking-widest">心鏡</h2>
        <p className="mt-2 text-zen-muted font-serif text-sm">
          映照本週執著之分布
        </p>
      </header>
      <AttachmentIndex row={today} />
      <RadarPanel rows={rows} />
      <TrendPanel rows={rows} />
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. If `BreathingLoader` import path differs from `@/components/BreathingLoader`, adjust to whatever the actual export path is (check `src/components/BreathingLoader.tsx` — it may be a named or default export).

- [ ] **Step 5: Production build**

Run: `pnpm build`
Expected: green build; `out/mirror/index.html` (or `out/mirror.html`) generated as a static page.

- [ ] **Step 6: Manual browser verification (dev server)**

Run: `pnpm dev:fresh` (or `pnpm dev` if no prior build).
In a browser, log in / set API key once, then:

1. Open `/mirror` with **0 analytics rows in IndexedDB** (use DevTools → Application → IndexedDB → delete `SutraMindDB` first). Expected: `EmptyMirror` with lotus + 「心鏡未起」+ CTA linking to `/categories`. AppHeader shows 「心鏡」+「歷史」nav.
2. Complete **one** 3-round chat session. Open `/mirror`. Expected: `AttachmentIndex` populated; `RadarPanel` shows that day's metrics; toggle between 今日 / 7日 works; `TrendPanel` shows placeholder「累積至 3 日方可觀照趨勢」.
3. Use DevTools → Application → IndexedDB → `SutraMindDB` → `analytics` to **manually add 2 more rows for 2 prior dates** (open the row, copy & paste it, change `date`). Reload `/mirror`. Expected: `TrendPanel` renders a 3-point line chart; tooltip on hover shows date + index.
4. Toggle OS-level reduced-motion (e.g., on macOS: System Settings → Accessibility → Display → Reduce motion). Reload `/mirror`. Expected: Recharts animation does not run.
5. In DevTools, throttle network to "Offline", complete a session. Expected: chat finalizes; **no error UI appears for analytics**; `/mirror` row count is unchanged.

If any step fails, fix before proceeding.

- [ ] **Step 7: Commit**

```bash
git add src/app/mirror/page.tsx src/components/AppHeader.tsx
git commit -m "feat(mirror): /mirror page + AppHeader nav (心鏡 / 歷史)"
```

---

## Task 15: Documentation update + final verification

**Files:**
- Modify: `CLAUDE.md`
- Modify: `TODO.md`

- [ ] **Step 1: Update `CLAUDE.md`**

Open `CLAUDE.md` and make 3 edits:

**Edit A — Tech stack section** (find the line with `gemini-2.5-flash` and replace):

```diff
- - `@google/genai` SDK (Gemini 2.5 Flash, structured JSON output)
+ - `@google/genai` SDK (Gemma 4 `gemma-4-31b-it`, structured JSON via prompt-embedded `[Output Contract]` + SDK `responseSchema` belt-and-suspenders)
```

**Edit B — Module map** — add new entries under `lib/` and `components/`:

In the `lib/` block, after the existing entries, append:

```
    analytics-prompt-builder.ts  # pure builder for the 5-dim extraction prompt
    analytics-parser.ts          # tolerant JSON parser (markdown fence, brace balance, clamp)
    analytics-pipeline.ts        # fire-and-forget pipelineChatToAnalytics
    mirror-stats.ts              # attachmentIndex, last7/30Days, aggregateMetricsMax
    date-utils.ts                # todayLocalISO
```

In the `components/` block, after `BreathingLoader, InkDropText, SandArtExit`, append:

```
                        # MindMirror/ : AttachmentIndex, RadarPanel,
                        #               TrendPanel, EmptyMirror
```

Add a new `app/` entry between `history` and `layout.tsx`:

```
    mirror/             # /mirror — Recharts radar + trend, AppHeader nav entry
```

**Edit C — "Recently shipped" section** — at the top of the `## Recently shipped` list, prepend:

```
- ✅ Phase 3-A/B: analytics pipeline (Gemma extracts 5-dim metrics per session) + /mirror page (Recharts radar + trend); Dexie v2 (`analytics` + `profile` tables); AppHeader 心鏡/歷史 nav (2026-05-16)
```

- [ ] **Step 2: Update `TODO.md`**

Open `TODO.md`. Mark Phase 3-A / 3-B as shipped (move them out of the backlog list into a "shipped" section, or strike them through, consistent with the file's existing convention). Add Phase 3-C (Daily Insight ritual) as the next item.

- [ ] **Step 3: Run full test suite as final verification**

Run: `pnpm exec vitest run`
Expected: ALL tests pass (existing + 6 new test files: date-utils, analytics-parser, analytics-prompt-builder, analytics-merge, analytics-pipeline, mirror-stats).

- [ ] **Step 4: Coverage check**

Run: `pnpm exec vitest run --coverage`
Expected: new modules (`analytics-*`, `mirror-stats`, `date-utils`, new `db.ts` helpers) at ≥ 80% line coverage.

- [ ] **Step 5: Final type-check + build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: both green.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md TODO.md
git commit -m "docs: update CLAUDE.md + TODO.md for Phase 3-A/B shipped"
```

---

## Summary

15 tasks, all TDD where applicable (parser, prompt-builder, pipeline, db helpers, mirror-stats, date-utils have unit tests written before implementation). Components and the page are validated by manual browser verification (Task 14 Step 6). Each task ends in one commit, producing a clean linear history of 15 commits.

**Acceptance criteria (recap from spec §9):**
- `/mirror` with 0 rows shows EmptyMirror with CTA
- After 1 session: AttachmentIndex + RadarPanel render; TrendPanel placeholder
- After 3 distinct dates: all three panels render; trend line shows 3 points
- AppHeader nav 心鏡/歷史 both reachable
- Same-day second session merges with per-dim max + latest mind_summary
- prefers-reduced-motion disables Recharts animations
- Network offline → chat completes, analytics drops silently, no error UI
- All 6 new test files green; coverage ≥ 80% on new modules
- `pnpm build` green; `out/mirror/` exists

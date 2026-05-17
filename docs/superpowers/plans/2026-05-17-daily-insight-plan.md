# Phase 3-C — Daily Insight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a once-per-local-day 「今日靜觀 (Daily Insight)」 card at the top of `/mirror` that, on user tap, calls Gemma with the last 7 days of analytics + a client-picked sutra segment and persists the resulting 30–60 zh-char reflection in a new `dailyInsight` Dexie table.

**Architecture:** Mirror the existing Phase 3-A/B analytics pipeline shape — four small pure modules (segment-picker / prompt-builder / parser / pipeline) + Dexie v3 + a `useDailyInsight` hook + a `DailyInsightCard` component. Two new shared libs (`analytics-labels.ts`, `mirror-colors.ts`) absorb the deferred Phase 3-A/B polish items that this work needs anyway. The pipeline becomes the **second** (and only other) non-chat Gemini call site alongside `pipelineChatToAnalytics`.

**Tech Stack:** TypeScript 5, React 18, Next.js 14 (App Router, static export), Dexie 4 + dexie-react-hooks, `@google/genai` SDK (`gemma-4-31b-it`), Vitest + fake-indexeddb, Tailwind 3, Recharts (untouched here — only its color constants get extracted).

**Spec:** `docs/superpowers/specs/2026-05-17-daily-insight-design.md`

---

## File map

**Create (8 source files + 4 test files):**

| File | Responsibility |
|---|---|
| `src/lib/analytics-labels.ts` | Chinese label map for the 5 emotion dimensions. Extracted from `RadarPanel.tsx`; used by RadarPanel + insight prompt builder. |
| `src/lib/mirror-colors.ts` | Recharts hex constants (`ZEN_ACCENT`, `ZEN_MUTED`, `ZEN_TEXT`). Extracted from RadarPanel + TrendPanel. |
| `src/lib/insight-segment-picker.ts` | Pure: aggregates 7-day means, argmax-picks a dominant dimension, maps to a sutra segment id. |
| `src/lib/insight-prompt-builder.ts` | Pure: builds the Gemini payload for the daily insight reflection. |
| `src/lib/insight-parser.ts` | Tolerant JSON parser for `{"reflection": string}` (mirrors `analytics-parser.ts`). |
| `src/lib/insight-pipeline.ts` | Orchestrator: same-day guard → picker → prompt → callGeminiRaw → parser → persist. |
| `src/hooks/useDailyInsight.ts` | UI hook: state machine (`empty | ready | requesting | shown`), liveQuery, request action, isFirstReveal. |
| `src/components/MindMirror/DailyInsightCard.tsx` | Gold-frame card with all four UI states. |
| `tests/insight-segment-picker.test.ts` | Picker behaviour. |
| `tests/insight-prompt-builder.test.ts` | Prompt structure + schema. |
| `tests/insight-parser.test.ts` | Parser tolerance + validation. |
| `tests/insight-pipeline.test.ts` | Pipeline orchestration with mocked Gemini. |

**Modify:**

| File | Change |
|---|---|
| `src/types/analytics.ts` | Add `DailyInsightRecord` interface. |
| `src/lib/db.ts` | Dexie v3 (add `dailyInsight` table), add helpers, add `getRecentAnalytics`. |
| `src/components/MindMirror/RadarPanel.tsx` | Import labels + colors from new shared libs. |
| `src/components/MindMirror/TrendPanel.tsx` | Import colors from new shared lib. |
| `src/app/mirror/page.tsx` | Mount `<DailyInsightCard rows={rows} />` above `<AttachmentIndex />`. |
| `tests/db.test.ts` | Add `dailyInsight` round-trip + `getRecentAnalytics` cases. |
| `CLAUDE.md` | Recently-shipped line + the "exactly two non-chat Gemini call sites" invariant. |
| `TODO.md` | Mark Phase 3-C shipped + retire 2 polish items. |

---

## Task 1: Extract `DIMENSION_LABELS` to shared module

**Files:**
- Create: `src/lib/analytics-labels.ts`
- Modify: `src/components/MindMirror/RadarPanel.tsx`
- Modify: `tests/db.test.ts` — N/A (no tests; RadarPanel has none and the constant is data)

This task is preparation. The insight prompt builder needs the same Chinese labels, and TODO.md flagged this duplication. Pure-data extraction; no behaviour change.

- [ ] **Step 1: Create `src/lib/analytics-labels.ts`**

```ts
import type { EmotionMetrics } from '@/types/analytics'

export const DIMENSION_LABELS: Record<keyof EmotionMetrics, string> = {
  work_anxiety: '職場焦慮',
  relationship_clinging: '關係執著',
  existential_emptiness: '存在虛無',
  health_fear: '健康恐懼',
  acute_emotion: '突發情緒',
}
```

- [ ] **Step 2: Update `src/components/MindMirror/RadarPanel.tsx`**

Remove the inline `DIMENSION_LABELS` const (lines 23–29 in the current file) and replace with an import at the top of the file:

```ts
import { DIMENSION_LABELS } from '@/lib/analytics-labels'
```

The rest of the file is unchanged — it already uses `DIMENSION_LABELS` by name.

- [ ] **Step 3: Run typecheck + tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: PASS (no test changes; this is a pure refactor)

- [ ] **Step 4: Commit**

```bash
git add src/lib/analytics-labels.ts src/components/MindMirror/RadarPanel.tsx
git commit -m "refactor(mirror): extract DIMENSION_LABELS to analytics-labels"
```

---

## Task 2: Extract Recharts hex constants to shared module

**Files:**
- Create: `src/lib/mirror-colors.ts`
- Modify: `src/components/MindMirror/RadarPanel.tsx`
- Modify: `src/components/MindMirror/TrendPanel.tsx`

The hex values `#C9A961` / `#8A8079` / `#EAE0D5` are duplicated in both Recharts files with "keep in sync" comments. Centralizing them eliminates the maintenance hazard and gives the Daily Insight card's gold hairline (Task 11) one place to read from.

- [ ] **Step 1: Create `src/lib/mirror-colors.ts`**

```ts
// Mirror of tailwind.config.ts theme.extend.colors.zen.
// Recharts SVG props need real color strings — Tailwind classes won't apply.
// Update both this file and tailwind.config.ts when the palette changes.
export const ZEN_ACCENT = '#C9A961'
export const ZEN_MUTED = '#8A8079'
export const ZEN_TEXT = '#EAE0D5'
```

- [ ] **Step 2: Update `RadarPanel.tsx`**

Add import (after the `analytics-labels` import from Task 1):

```ts
import { ZEN_ACCENT, ZEN_MUTED, ZEN_TEXT } from '@/lib/mirror-colors'
```

Replace the 5 hex literals in the JSX:
- `stroke="#8A8079"` → `stroke={ZEN_MUTED}`
- `tick={{ fill: '#EAE0D5', fontSize: 12 }}` → `tick={{ fill: ZEN_TEXT, fontSize: 12 }}`
- `stroke="#C9A961"` → `stroke={ZEN_ACCENT}`
- `fill="#C9A961"` → `fill={ZEN_ACCENT}`

Remove the file-top comment block (lines 2–5) about hex sync — that contract now lives in `mirror-colors.ts`.

- [ ] **Step 3: Update `TrendPanel.tsx`**

Add import:

```ts
import { ZEN_ACCENT, ZEN_MUTED, ZEN_TEXT } from '@/lib/mirror-colors'
```

Replace hex literals:
- `stroke="#8A8079"` → `stroke={ZEN_MUTED}`
- `tick={{ fill: '#EAE0D5', fontSize: 11 }}` (×2) → `tick={{ fill: ZEN_TEXT, fontSize: 11 }}`
- `stroke="#C9A961"` → `stroke={ZEN_ACCENT}`
- `dot={{ r: 3, fill: '#C9A961' }}` → `dot={{ r: 3, fill: ZEN_ACCENT }}`

Remove the inline comment about syncing with RadarPanel.

- [ ] **Step 4: Typecheck + tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mirror-colors.ts src/components/MindMirror/RadarPanel.tsx src/components/MindMirror/TrendPanel.tsx
git commit -m "refactor(mirror): extract Recharts hex constants to mirror-colors"
```

---

## Task 3: Add `DailyInsightRecord` type

**Files:**
- Modify: `src/types/analytics.ts`

Pure type addition; no other file changes needed yet.

- [ ] **Step 1: Append to `src/types/analytics.ts`**

Add after `ProfileRecord` interface (currently the last export in the file):

```ts
export interface DailyInsightRecord {
  date: string                    // PK, YYYY-MM-DD local
  segmentId: string               // 'segment_1' .. 'segment_9'
  dominantDim: EmotionDimension
  reflection: string              // Gemma output, post-parse, trimmed
  metricsSnapshot: EmotionMetrics // what was shown to Gemma (means over 7d)
  createdAt: number               // Date.now()
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — type is exported but unused yet, which is fine.

- [ ] **Step 3: Commit**

```bash
git add src/types/analytics.ts
git commit -m "feat(types): add DailyInsightRecord interface"
```

---

## Task 4: Bump Dexie v3 + `dailyInsight` CRUD with tests

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `tests/db.test.ts`

TDD this one — Dexie schema bumps are the kind of thing that silently fails in production if mistyped. Tests first.

- [ ] **Step 1: Write failing tests in `tests/db.test.ts`**

Add at the top of the file alongside the existing imports:

```ts
import {
  getDailyInsight,
  saveDailyInsight,
} from '@/lib/db'
import type { DailyInsightRecord } from '@/types/analytics'
```

Append a new `describe` block at the end of the file:

```ts
describe('dailyInsight CRUD', () => {
  const sample: DailyInsightRecord = {
    date: '2026-05-17',
    segmentId: 'segment_3',
    dominantDim: 'health_fear',
    reflection: '你近日畏懼身體之變，試觀此身亦非實有。',
    metricsSnapshot: {
      work_anxiety: 1,
      relationship_clinging: 2,
      existential_emptiness: 1,
      health_fear: 7,
      acute_emotion: 3,
    },
    createdAt: 1_700_000_000_000,
  }

  it('returns undefined when no insight exists for the date', async () => {
    expect(await getDailyInsight('2026-05-17')).toBeUndefined()
  })

  it('saves and reads a daily insight row', async () => {
    await saveDailyInsight(sample)
    const got = await getDailyInsight('2026-05-17')
    expect(got).toEqual(sample)
  })

  it('put-semantics: same date overwrites', async () => {
    await saveDailyInsight(sample)
    await saveDailyInsight({ ...sample, reflection: '改寫的反思內容' })
    const got = await getDailyInsight('2026-05-17')
    expect(got?.reflection).toBe('改寫的反思內容')
  })

  it('different dates do not collide', async () => {
    await saveDailyInsight(sample)
    await saveDailyInsight({ ...sample, date: '2026-05-18' })
    expect((await getDailyInsight('2026-05-17'))?.date).toBe('2026-05-17')
    expect((await getDailyInsight('2026-05-18'))?.date).toBe('2026-05-18')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm test -- tests/db.test.ts`
Expected: FAIL with import errors (`getDailyInsight`, `saveDailyInsight` not exported) and/or type error (`DailyInsightRecord` not used by db.ts yet).

- [ ] **Step 3: Update `src/lib/db.ts`**

Three changes:

**3a. Add the type import + table field.** In the imports block:

```ts
import type {
  DailyAnalytics,
  DailyInsightRecord,
  EmotionMetrics,
  ProfileRecord,
} from '@/types/analytics'
```

In the `SutraMindDB` class body, add the field declaration next to the other tables:

```ts
dailyInsight!: EntityTable<DailyInsightRecord, 'date'>
```

**3b. Add the v3 schema block.** Inside the constructor, after the existing `this.version(2)` block:

```ts
this.version(3).stores({
  apiKey: '++id',
  sessions: '++id, category, startedAt',
  analytics: 'date',
  profile: 'key',
  dailyInsight: 'date',
})
```

**3c. Add the helpers.** Append at the bottom of the file (after the `setProfile` export):

```ts
// ── dailyInsight CRUD ───────────────────────────────────────
export async function getDailyInsight(
  date: string
): Promise<DailyInsightRecord | undefined> {
  return db.dailyInsight.get(date)
}

export async function saveDailyInsight(
  row: DailyInsightRecord
): Promise<void> {
  await db.dailyInsight.put(row)
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test -- tests/db.test.ts`
Expected: PASS (all four new cases + existing cases).

- [ ] **Step 5: Run full suite + typecheck**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts tests/db.test.ts
git commit -m "feat(db): Dexie v3 with dailyInsight table + CRUD"
```

---

## Task 5: Add `getRecentAnalytics(daysBack)` helper

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `tests/db.test.ts`

The picker (Task 6) and the hook (Task 10) both need "rows whose `date` is within N local days of today". Encapsulate this once.

- [ ] **Step 1: Write failing tests in `tests/db.test.ts`**

Add import:

```ts
import { getRecentAnalytics, mergeDailyAnalytics } from '@/lib/db'
import { todayLocalISO } from '@/lib/date-utils'
```

Append a new `describe`:

```ts
describe('getRecentAnalytics', () => {
  const baseMetrics = {
    work_anxiety: 5,
    relationship_clinging: 5,
    existential_emptiness: 5,
    health_fear: 5,
    acute_emotion: 5,
  }

  async function seed(date: string) {
    await mergeDailyAnalytics(date, {
      metrics: baseMetrics,
      mind_summary: `summary ${date}`,
      recommended_segment: null,
      source_session_id: 1,
    })
  }

  function isoDaysAgo(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toLocaleDateString('sv-SE')
  }

  it('returns [] when no analytics exist', async () => {
    expect(await getRecentAnalytics(7)).toEqual([])
  })

  it('includes only rows within the window (inclusive of today)', async () => {
    await seed(isoDaysAgo(0)) // today
    await seed(isoDaysAgo(6)) // 6 days ago — in window
    await seed(isoDaysAgo(7)) // 7 days ago — boundary, in window
    await seed(isoDaysAgo(8)) // 8 days ago — out
    const got = await getRecentAnalytics(7)
    const dates = got.map((r) => r.date).sort()
    expect(dates).toEqual([isoDaysAgo(7), isoDaysAgo(6), isoDaysAgo(0)].sort())
  })

  it('returns chronologically ascending', async () => {
    await seed(isoDaysAgo(2))
    await seed(isoDaysAgo(0))
    await seed(isoDaysAgo(5))
    const got = await getRecentAnalytics(7)
    expect(got.map((r) => r.date)).toEqual(
      [isoDaysAgo(5), isoDaysAgo(2), isoDaysAgo(0)]
    )
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test -- tests/db.test.ts`
Expected: FAIL with `getRecentAnalytics` not exported.

- [ ] **Step 3: Implement in `src/lib/db.ts`**

Append in the analytics-CRUD section (after `mergeDailyAnalytics`):

```ts
import { todayLocalISO } from '@/lib/date-utils'

export async function getRecentAnalytics(
  daysBack: number
): Promise<DailyAnalytics[]> {
  const today = todayLocalISO()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  const cutoffIso = cutoff.toLocaleDateString('sv-SE')
  // Inclusive on both ends: row.date in [cutoffIso, today]
  return db.analytics
    .where('date')
    .between(cutoffIso, today, true, true)
    .toArray()
}
```

The `import { todayLocalISO }` goes at the top of the file with the other imports — keep imports tidy.

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test -- tests/db.test.ts`
Expected: PASS for all `getRecentAnalytics` cases.

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts tests/db.test.ts
git commit -m "feat(db): add getRecentAnalytics helper"
```

---

## Task 6: Implement segment picker with tests

**Files:**
- Create: `src/lib/insight-segment-picker.ts`
- Create: `tests/insight-segment-picker.test.ts`

Pure function, no I/O. TDD strictly.

- [ ] **Step 1: Write failing tests in `tests/insight-segment-picker.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { pickInsightSegment } from '@/lib/insight-segment-picker'
import type { DailyAnalytics } from '@/types/analytics'

function row(date: string, m: Partial<DailyAnalytics['metrics']> = {}): DailyAnalytics {
  return {
    date,
    metrics: {
      work_anxiety: 0,
      relationship_clinging: 0,
      existential_emptiness: 0,
      health_fear: 0,
      acute_emotion: 0,
      ...m,
    },
    mind_summary: '',
    recommended_segment: null,
    updated_at: 0,
    source_session_ids: [],
  }
}

describe('pickInsightSegment', () => {
  it('returns null on empty rows', () => {
    expect(pickInsightSegment([])).toBeNull()
  })

  it('single row: mean equals that row, picks segment_3 when health_fear dominates', () => {
    const got = pickInsightSegment([row('2026-05-17', { health_fear: 8, work_anxiety: 3 })])
    expect(got).not.toBeNull()
    expect(got!.dominantDim).toBe('health_fear')
    expect(got!.segmentId).toBe('segment_3')
    expect(got!.metrics7d.health_fear).toBe(8)
    expect(got!.metrics7d.work_anxiety).toBe(3)
  })

  it('multi-row: aggregates by mean', () => {
    const rows = [
      row('2026-05-15', { work_anxiety: 9 }),
      row('2026-05-16', { work_anxiety: 3 }),
      row('2026-05-17', { work_anxiety: 6 }),
    ]
    const got = pickInsightSegment(rows)
    expect(got!.metrics7d.work_anxiety).toBe(6) // (9+3+6)/3
    expect(got!.dominantDim).toBe('work_anxiety')
    expect(got!.segmentId).toBe('segment_5')
  })

  it('maps each dominant dim to the correct segment', () => {
    const cases: Array<[keyof DailyAnalytics['metrics'], string]> = [
      ['work_anxiety', 'segment_5'],
      ['relationship_clinging', 'segment_1'],
      ['existential_emptiness', 'segment_7'],
      ['health_fear', 'segment_3'],
      ['acute_emotion', 'segment_2'],
    ]
    for (const [dim, seg] of cases) {
      const got = pickInsightSegment([row('2026-05-17', { [dim]: 9 })])
      expect(got!.dominantDim).toBe(dim)
      expect(got!.segmentId).toBe(seg)
    }
  })

  it('all-zero rows: priority order wins (health_fear → segment_3)', () => {
    const got = pickInsightSegment([row('2026-05-17')])
    expect(got!.dominantDim).toBe('health_fear')
    expect(got!.segmentId).toBe('segment_3')
  })

  it('two-way tie: priority order wins', () => {
    // health_fear and acute_emotion both 5; priority puts health_fear first
    const got = pickInsightSegment([
      row('2026-05-17', { health_fear: 5, acute_emotion: 5 }),
    ])
    expect(got!.dominantDim).toBe('health_fear')
  })

  it('tie between acute_emotion and relationship_clinging: acute_emotion wins', () => {
    const got = pickInsightSegment([
      row('2026-05-17', { acute_emotion: 4, relationship_clinging: 4 }),
    ])
    expect(got!.dominantDim).toBe('acute_emotion')
  })

  it('rounds means to one decimal in metrics7d for stable prompts', () => {
    const rows = [
      row('2026-05-15', { work_anxiety: 1 }),
      row('2026-05-16', { work_anxiety: 2 }),
      row('2026-05-17', { work_anxiety: 2 }),
    ]
    // (1+2+2)/3 = 1.6666... → 1.7
    expect(pickInsightSegment(rows)!.metrics7d.work_anxiety).toBe(1.7)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test -- tests/insight-segment-picker.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/lib/insight-segment-picker.ts`**

```ts
import { EMOTION_DIMENSIONS } from '@/types/analytics'
import type {
  DailyAnalytics,
  EmotionDimension,
  EmotionMetrics,
} from '@/types/analytics'

export interface InsightSegmentPick {
  dominantDim: EmotionDimension
  segmentId: string
  metrics7d: EmotionMetrics
}

const DIM_PRIORITY: readonly EmotionDimension[] = [
  'health_fear',
  'acute_emotion',
  'relationship_clinging',
  'work_anxiety',
  'existential_emptiness',
] as const

const DOMINANT_DIM_TO_SEGMENT: Record<EmotionDimension, string> = {
  work_anxiety: 'segment_5',
  relationship_clinging: 'segment_1',
  existential_emptiness: 'segment_7',
  health_fear: 'segment_3',
  acute_emotion: 'segment_2',
}

function roundTo1dp(n: number): number {
  return Math.round(n * 10) / 10
}

export function pickInsightSegment(
  rows: DailyAnalytics[]
): InsightSegmentPick | null {
  if (rows.length === 0) return null

  const metrics7d = {} as EmotionMetrics
  for (const dim of EMOTION_DIMENSIONS) {
    const sum = rows.reduce((acc, r) => acc + r.metrics[dim], 0)
    metrics7d[dim] = roundTo1dp(sum / rows.length)
  }

  let bestDim = DIM_PRIORITY[0]
  let bestVal = metrics7d[bestDim]
  for (const dim of DIM_PRIORITY.slice(1)) {
    if (metrics7d[dim] > bestVal) {
      bestVal = metrics7d[dim]
      bestDim = dim
    }
  }

  return {
    dominantDim: bestDim,
    segmentId: DOMINANT_DIM_TO_SEGMENT[bestDim],
    metrics7d,
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test -- tests/insight-segment-picker.test.ts`
Expected: PASS

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/insight-segment-picker.ts tests/insight-segment-picker.test.ts
git commit -m "feat(insight): segment picker (7d mean argmax → sutra segment)"
```

---

## Task 7: Implement prompt builder with tests

**Files:**
- Create: `src/lib/insight-prompt-builder.ts`
- Create: `tests/insight-prompt-builder.test.ts`

Pure function. The Chinese system instruction's wording is canonical per spec §5 — tests should snapshot it.

- [ ] **Step 1: Write failing tests in `tests/insight-prompt-builder.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildInsightPrompt } from '@/lib/insight-prompt-builder'
import type { EmotionMetrics, EmotionDimension } from '@/types/analytics'
import type { SutraSegment } from '@/types/chat'

const sampleMetrics: EmotionMetrics = {
  work_anxiety: 6.2,
  relationship_clinging: 3.1,
  existential_emptiness: 1.8,
  health_fear: 5.5,
  acute_emotion: 2.2,
}

const sampleSegment: SutraSegment = {
  id: 'segment_5',
  original: '無無明，亦無無明盡，乃至無老死，亦無老死盡。無苦集滅道，無智亦無得。',
  vernacular: '沒有永遠消除不掉的愚昧⋯⋯',
  keywords: ['無所得'],
  therapeutic_focus: '緩解對進度、成就、人生意義的過度追求',
}

describe('buildInsightPrompt', () => {
  it('embeds all 5 metrics with their Chinese labels', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('職場焦慮：6.2')
    expect(p.systemInstruction).toContain('關係執著：3.1')
    expect(p.systemInstruction).toContain('存在虛無：1.8')
    expect(p.systemInstruction).toContain('健康恐懼：5.5')
    expect(p.systemInstruction).toContain('突發情緒：2.2')
  })

  it('includes the dominant dim label as 主要傾向', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('主要傾向：職場焦慮')
  })

  it('embeds segment id, original, vernacular, and therapeutic_focus', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('segment_5')
    expect(p.systemInstruction).toContain(sampleSegment.original)
    expect(p.systemInstruction).toContain(sampleSegment.vernacular)
    expect(p.systemInstruction).toContain(sampleSegment.therapeutic_focus)
  })

  it('output contract requests JSON with reflection field, 30-60 chars', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('[Output Contract]')
    expect(p.systemInstruction).toContain('"reflection"')
    expect(p.systemInstruction).toContain('30 至 60 個漢字')
  })

  it('responseSchema requires `reflection` string', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.responseSchema).toEqual({
      type: 'object',
      properties: { reflection: { type: 'string' } },
      required: ['reflection'],
    })
  })

  it('generationConfig uses temperature 0.7 and JSON mime', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.generationConfig.responseMimeType).toBe('application/json')
    expect(p.generationConfig.temperature).toBe(0.7)
  })

  it('contents is an empty array (system instruction carries everything)', () => {
    const p = buildInsightPrompt({
      metrics7d: sampleMetrics,
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.contents).toEqual([])
  })

  it('rounds incoming metrics to 1 decimal before substitution', () => {
    const p = buildInsightPrompt({
      metrics7d: { ...sampleMetrics, work_anxiety: 6.249 },
      dominantDim: 'work_anxiety',
      segment: sampleSegment,
    })
    expect(p.systemInstruction).toContain('職場焦慮：6.2')
    expect(p.systemInstruction).not.toContain('6.249')
  })

  it('all 5 dominant dim labels render correctly', () => {
    const expectedLabels: Record<EmotionDimension, string> = {
      work_anxiety: '職場焦慮',
      relationship_clinging: '關係執著',
      existential_emptiness: '存在虛無',
      health_fear: '健康恐懼',
      acute_emotion: '突發情緒',
    }
    for (const dim of Object.keys(expectedLabels) as EmotionDimension[]) {
      const p = buildInsightPrompt({
        metrics7d: sampleMetrics,
        dominantDim: dim,
        segment: sampleSegment,
      })
      expect(p.systemInstruction).toContain(`主要傾向：${expectedLabels[dim]}`)
    }
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test -- tests/insight-prompt-builder.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/insight-prompt-builder.ts`**

```ts
import type { GeminiPayload } from '@/lib/prompt-builder'
import type {
  EmotionDimension,
  EmotionMetrics,
} from '@/types/analytics'
import type { SutraSegment } from '@/types/chat'
import { DIMENSION_LABELS } from '@/lib/analytics-labels'

export interface BuildInsightPromptInput {
  metrics7d: EmotionMetrics
  dominantDim: EmotionDimension
  segment: SutraSegment
}

function fmt1dp(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1)
}

function metricsBlock(m: EmotionMetrics, dominantDim: EmotionDimension): string {
  return `[使用者近 7 日心境（0-10）]
職場焦慮：${fmt1dp(m.work_anxiety)}
關係執著：${fmt1dp(m.relationship_clinging)}
存在虛無：${fmt1dp(m.existential_emptiness)}
健康恐懼：${fmt1dp(m.health_fear)}
突發情緒：${fmt1dp(m.acute_emotion)}
主要傾向：${DIMENSION_LABELS[dominantDim]}`
}

function segmentBlock(s: SutraSegment): string {
  return `[今日對應經文]
${s.id} ${s.original}
（白話：${s.vernacular}）
治療焦點：${s.therapeutic_focus}`
}

const ROLE_BLOCK = `你是《心經數位道場》的內觀引導者，不是治療師、不是助理。
語氣：禪意、留白、不安慰、不解釋過多。`

const TASK_BLOCK = `[任務]
請寫一段「今日靜觀」反思，連結上述經文與使用者近日的心境傾向。
- 30 至 60 個漢字
- 第二人稱（「你」），不用「我」或「您」
- 不引用經文原文（經文會另行顯示）
- 不給建議，不給結論
- 不用驚嘆號或問號`

const OUTPUT_CONTRACT_BLOCK = `[Output Contract]
回傳 JSON：{"reflection": "<30-60字反思>"}`

export function buildInsightPrompt(
  input: BuildInsightPromptInput
): GeminiPayload {
  const systemInstruction = [
    ROLE_BLOCK,
    metricsBlock(input.metrics7d, input.dominantDim),
    segmentBlock(input.segment),
    TASK_BLOCK,
    OUTPUT_CONTRACT_BLOCK,
  ].join('\n\n')

  return {
    systemInstruction,
    contents: [],
    responseSchema: {
      type: 'object',
      properties: { reflection: { type: 'string' } },
      required: ['reflection'],
    },
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  }
}
```

(Rationale for `temperature: 0.7`: the analytics extraction uses `0.3` for stable structured extraction. Reflection prose benefits from a bit more variety day-to-day, but not so much it drifts off-tone. `0.7` is the Gemini docs' general-purpose-creative default.)

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test -- tests/insight-prompt-builder.test.ts`
Expected: PASS

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/insight-prompt-builder.ts tests/insight-prompt-builder.test.ts
git commit -m "feat(insight): pure prompt builder for daily reflection"
```

---

## Task 8: Implement parser with tests

**Files:**
- Create: `src/lib/insight-parser.ts`
- Create: `tests/insight-parser.test.ts`

Mirror `analytics-parser.ts` structure; same `GeminiError('INVALID_RESPONSE', …)` throwing convention.

- [ ] **Step 1: Write failing tests in `tests/insight-parser.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseInsightResponse } from '@/lib/insight-parser'
import { GeminiError } from '@/lib/gemini'

describe('parseInsightResponse', () => {
  it('parses bare JSON', () => {
    const got = parseInsightResponse('{"reflection":"你近日心緒繫於形相試觀色與空本是一處。"}')
    expect(got.reflection).toBe('你近日心緒繫於形相試觀色與空本是一處。')
  })

  it('parses markdown-fenced JSON', () => {
    const raw = '```json\n{"reflection":"你近日心緒繫於形相試觀色與空本是一處。"}\n```'
    expect(parseInsightResponse(raw).reflection).toContain('你近日')
  })

  it('parses JSON wrapped in prose', () => {
    const raw = 'Here is the result:\n{"reflection":"你近日心緒繫於形相試觀色與空本是一處。"}\nThanks.'
    expect(parseInsightResponse(raw).reflection).toContain('你近日')
  })

  it('trims surrounding whitespace from reflection', () => {
    const got = parseInsightResponse('{"reflection":"  你近日心緒繫於形相試觀色與空本是一處。  "}')
    expect(got.reflection.startsWith(' ')).toBe(false)
    expect(got.reflection.endsWith(' ')).toBe(false)
  })

  it('rejects when no JSON object', () => {
    expect(() => parseInsightResponse('no braces here'))
      .toThrowError(GeminiError)
  })

  it('rejects when reflection field missing', () => {
    expect(() => parseInsightResponse('{"other":"x"}'))
      .toThrowError(GeminiError)
  })

  it('rejects when reflection is empty string', () => {
    expect(() => parseInsightResponse('{"reflection":""}'))
      .toThrowError(GeminiError)
  })

  it('rejects when reflection is non-string', () => {
    expect(() => parseInsightResponse('{"reflection":42}'))
      .toThrowError(GeminiError)
  })

  it('rejects when length < 10 chars (CJK code points)', () => {
    expect(() => parseInsightResponse('{"reflection":"太短了"}'))
      .toThrowError(GeminiError)
  })

  it('rejects when length > 120 chars', () => {
    const long = '阿'.repeat(121)
    expect(() => parseInsightResponse(`{"reflection":"${long}"}`))
      .toThrowError(GeminiError)
  })

  it('counts CJK code points, not UTF-16 units', () => {
    // 20 zh-chars is well within 10..120. UTF-16 string length would be 20 too here,
    // but the test covers the contract: Array.from(s).length is used.
    const exactly20 = '阿'.repeat(20)
    expect(parseInsightResponse(`{"reflection":"${exactly20}"}`).reflection).toBe(exactly20)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test -- tests/insight-parser.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/insight-parser.ts`**

```ts
import { GeminiError } from '@/lib/gemini'

export interface ParsedInsight {
  reflection: string
}

const MIN_LEN = 10
const MAX_LEN = 120

function extractJsonObject(raw: string): string {
  // Walk from first '{' to matching '}', string-aware. Tolerates markdown fences
  // and prose. Mirrors analytics-parser.ts exactly.
  const start = raw.indexOf('{')
  if (start === -1) {
    throw new GeminiError('INVALID_RESPONSE', 'No JSON object found in response', true)
  }
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (escape) { escape = false; continue }
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
  throw new GeminiError('INVALID_RESPONSE', 'Unbalanced braces in insight response', true)
}

export function parseInsightResponse(raw: string): ParsedInsight {
  const jsonStr = extractJsonObject(raw)
  let obj: unknown
  try {
    obj = JSON.parse(jsonStr)
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Insight JSON failed to parse', true)
  }
  if (!obj || typeof obj !== 'object') {
    throw new GeminiError('INVALID_RESPONSE', 'Insight root is not an object', true)
  }
  const root = obj as Record<string, unknown>
  if (typeof root.reflection !== 'string') {
    throw new GeminiError('INVALID_RESPONSE', 'Insight reflection missing or non-string', true)
  }
  const trimmed = root.reflection.trim()
  const len = Array.from(trimmed).length
  if (len === 0) {
    throw new GeminiError('INVALID_RESPONSE', 'Insight reflection is empty', true)
  }
  if (len < MIN_LEN || len > MAX_LEN) {
    throw new GeminiError(
      'INVALID_RESPONSE',
      `Insight reflection length ${len} outside [${MIN_LEN}, ${MAX_LEN}]`,
      true
    )
  }
  return { reflection: trimmed }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test -- tests/insight-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/insight-parser.ts tests/insight-parser.test.ts
git commit -m "feat(insight): tolerant parser for {reflection} response"
```

---

## Task 9: Implement pipeline with tests

**Files:**
- Create: `src/lib/insight-pipeline.ts`
- Create: `tests/insight-pipeline.test.ts`

The orchestrator. Pulls everything together: same-day guard → 7d analytics → picker → prompt → Gemini → parse → persist.

- [ ] **Step 1: Write failing tests in `tests/insight-pipeline.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  db,
  saveDailyInsight,
  getDailyInsight,
  mergeDailyAnalytics,
} from '@/lib/db'
import * as gemini from '@/lib/gemini'
import { GeminiError } from '@/lib/gemini'
import { todayLocalISO } from '@/lib/date-utils'
import { requestDailyInsight, NoRecentDataError } from '@/lib/insight-pipeline'

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>()
  return {
    ...actual,
    callGeminiRaw: vi.fn(),
  }
})

const mockCall = vi.mocked(gemini.callGeminiRaw)

beforeEach(async () => {
  await db.delete()
  await db.open()
  mockCall.mockReset()
})

async function seedAnalytics(date: string, healthFear = 7) {
  await mergeDailyAnalytics(date, {
    metrics: {
      work_anxiety: 1,
      relationship_clinging: 1,
      existential_emptiness: 1,
      health_fear: healthFear,
      acute_emotion: 1,
    },
    mind_summary: 'seed',
    recommended_segment: null,
    source_session_id: 1,
  })
}

describe('requestDailyInsight', () => {
  it('throws NoRecentDataError when no analytics exist', async () => {
    await expect(requestDailyInsight('FAKE_KEY')).rejects.toBeInstanceOf(NoRecentDataError)
    expect(mockCall).not.toHaveBeenCalled()
  })

  it('happy path: persists a row and returns it', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockResolvedValueOnce(
      '{"reflection":"你近日畏懼身體之變試觀此身亦非實有不必驚不必逃。"}'
    )
    const row = await requestDailyInsight('FAKE_KEY')
    expect(row.date).toBe(todayLocalISO())
    expect(row.dominantDim).toBe('health_fear')
    expect(row.segmentId).toBe('segment_3')
    expect(row.reflection).toContain('你近日')
    expect(await getDailyInsight(todayLocalISO())).toEqual(row)
  })

  it('same-day guard: returns existing row without calling Gemini', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    await saveDailyInsight({
      date: todayLocalISO(),
      segmentId: 'segment_3',
      dominantDim: 'health_fear',
      reflection: '舊有的靜觀內容靜默不變如山岳常住。',
      metricsSnapshot: {
        work_anxiety: 0, relationship_clinging: 0, existential_emptiness: 0,
        health_fear: 0, acute_emotion: 0,
      },
      createdAt: 1,
    })
    const row = await requestDailyInsight('FAKE_KEY')
    expect(row.reflection).toContain('舊有的靜觀')
    expect(mockCall).not.toHaveBeenCalled()
  })

  it('Gemini NETWORK error: does not write a row', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockRejectedValueOnce(new GeminiError('NETWORK', 'offline', true))
    await expect(requestDailyInsight('FAKE_KEY')).rejects.toMatchObject({
      kind: 'NETWORK',
    })
    expect(await getDailyInsight(todayLocalISO())).toBeUndefined()
  })

  it('parser INVALID_RESPONSE: does not write a row', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockResolvedValueOnce('not json at all')
    await expect(requestDailyInsight('FAKE_KEY')).rejects.toMatchObject({
      kind: 'INVALID_RESPONSE',
    })
    expect(await getDailyInsight(todayLocalISO())).toBeUndefined()
  })

  it('AUTH_FAILED: does not write a row', async () => {
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockRejectedValueOnce(new GeminiError('AUTH_FAILED', 'bad key', false))
    await expect(requestDailyInsight('FAKE_KEY')).rejects.toMatchObject({
      kind: 'AUTH_FAILED',
    })
    expect(await getDailyInsight(todayLocalISO())).toBeUndefined()
  })

  it('passes 7-day mean to the prompt (smoke: prompt mentions a non-zero value)', async () => {
    // Seed two days, both within window
    const yesterday = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1)
      return d.toLocaleDateString('sv-SE')
    })()
    await seedAnalytics(yesterday, 4)
    await seedAnalytics(todayLocalISO(), 8)
    mockCall.mockResolvedValueOnce(
      '{"reflection":"你近日畏懼身體之變試觀此身亦非實有不必驚不必逃。"}'
    )
    await requestDailyInsight('FAKE_KEY')
    expect(mockCall).toHaveBeenCalledTimes(1)
    const payload = mockCall.mock.calls[0][1]
    // mean of 4 and 8 → 6.0
    expect(payload.systemInstruction).toContain('健康恐懼：6.0')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test -- tests/insight-pipeline.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/insight-pipeline.ts`**

```ts
import sutraDb from '@/data/sutra-db.json'
import { callGeminiRaw } from '@/lib/gemini'
import { todayLocalISO } from '@/lib/date-utils'
import {
  getDailyInsight,
  getRecentAnalytics,
  saveDailyInsight,
} from '@/lib/db'
import { getSegmentById } from '@/lib/sutra'
import { buildInsightPrompt } from '@/lib/insight-prompt-builder'
import { parseInsightResponse } from '@/lib/insight-parser'
import { pickInsightSegment } from '@/lib/insight-segment-picker'
import type { DailyInsightRecord } from '@/types/analytics'
import type { SutraSegment } from '@/types/chat'

const SUTRA_DB = sutraDb as SutraSegment[]
const RECENT_WINDOW_DAYS = 7

export class NoRecentDataError extends Error {
  constructor() {
    super('No analytics in the last 7 days')
    this.name = 'NoRecentDataError'
  }
}

/**
 * Tap-to-request entry point for the Daily Insight card.
 *
 * - Same-day guard: returns existing row without calling Gemini.
 * - Throws NoRecentDataError if no analytics exist in the last 7 local days.
 * - Throws GeminiError (kind: NETWORK | RATE_LIMIT | AUTH_FAILED | INVALID_RESPONSE | UNKNOWN)
 *   on any failure path. No row is written on any error.
 *
 * Invariant: this is the ONLY non-chat Gemini call site besides
 * `pipelineChatToAnalytics`.
 */
export async function requestDailyInsight(
  apiKey: string
): Promise<DailyInsightRecord> {
  const today = todayLocalISO()

  const existing = await getDailyInsight(today)
  if (existing) return existing

  const rows = await getRecentAnalytics(RECENT_WINDOW_DAYS)
  const pick = pickInsightSegment(rows)
  if (pick === null) throw new NoRecentDataError()

  const segment = getSegmentById(SUTRA_DB, pick.segmentId)
  if (!segment) {
    // Defensive: this would only fire if DOMINANT_DIM_TO_SEGMENT references
    // an id absent from sutra-db.json. Treat as INVALID_RESPONSE-class internal
    // error rather than crash the UI.
    throw new NoRecentDataError()
  }

  const payload = buildInsightPrompt({
    metrics7d: pick.metrics7d,
    dominantDim: pick.dominantDim,
    segment,
  })

  const raw = await callGeminiRaw(apiKey, payload)
  const parsed = parseInsightResponse(raw)

  const row: DailyInsightRecord = {
    date: today,
    segmentId: pick.segmentId,
    dominantDim: pick.dominantDim,
    reflection: parsed.reflection,
    metricsSnapshot: pick.metrics7d,
    createdAt: Date.now(),
  }
  await saveDailyInsight(row)
  return row
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test -- tests/insight-pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/insight-pipeline.ts tests/insight-pipeline.test.ts
git commit -m "feat(insight): tap-to-request pipeline with same-day guard"
```

---

## Task 10: Implement `useDailyInsight` hook

**Files:**
- Create: `src/hooks/useDailyInsight.ts`

Hook only — no formal tests this phase (matches Phase 3-A/B precedent; hooks are exercised via browser smoke). The shape is locked by spec §9.

- [ ] **Step 1: Implement `src/hooks/useDailyInsight.ts`**

```ts
'use client'
import { useCallback, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useApiKey } from '@/hooks/useApiKey'
import { getDailyInsight, getRecentAnalytics } from '@/lib/db'
import { todayLocalISO } from '@/lib/date-utils'
import { requestDailyInsight, NoRecentDataError } from '@/lib/insight-pipeline'
import { GeminiError, type GeminiErrorKind } from '@/lib/gemini'
import { getSegmentById } from '@/lib/sutra'
import sutraDb from '@/data/sutra-db.json'
import type { DailyInsightRecord } from '@/types/analytics'
import type { SutraSegment } from '@/types/chat'

const SUTRA_DB = sutraDb as SutraSegment[]

export type InsightStatus = 'empty' | 'ready' | 'requesting' | 'shown' | 'error'

export interface InsightError {
  kind: GeminiErrorKind | 'NO_DATA'
  message: string
}

export interface UseDailyInsightReturn {
  status: InsightStatus
  insight: DailyInsightRecord | null
  segment: SutraSegment | null
  error: InsightError | null
  request: () => Promise<void>
  isFirstReveal: boolean
}

export function useDailyInsight(): UseDailyInsightReturn {
  const { apiKey } = useApiKey()
  const todayRow = useLiveQuery(() => getDailyInsight(todayLocalISO()), [])
  const recentRows = useLiveQuery(() => getRecentAnalytics(7), [])

  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<InsightError | null>(null)
  const firstRevealRef = useRef<string | null>(null)

  const request = useCallback(async () => {
    if (!apiKey || requesting) return
    setRequesting(true)
    setError(null)
    try {
      const row = await requestDailyInsight(apiKey)
      firstRevealRef.current = row.date // flag the next render as "just produced"
    } catch (err) {
      if (err instanceof NoRecentDataError) {
        setError({ kind: 'NO_DATA', message: '尚無近日紀錄' })
      } else if (err instanceof GeminiError) {
        setError({ kind: err.kind, message: messageFor(err.kind) })
      } else {
        setError({ kind: 'UNKNOWN', message: '靜觀片刻，明日再試' })
      }
    } finally {
      setRequesting(false)
    }
  }, [apiKey, requesting])

  // Resolve status
  let status: InsightStatus = 'ready'
  if (requesting) {
    status = 'requesting'
  } else if (todayRow) {
    status = 'shown'
  } else if (recentRows !== undefined && recentRows.length === 0) {
    status = 'empty'
  } else if (error) {
    status = 'error'
  }
  // (status stays 'ready' while liveQueries are still loading — UI shows the button)

  const segment = todayRow ? getSegmentById(SUTRA_DB, todayRow.segmentId) ?? null : null
  const isFirstReveal = todayRow !== undefined && firstRevealRef.current === todayRow.date

  return {
    status,
    insight: todayRow ?? null,
    segment,
    error,
    request,
    isFirstReveal,
  }
}

function messageFor(kind: GeminiErrorKind): string {
  switch (kind) {
    case 'NETWORK': return '網路未連線，稍後再試'
    case 'RATE_LIMIT': return '呼吸片刻，稍後再試'
    case 'AUTH_FAILED': return 'API 金鑰無效，請至設定更新'
    case 'INVALID_RESPONSE': return '靜觀片刻，明日再試'
    case 'UNKNOWN':
    default: return '靜觀片刻，明日再試'
  }
}
```

(`useApiKey()` returns `{ apiKey, loading, save, clear }` per `src/hooks/useApiKey.ts`; we only need the value, destructured above.)

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. If `useApiKey` return shape doesn't match, fix the destructuring before committing.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDailyInsight.ts
git commit -m "feat(insight): useDailyInsight hook (state machine + liveQuery)"
```

---

## Task 11: Implement `DailyInsightCard` component

**Files:**
- Create: `src/components/MindMirror/DailyInsightCard.tsx`

- [ ] **Step 1: Implement `src/components/MindMirror/DailyInsightCard.tsx`**

```tsx
'use client'
import { useDailyInsight } from '@/hooks/useDailyInsight'
import { LotusGlyph } from '@/components/Lotus'
import { BreathingLoader } from '@/components/BreathingLoader'
import { InkDropText } from '@/components/InkDropText'
import { ZEN_ACCENT } from '@/lib/mirror-colors'

export function DailyInsightCard() {
  const { status, insight, segment, error, request, isFirstReveal } = useDailyInsight()

  return (
    <section
      role="region"
      aria-labelledby="daily-insight-title"
      className="gold-frame p-6 text-center flex flex-col items-center gap-4"
    >
      <LotusGlyph className="w-8 h-8" />
      <h2
        id="daily-insight-title"
        className="text-sm tracking-widest text-zen-muted"
      >
        今日靜觀
      </h2>

      {status === 'empty' && (
        <div className="text-zen-muted font-serif text-sm leading-relaxed">
          <p>尚無近日紀錄</p>
          <p>先在道場中對話，明日再來</p>
        </div>
      )}

      {(status === 'ready' || status === 'error') && (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={request}
            aria-busy={false}
            className="border border-zen-accent/60 text-zen-accent px-5 py-2 text-sm tracking-widest hover:bg-zen-accent/10 transition-colors"
          >
            請示今日靜觀
          </button>
          {error && error.kind === 'AUTH_FAILED' ? (
            <p className="text-xs text-zen-muted">
              {error.message}（
              <a href="/setup" className="underline hover:text-zen-accent">前往設定</a>
              ）
            </p>
          ) : error ? (
            <p className="text-xs text-zen-muted">{error.message}</p>
          ) : null}
        </div>
      )}

      {status === 'requesting' && (
        <div aria-live="polite">
          <BreathingLoader />
        </div>
      )}

      {status === 'shown' && insight && segment && (
        <div className="flex flex-col items-center gap-4 max-w-md">
          <p className="font-serif tracking-[0.5em] text-zen-text leading-loose">
            {segment.original}
          </p>
          <hr
            className="border-0 h-px w-[60px]"
            style={{ backgroundColor: ZEN_ACCENT, opacity: 0.4 }}
          />
          <div
            className="text-zen-text leading-relaxed"
            aria-live={isFirstReveal ? 'polite' : undefined}
          >
            <InkDropText
              text={insight.reflection}
              mode={isFirstReveal ? 'live' : 'static'}
            />
          </div>
          <LotusGlyph className="w-4 h-4 opacity-50" />
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/MindMirror/DailyInsightCard.tsx
git commit -m "feat(insight): DailyInsightCard with 4 UI states"
```

---

## Task 12: Mount card in `/mirror` page + manual smoke

**Files:**
- Modify: `src/app/mirror/page.tsx`

- [ ] **Step 1: Update `src/app/mirror/page.tsx`**

Add import:

```ts
import { DailyInsightCard } from '@/components/MindMirror/DailyInsightCard'
```

Mount the card at the top of the main column inside the `rows.length > 0` branch, immediately above `<AttachmentIndex row={today} />`:

```tsx
const today = rows[rows.length - 1]
return (
  <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
    <BackLink />
    <MirrorHeader />
    <DailyInsightCard />
    <AttachmentIndex row={today} />
    <RadarPanel rows={rows} />
    <TrendPanel rows={rows} />
  </div>
)
```

Note: the card is also useful in the "empty mirror" branch (it'll render its own **empty** state), but matching Phase 3-A/B's existing UX where `EmptyMirror` is the sole render for no-analytics users keeps things simple. Skip mounting in the empty branch this phase.

- [ ] **Step 2: Typecheck + tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: PASS

- [ ] **Step 3: Manual browser smoke (per CLAUDE.md convention)**

Run: `pnpm dev`

Walk through each of the 7 smoke steps from spec §11. Specifically:

1. With a fresh DB (`indexedDB.deleteDatabase('SutraMindDB')` in devtools console + reload), `/mirror` → see `EmptyMirror` (unchanged from before).
2. Complete one chat session; return to `/mirror` → see new `DailyInsightCard` in **ready** state with button.
3. Tap 「請示今日靜觀」 → `BreathingLoader` appears → reflection live-reveals char-by-char with the segment original above + gold hairline + closing lotus.
4. Refresh `/mirror` → reflection is shown statically (no re-animation).
5. Disable network in devtools → manually clear today's row via devtools (or wait until next local day) → tap → muted line 「網路未連線，稍後再試」 appears; button stays.
6. In devtools, set `prefers-reduced-motion: reduce` (Rendering tab → Emulate CSS media feature) → BreathingLoader becomes static glow; live-reveal becomes instant.
7. Force date rollover: in devtools console, `await indexedDB.databases()` then clear the `dailyInsight` table → card returns to **ready**.

- [ ] **Step 4: Commit only after manual smoke passes**

```bash
git add src/app/mirror/page.tsx
git commit -m "feat(mirror): mount DailyInsightCard at top of /mirror"
```

If a smoke step fails, fix the underlying file (likely `DailyInsightCard.tsx` or `useDailyInsight.ts`), amend the relevant prior commit only if it's the same task; otherwise add a fix commit.

---

## Task 13: Update docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `TODO.md`

- [ ] **Step 1: Update `CLAUDE.md`**

In the "Recently shipped" section, add at the top (before the existing Phase 3-A/B line):

```markdown
- ✅ Phase 3-C: Daily Insight (`/mirror` card 「今日靜觀」 — tap-to-request Gemma reflection drawn from last-7-day metrics + client-picked sutra segment; Dexie v3 adds `dailyInsight` table; same-day guard preserves API quota). New invariant: `requestDailyInsight` is the *second* and only other non-chat Gemini call site alongside `pipelineChatToAnalytics` (2026-05-17)
```

Find the "Conventions" → "Prompt changes" paragraph; append a sentence noting the same applies to `insight-prompt-builder.ts` and `tests/insight-prompt-builder.test.ts`.

- [ ] **Step 2: Update `TODO.md`**

In §"Phase 3-A/B polish" (the "from 2026-05-16 final review" subsection):
- Remove the `Extract DIMENSION_LABELS` bullet (shipped in Task 1).
- Remove the `Extract Recharts hex constants` bullet (shipped in Task 2).

In §9 "Phase 3-C: Daily Insight ritual (next up)", change the heading to `### 9. Phase 3-C: Daily Insight ✅ shipped 2026-05-17` and replace the brainstorm bullets with:

```markdown
Spec: `docs/superpowers/specs/2026-05-17-daily-insight-design.md` · Plan: `docs/superpowers/plans/2026-05-17-daily-insight-plan.md`
- `/mirror` shows a top-of-page `DailyInsightCard` with four states: empty / ready / requesting / shown.
- Tap 「請示今日靜觀」 → Gemma call with 7-day mean metrics + client-picked segment (argmax across 5 dims, deterministic priority tie-break) → 30-60 zh-char reflection persisted in new `dailyInsight` Dexie table keyed by local YYYY-MM-DD.
- Same-day guard returns existing row without burning quota; no row is ever written on error so the user can retap freely.
- Two `analytics-labels.ts` + `mirror-colors.ts` shared libs absorbed two Phase 3-A/B polish items en route.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md TODO.md
git commit -m "docs: mark Phase 3-C shipped + retire 2 polish items"
```

---

## Self-review checklist (run before declaring done)

- [ ] `pnpm test` — all suites green (db, analytics-*, insight-*, prompt-builder, sutra, etc.)
- [ ] `pnpm exec tsc --noEmit` — clean
- [ ] `pnpm build` — static export succeeds
- [ ] All 7 manual smoke steps from spec §11 verified in a real browser
- [ ] `CLAUDE.md` "Recently shipped" updated
- [ ] `TODO.md` Phase 3-C marked ✅; 2 polish bullets removed
- [ ] No `console.log` in any new file (audit by `pnpm exec grep -rn 'console\\.log' src/`)
- [ ] No `dexie` imports in any UI file outside `src/lib/db.ts`
- [ ] No native dialogs anywhere new

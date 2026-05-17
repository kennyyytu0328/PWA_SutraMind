# Phase 3-C — Daily Insight (今日靜觀) Design

**Status:** Draft for review
**Date:** 2026-05-17
**Depends on:** Phase 3-A/B (analytics pipeline + /mirror) — already shipped
**Successor to:** TODO.md §9

---

## 1. Intent

After two phases (analytics pipeline → /mirror visualisation), users have a mirror of their last 30 days but no *teaching* — the mirror reflects, it does not speak. Phase 3-C adds a single, opt-in, once-per-day moment we call **今日靜觀 (Daily Insight)**: a card at the top of `/mirror` showing one sutra segment plus 30–60 zh-chars of reflection prose, drawn from the user's last 7 days of metrics.

Design constraints inherited from CLAUDE.md:

- 數位道場 voice, not productivity-app voice. Zen vocabulary, no CTAs, no notifications, no streaks.
- Privacy: BYOK, no telemetry. The insight call is a second Gemini call site alongside `pipelineChatToAnalytics`; no other code path may call Gemini.
- Round-counter-style discipline: failures never burn the day's slot — no row is persisted unless Gemma returns a schema-valid response.
- `prefers-reduced-motion` is honored.

## 2. User-visible behaviour

| State                         | What the card shows                                                                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **empty** (no analytics in last 7 local days) | `今日靜觀` title + 「尚無近日紀錄／先在道場中對話，明日再來」. No button.                                                                                                          |
| **ready** (analytics exist, no insight today) | `今日靜觀` title + 「請示今日靜觀」 button.                                                                                                                                       |
| **requesting**                | Button replaced by `<BreathingLoader />` (existing component, 5s soft-glow, reduced-motion → static glow).                                                                         |
| **shown** (today's row exists in `dailyInsight`) | Gold-frame card: lotus glyph · `今日靜觀` title · sutra original (font-serif, `tracking-[0.5em]`) · 60px hairline · reflection prose (sans, 30–60 zh-chars) · lotus closing flourish. |
| **error** (after a failed tap, no row written) | Returns to **ready** state; a muted line below the button explains the failure (see §7).                                                                                            |

Date rollover: at local midnight, the liveQuery key changes (`todayLocalISO()`), today's row is no longer matched, the card returns to **ready** automatically. No background job.

## 3. Architecture

```
/mirror page
  └─ <DailyInsightCard />
       └─ useDailyInsight()
            ├─ liveQuery: db.dailyInsight where date = todayLocalISO()
            └─ request(): calls requestDailyInsight() from lib/insight-pipeline
                            │
                            ▼
            requestDailyInsight()                      [src/lib/insight-pipeline.ts]
              1. guard: if dailyInsight row for today exists → return it
              2. read last-7-day DailyAnalytics rows    [reuse db.ts helper]
              3. pickInsightSegment(rows)                [src/lib/insight-segment-picker.ts]
                    → { dominantDim, segmentId, metrics7d } | null
                    null → throw NoRecentDataError (caller maps to empty state)
              4. buildInsightPrompt({metrics7d, dominantDim, segment})
                                                         [src/lib/insight-prompt-builder.ts]
              5. callGemini(payload)                     [reuse src/lib/gemini.ts]
              6. parseInsightResponse(raw)               [src/lib/insight-parser.ts]
              7. saveDailyInsight({date, segmentId, dominantDim,
                                   reflection, metricsSnapshot, createdAt})
                                                         [src/lib/db.ts]
              8. return row
```

**Boundary rules** (match CLAUDE.md):

- UI never imports `dexie` or `gemini`; only the hook.
- Hook only orchestrates state; all pure logic lives in `lib/*`.
- All Gemma prompt engineering for the insight stays in `insight-prompt-builder.ts` and is unit-tested.
- All persistence helpers live in `lib/db.ts`; the pipeline never imports `dexie` directly.
- New invariant (add to CLAUDE.md on ship): there are exactly **two** non-chat Gemini call sites — `pipelineChatToAnalytics` and `requestDailyInsight`.

## 4. Segment picker

File: `src/lib/insight-segment-picker.ts`. Pure, fully testable.

**Step 1 — Source rows.** Caller passes `DailyAnalytics[]` already filtered to the last 7 local days (helper `last7Days` exists in `mirror-stats.ts`; reuse).

**Step 2 — Empty guard.** If `rows.length === 0` → return `null`. Caller surfaces the **empty** card state.

**Step 3 — Aggregate.** Compute per-dimension **mean** across rows:

```ts
const metrics7d: EmotionMetrics = {
  work_anxiety: mean(rows.map(r => r.metrics.work_anxiety)),
  relationship_clinging: mean(rows.map(r => r.metrics.relationship_clinging)),
  existential_emptiness: mean(rows.map(r => r.metrics.existential_emptiness)),
  health_fear: mean(rows.map(r => r.metrics.health_fear)),
  acute_emotion: mean(rows.map(r => r.metrics.acute_emotion)),
}
```

Mean (not max) so a single spike doesn't dominate the week; not slope, because slope needs ≥ 3 distinct dates and we want this to work with 1.

**Step 4 — Argmax with deterministic tie-break.** Compare the 5 values; pick the largest. On ties, the order below wins (so behaviour is reproducible in tests):

```ts
const DIM_PRIORITY: readonly EmotionDimension[] = [
  'health_fear',
  'acute_emotion',
  'relationship_clinging',
  'work_anxiety',
  'existential_emptiness',
] as const
```

Rationale for ordering: `health_fear` and `acute_emotion` are more visceral; if they tie a milder dim, surface the visceral one. The order is a default, not load-bearing — the only place this matters is the all-zero or all-equal edge case.

**Step 5 — Map dimension → segment.**

```ts
const DOMINANT_DIM_TO_SEGMENT: Record<EmotionDimension, string> = {
  work_anxiety:           'segment_5', // 無所得 / 放下目標焦慮 — therapeutic_focus mentions 進度/成就
  relationship_clinging:  'segment_1', // 五蘊皆空 / 解除『自我』受傷感
  existential_emptiness:  'segment_7', // 三世諸佛 / 孤立無援時的普世連結感
  health_fear:            'segment_3', // 不生不滅 / 對身體劣化的恐懼 (literal match)
  acute_emotion:          'segment_2', // 色不異空 / 焦慮感受只是暫時出現的現象
}
```

Each mapping is justified by the `therapeutic_focus` string in `src/data/sutra-db.json` (canonical content; do not modify). Segments 4, 6, 8, 9 are not used in this lookup; they remain reachable through normal chat sessions.

**Output:**

```ts
type InsightSegmentPick = {
  dominantDim: EmotionDimension
  segmentId: string            // e.g. 'segment_3'
  metrics7d: EmotionMetrics    // pass-through for prompt builder + audit
} | null
```

## 5. Prompt builder

File: `src/lib/insight-prompt-builder.ts`. Pure function, mirrors `analytics-prompt-builder.ts` style.

**Signature:**

```ts
buildInsightPrompt(input: {
  metrics7d: EmotionMetrics      // 0–10 each
  dominantDim: EmotionDimension
  segment: SutraSegment          // looked up from sutra-db.json
}): { systemInstruction: string; contents: string; responseSchema: object }
```

**System instruction** (the wording below is canonical — changes require updating the test snapshot in `tests/insight-prompt-builder.test.ts`):

```
你是《心經數位道場》的內觀引導者，不是治療師、不是助理。
語氣：禪意、留白、不安慰、不解釋過多。

[使用者近 7 日心境（0-10）]
職場焦慮：{work_anxiety}
關係執著：{relationship_clinging}
存在虛無：{existential_emptiness}
健康恐懼：{health_fear}
突發情緒：{acute_emotion}
主要傾向：{dominantDimLabel}

[今日對應經文]
{segment.id} {segment.original}
（白話：{segment.vernacular}）
治療焦點：{segment.therapeutic_focus}

[任務]
請寫一段「今日靜觀」反思，連結上述經文與使用者近日的心境傾向。
- 30 至 60 個漢字
- 第二人稱（「你」），不用「我」或「您」
- 不引用經文原文（經文會另行顯示）
- 不給建議，不給結論
- 不用驚嘆號或問號

[Output Contract]
回傳 JSON：{"reflection": "<30-60字反思>"}
```

`{dominantDimLabel}` resolves via a small `DIMENSION_LABELS` map (job that overlaps with the deferred polish in TODO.md §"Phase 3-A/B polish — Extract `DIMENSION_LABELS`"). This spec will extract the map to `src/lib/analytics-labels.ts` as part of the implementation, retiring that polish item.

Metric numbers are rounded to one decimal place before substitution to keep the prompt token count predictable.

**SDK responseSchema** (belt-and-suspenders):

```ts
{
  type: 'object',
  properties: { reflection: { type: 'string' } },
  required: ['reflection'],
}
```

## 6. Parser

File: `src/lib/insight-parser.ts`. Tolerant, mirrors `analytics-parser.ts`.

Steps (mirrors `analytics-parser.ts` exactly so the pattern is familiar):

1. `extractJsonObject(raw)` — find first `{`, walk braces (string-aware) until depth returns to 0. Tolerates markdown fences and surrounding prose. Throws `GeminiError('INVALID_RESPONSE', …, true)` on no-`{` or unbalanced braces.
2. `JSON.parse`. On failure → `GeminiError('INVALID_RESPONSE', …, true)`.
3. Validate root is object and `reflection` is a non-empty string. Trim.
4. Reject if length `< 10` or `> 120` characters. Use `Array.from(s).length` to count code points correctly for CJK.
5. Return `{ reflection: string }`.

All failures throw `GeminiError(kind='INVALID_RESPONSE')`. The pipeline propagates these to the hook (see §7).

## 7. Failure modes

`callGeminiRaw` throws `GeminiError` with a `kind` discriminator. Real kinds from `src/lib/gemini.ts`: `AUTH_FAILED | RATE_LIMIT | NETWORK | INVALID_RESPONSE | UNKNOWN`. The underlying `callGeminiRaw` already auto-retries `NETWORK` and `UNKNOWN` internally (twice, with 3s/5s backoff), so by the time the pipeline sees one, it's a hard fail. The pipeline adds `NoRecentDataError`. Pipeline never writes a row on any error.

| Error caught                       | Card sub-state                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `NoRecentDataError`                | **empty** state (no button shown)                                               |
| `GeminiError(kind=NETWORK)`        | **ready** state + muted line 「網路未連線，稍後再試」                            |
| `GeminiError(kind=RATE_LIMIT)`     | **ready** state + muted line 「呼吸片刻，稍後再試」                              |
| `GeminiError(kind=AUTH_FAILED)`    | **ready** state + muted line 「API 金鑰無效，請至設定更新」 + link to `/setup` |
| `GeminiError(kind=INVALID_RESPONSE)` | **ready** state + muted line 「靜觀片刻，明日再試」 (parser failed)            |
| `GeminiError(kind=UNKNOWN)`        | **ready** state + muted line 「靜觀片刻，明日再試」                              |

No manual retry layer in the pipeline — `callGeminiRaw`'s internal retry already covers the transient cases. No row is written on any error, so the user can tap again freely; same discipline as the chat round counter.

## 8. Dexie schema v3

File: `src/lib/db.ts`. Additive bump v2 → v3.

```ts
this.version(3).stores({
  apiKey: '++id',                  // unchanged from v2
  sessions: '++id, category, startedAt', // unchanged from v2
  analytics: 'date',               // unchanged from v2
  profile: 'key',                  // unchanged from v2
  dailyInsight: 'date',            // NEW — primary key is YYYY-MM-DD local
})
```

(Schema strings mirror the existing v2 declaration in `src/lib/db.ts`; the only change is the new `dailyInsight` line.)

Dexie auto-handles additive schema changes; no data migration code needed. Existing v2 databases will upgrade on next open.

**Row shape** (new export from `src/types/analytics.ts`):

```ts
export interface DailyInsightRecord {
  date: string                  // PK, YYYY-MM-DD local
  segmentId: string             // 'segment_1' .. 'segment_9'
  dominantDim: EmotionDimension
  reflection: string            // Gemma output, post-parse
  metricsSnapshot: EmotionMetrics // what we showed Gemma; useful for audit
  createdAt: number             // Date.now()
}
```

**New `lib/db.ts` helpers** (UI never imports dexie directly):

```ts
export async function getDailyInsight(date: string): Promise<DailyInsightRecord | undefined>
export async function saveDailyInsight(row: DailyInsightRecord): Promise<void> // put-semantics
export async function getRecentAnalytics(daysBack: number): Promise<DailyAnalytics[]>
//   ^ may already exist; if not, add it for the picker. Reads rows whose
//     date >= todayLocalISO() shifted back `daysBack` days.
```

**Same-day double-tap guard:** the pipeline calls `getDailyInsight(today)` *before* any Gemma call. If a row exists, the existing one is returned. The button only renders in the **ready** state (no row), but a stale UI or click-race could still double-fire — the pipeline guard is the real defense.

**Storage cost:** ~200 bytes/day → ~73 KB/year. No prune logic this phase.

## 9. Hook

File: `src/hooks/useDailyInsight.ts`.

```ts
type InsightStatus = 'empty' | 'ready' | 'requesting' | 'shown' | 'error'

interface UseDailyInsightReturn {
  status: InsightStatus
  insight: DailyInsightRecord | null
  segment: SutraSegment | null      // resolved from sutra-db.json when status === 'shown'
  error: { kind: GeminiErrorKind | 'NO_DATA'; message: string } | null
  request: () => Promise<void>      // no-op if status !== 'ready'
  isFirstReveal: boolean            // true on the render immediately after a successful request
                                    //  → DailyInsightCard renders prose with InkDropText mode="live"
                                    //  → false on subsequent renders (mode="static") so revisits don't re-animate
}

export function useDailyInsight(): UseDailyInsightReturn
```

Internal: `useLiveQuery(() => getDailyInsight(todayLocalISO()))` + local state for `requesting` / `error` / `isFirstReveal`. Resolves the segment by mapping `insight.segmentId` through `lib/sutra.ts`.

**Empty detection.** A null liveQuery result alone is not "empty" — could just be "ready". The hook needs to know if any analytics exist in the last 7 days to disambiguate. Cheapest implementation: a second `useLiveQuery` on `getRecentAnalytics(7)` returning `rows.length > 0`. Status precedence: `requesting` > `shown` (row exists) > `empty` (no analytics 7d) > `ready`.

## 10. UI component

File: `src/components/MindMirror/DailyInsightCard.tsx`. Lives in the existing `MindMirror/` folder alongside `AttachmentIndex`, `RadarPanel`, `TrendPanel`, `EmptyMirror`.

**Frame:** `.gold-frame` (existing class), `<LotusGlyph className="w-8 h-8 mx-auto" />`, h2 「今日靜觀」.

**Shown state body:**

```tsx
<div className="text-center">
  <p className="font-serif tracking-[0.5em] text-zen-text">
    {segment.original}
  </p>
  <hr className="my-4 mx-auto w-[60px] border-0 h-px bg-zen-accent/40" />
  <InkDropText
    mode={isFirstReveal ? 'live' : 'static'}
    text={insight.reflection}
    className="text-zen-text leading-relaxed"
  />
  <LotusGlyph className="w-4 h-4 mx-auto mt-4 opacity-50" />
</div>
```

**Empty state body:** two short lines, muted (`text-zen-muted`), no button.

**Accessibility:**

- Outer card: `<section role="region" aria-labelledby="daily-insight-title">`; the title `<h2>` carries `id="daily-insight-title"`.
- Button (ready state): `<button type="button" aria-busy={status === 'requesting'}>`.
- During `requesting`, the BreathingLoader region gets `aria-live="polite"` so screen readers announce state transitions.
- On the live-reveal render, the prose container gets `aria-live="polite"`; on subsequent renders that attribute is removed so revisits stay silent.

**Page integration:** `/mirror` mounts `<DailyInsightCard />` at the top of its main column, above `<AttachmentIndex />`. No layout changes elsewhere.

## 11. Testing

| File                                  | Coverage                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/insight-segment-picker.test.ts` | empty rows → null · single row → that row's mean · multi-row mean · each of 5 dims winning · all-zero rows → priority winner (`health_fear` → segment_3) · two-way tie → priority order · three-way tie |
| `tests/insight-prompt-builder.test.ts` | snapshot of system instruction for one canonical input · metric rounding to 1 dp · all 5 dominantDim labels render correctly · responseSchema shape   |
| `tests/insight-parser.test.ts`        | bare JSON · markdown-fenced JSON · missing `reflection` → reject · empty string → reject · length 5 → reject · length 200 → reject · trimming · CJK length counting |
| `tests/insight-pipeline.test.ts`      | mock `callGemini`: happy path persists row · same-day guard skips Gemma · NoRecentData throws + no row · NETWORK error → no row · PARSE_FAIL retries once then no row |
| `tests/db.test.ts`                    | `saveDailyInsight` + `getDailyInsight` round-trip · same-day put overwrites · `getRecentAnalytics(7)` returns correct range                            |

No RTL component tests this phase (matches Phase 3-A/B precedent — UI verified by browser smoke per CLAUDE.md).

**Manual smoke (must pass before claiming done):**

1. Fresh install, no analytics — `/mirror` shows **empty** card.
2. Complete one chat session, return to `/mirror` — card shows **ready** button.
3. Tap button — BreathingLoader → **shown** state with reflection live-revealing char-by-char.
4. Refresh `/mirror` — same reflection appears immediately without re-animating (static InkDrop).
5. Disable network → tap button on a fresh day → **NETWORK** muted line; button stays.
6. `prefers-reduced-motion: reduce` → loader is static glow, prose appears instantly without animation.
7. Date rollover (force by editing system clock or `todayLocalISO`) → card returns to **ready**.

## 12. Out of scope (deferred)

- **Daily Insight history / archive.** Single date PK keeps things simple; we can add a `/insight/history` later if users ask.
- **Sharing / export.** Privacy-first; no sharing affordance.
- **Push / local notification at a chosen time.** Explicit anti-feature.
- **Configurable look-back window (3d / 7d / 14d).** 7d is the same window used by `/mirror`'s 「7日」 toggle; consistency over flexibility.
- **Per-segment reflection style variants.** The prompt is one-size-fits-all this phase.
- **Mind-mirror polish items (TODO.md §"Phase 3-A/B polish").** Out of scope *except* `DIMENSION_LABELS` extraction (§5 above) and `mirror-colors.ts` extraction (used by the gold hairline in the card → §10) — both are unblocked by being needed here, so they roll into this phase.

## 13. Files touched

**New:**

- `src/lib/insight-segment-picker.ts`
- `src/lib/insight-prompt-builder.ts`
- `src/lib/insight-parser.ts`
- `src/lib/insight-pipeline.ts`
- `src/lib/analytics-labels.ts` (`DIMENSION_LABELS` map; reused by RadarPanel)
- `src/lib/mirror-colors.ts` (`ZEN_GOLD` etc. hex constants; reused by RadarPanel + TrendPanel)
- `src/hooks/useDailyInsight.ts`
- `src/components/MindMirror/DailyInsightCard.tsx`
- `tests/insight-segment-picker.test.ts`
- `tests/insight-prompt-builder.test.ts`
- `tests/insight-parser.test.ts`
- `tests/insight-pipeline.test.ts`

**Edited:**

- `src/lib/db.ts` (v3 bump + new helpers)
- `src/types/analytics.ts` (`DailyInsightRecord` interface)
- `src/app/mirror/page.tsx` (mount `<DailyInsightCard />` at top of main column)
- `src/components/MindMirror/RadarPanel.tsx` (consume `analytics-labels.ts` + `mirror-colors.ts`)
- `src/components/MindMirror/TrendPanel.tsx` (consume `mirror-colors.ts`)
- `tests/db.test.ts` (new round-trip cases)
- `CLAUDE.md` (note the second non-chat Gemini call site)
- `TODO.md` (mark Phase 3-C shipped + retire 2 polish items)

## 14. Done criteria

- All test files above pass; `pnpm test` green.
- `pnpm exec tsc --noEmit` clean.
- `pnpm build` static export clean.
- All 7 manual smoke steps above verified in a real browser.
- `CLAUDE.md` "Recently shipped" updated with Phase 3-C line.

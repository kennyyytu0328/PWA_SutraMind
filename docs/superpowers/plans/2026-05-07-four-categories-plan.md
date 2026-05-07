# Wire Up the Other Four Dilemma Categories — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unlock the four currently-disabled dilemma categories (`career_achievement`, `self_existence`, `health_pain`, `sudden_emotion`) by extending category metadata, wiring per-category placeholder copy through `chat/page.tsx`, and adding a table-driven regression test.

**Architecture:** Pure presentation-and-data change. The strategy block in `prompt-builder.ts` already reads `getCategory().strategy` and `.likelySegments`, so unlocking the categories is a metadata flip. `ChatInput` already accepts an optional `placeholder` prop — only `chat/page.tsx` needs to thread the per-category value through.

**Tech Stack:** TypeScript 5, Next.js 14 (App Router, static export), Vitest 4, React 18.

**Spec:** `docs/superpowers/specs/2026-05-07-four-categories-design.md`

---

## File Structure

| File | Responsibility | Touched in |
|---|---|---|
| `src/lib/categories.ts` | `CategoryMeta` interface + the 5 category records | Task 1 |
| `src/app/chat/page.tsx` | Threads per-category placeholder into `ChatInput` | Task 2 |
| `tests/categories.test.ts` | NEW. Table-driven regression for category metadata + prompt injection | Task 1 |
| `TODO.md` | Mark Phase 2 #1 as shipped | Task 4 |

`src/components/ChatInput.tsx` is **not modified** — it already accepts `placeholder?: string` (default `此刻，你心中浮現的是什麼？`).
`src/lib/prompt-builder.ts` is **not modified** — it already reads `getCategory().strategy` and `.likelySegments` per category.

---

## Task 1: Categories metadata — extend, flip flags, regression test (TDD)

**Files:**
- Create: `tests/categories.test.ts`
- Modify: `src/lib/categories.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/categories.test.ts` with this exact content:

```ts
import { describe, it, expect } from 'vitest'
import { CATEGORIES } from '@/lib/categories'
import { buildPrompt } from '@/lib/prompt-builder'
import sutraDB from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'

describe('CATEGORIES metadata', () => {
  it('all 5 categories are enabled', () => {
    expect(CATEGORIES.length).toBe(5)
    expect(CATEGORIES.every((c) => c.enabled)).toBe(true)
  })

  it('every category has a non-empty placeholder', () => {
    for (const c of CATEGORIES) {
      expect(typeof c.placeholder).toBe('string')
      expect(c.placeholder.length).toBeGreaterThan(0)
    }
  })

  it.each(CATEGORIES.map((c) => [c.id, c] as const))(
    'system instruction for %s injects label, strategy, and every likelySegment',
    (_id, c) => {
      const payload = buildPrompt({
        category: c.id,
        history: [],
        userMessage: '測試',
        sutraDB: sutraDB as SutraSegment[],
        roundNumber: 1,
      })
      expect(payload.systemInstruction).toContain(c.label)
      expect(payload.systemInstruction).toContain(c.strategy)
      for (const seg of c.likelySegments) {
        expect(payload.systemInstruction).toContain(seg)
      }
    }
  )
})
```

- [ ] **Step 2: Run test to verify it fails (compile error on `placeholder`)**

Run: `pnpm test --run tests/categories.test.ts`

Expected: TypeScript compile error — `Property 'placeholder' does not exist on type 'CategoryMeta'`. The "non-empty placeholder" assertion would also fail at runtime, but compile error fires first.

- [ ] **Step 3: Extend `CategoryMeta` and update all 5 entries**

Replace `src/lib/categories.ts` entirely with:

```ts
import type { CategoryId } from '@/types/chat'

export interface CategoryMeta {
  id: CategoryId
  label: string
  presets: string[]
  strategy: string
  likelySegments: string[]
  enabled: boolean
  placeholder: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'emotion_relation',
    label: '情感與關係',
    presets: ['分手遺憾', '關係孤獨', '溝通耗竭'],
    strategy: '強化「心無罣礙」，引導使用者建立健康的心理邊界。',
    likelySegments: ['segment_4', 'segment_6'],
    enabled: true,
    placeholder: '什麼樣的關係讓你心裡放不下？',
  },
  {
    id: 'career_achievement',
    label: '職場與成就',
    presets: ['不甘心回報不足', '職涯迷茫', '同儕比較'],
    strategy: '解構「得失心」，強調「無所得」的過程價值。',
    likelySegments: ['segment_5'],
    enabled: true,
    placeholder: '工作上是什麼讓你不甘心？',
  },
  {
    id: 'self_existence',
    label: '自我與存在',
    presets: ['年齡焦慮', '生活空虛', '意義喪失'],
    strategy: '回歸「不生不滅」，打破對自我形象的固化執著。',
    likelySegments: ['segment_3'],
    enabled: true,
    placeholder: '你最近常問自己什麼？',
  },
  {
    id: 'health_pain',
    label: '健康與病痛',
    presets: ['長期疼痛', '死亡恐懼', '病後無法接受'],
    strategy: '實施「主客體分離」，觀察病痛而非成為病痛。',
    likelySegments: ['segment_1', 'segment_2'],
    enabled: true,
    placeholder: '身體哪裡不舒服？心裡又怎麼想？',
  },
  {
    id: 'sudden_emotion',
    label: '突發性情緒',
    presets: ['資訊過載', '莫名的憤怒或悲傷'],
    strategy: '利用「六根清淨」進行情緒阻斷，回歸當下覺知。',
    likelySegments: ['segment_4'],
    enabled: true,
    placeholder: '現在是什麼感覺先冒出來？',
  },
]

export function getCategory(id: CategoryId): CategoryMeta {
  const c = CATEGORIES.find((x) => x.id === id)
  if (!c) throw new Error(`Unknown category: ${id}`)
  return c
}

export function isCategoryEnabled(id: CategoryId): boolean {
  return getCategory(id).enabled
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run tests/categories.test.ts`

Expected: PASS — 3 tests, 7 cases (`it.each` expands the third over 5 categories).

- [ ] **Step 5: Run full test suite and typecheck**

Run: `pnpm exec tsc --noEmit && pnpm test --run`

Expected: clean typecheck; **72 tests passing** (65 previous + 7 new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/categories.ts tests/categories.test.ts
git commit -m "feat(categories): enable all 5 dilemma categories + per-category placeholders"
```

---

## Task 2: Thread per-category placeholder through `chat/page.tsx`

**Files:**
- Modify: `src/app/chat/page.tsx` (the `<ChatInput …>` JSX block, around line 143)

- [ ] **Step 1: Read current state of the JSX**

The current block looks like this:

```tsx
<ChatInput
  disabled={status === 'sending'}
  onSubmit={(text) => send(text)}
/>
```

`getCategory` is already imported in this file (used elsewhere for the round indicator and category label). Verify with: `pnpm exec grep -n "getCategory" src/app/chat/page.tsx` (or use the editor). If it isn't imported, add `import { getCategory } from '@/lib/categories'` to the imports block.

- [ ] **Step 2: Pass `placeholder` to `ChatInput`**

Edit `src/app/chat/page.tsx` and change the `<ChatInput …/>` JSX to:

```tsx
<ChatInput
  disabled={status === 'sending'}
  onSubmit={(text) => send(text)}
  placeholder={getCategory(category).placeholder}
/>
```

`category` is already in scope (it's the route param the page has been threading through `useChatSession`).

- [ ] **Step 3: Typecheck + run full test suite**

Run: `pnpm exec tsc --noEmit && pnpm test --run`

Expected: clean typecheck; 72 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/app/chat/page.tsx
git commit -m "feat(chat): per-category placeholder copy in ChatInput"
```

---

## Task 3: Manual smoke + reactive tuning (Kenny-driven)

**Files:** none initially. `src/lib/categories.ts` may be tuned reactively if any category regresses.

This task cannot be executed by a subagent (it requires a real Gemini API call and a human Zen-quality judgement). When delegating to a subagent, the subagent should produce the smoke-test checklist below as its deliverable and stop.

- [ ] **Step 1: Production-quality build sanity check**

Run: `pnpm exec tsc --noEmit && pnpm build`

Expected: clean typecheck, successful static export to `out/`.

- [ ] **Step 2: Start dev server**

Run: `pnpm dev:fresh`

Open http://localhost:3000 in a browser already holding a valid Gemini API key in IndexedDB (or paste one via `/setup` first).

- [ ] **Step 3: Verify all 5 tiles are interactive**

Navigate to `/categories`. Confirm:
- All 5 tiles are clickable (no greyed-out state on any tile).
- The "soon" / "尚未開放" overlay (if any) does not appear on the four newly-enabled tiles.

- [ ] **Step 4: Per-category smoke (4 newly-enabled categories)**

For each of `career_achievement`, `self_existence`, `health_pain`, `sudden_emotion`:

1. Tap the tile — route to `/chat?category=<id>`.
2. Confirm the placeholder text in `ChatInput` matches the spec (§6 of the design doc):
   - `career_achievement` → `工作上是什麼讓你不甘心？`
   - `self_existence` → `你最近常問自己什麼？`
   - `health_pain` → `身體哪裡不舒服？心裡又怎麼想？`
   - `sudden_emotion` → `現在是什麼感覺先冒出來？`
3. Send one message using one of the category's presets as input (or a small variation thereof).
4. Eyeball the AI reply for:
   - **Zen tone** — uses guided questions or awareness practices, NOT moralizing imperatives (`你應該`, `要學會`, `請記住`).
   - **Segment relevance** — the cited Sutra segment(s) make sense for the user's input.
   - **Schema validity** — reply renders correctly (segment reference, optional closing practice).
   - **Round counter** — advances from `觀照 (1/3)` to `照見 (2/3)` exactly once per successful reply.

- [ ] **Step 5: Sand-art smoke**

Go to `/history`. Verify the dissolve animation still works on a session from any of the new categories.

- [ ] **Step 6: Tune any regressions (conditional)**

If any category produces moralizing or off-topic output:

1. Note which category and the specific failure mode.
2. Edit `src/lib/categories.ts` — extend that one category's `strategy` text with a targeted guardrail (one sentence). Examples:
   - `health_pain`: append `避免承諾治癒，專注觀察過程。` if the AI promises healing.
   - `career_achievement`: append `不評斷工作的對錯，只觀察「不甘心」這個感受本身。` if it validates competition.
3. Re-run the smoke for that one category.
4. Commit:
   ```bash
   git add src/lib/categories.ts
   git commit -m "fix(categories): tune <category_id> strategy after smoke regression"
   ```
5. Repeat until that category passes.

- [ ] **Step 7: Stop dev server, sign off**

Stop dev server (`Ctrl+C`). Mark Task 3 complete only when all four newly-enabled categories pass the smoke checklist.

---

## Task 4: Mark Phase 2 #1 as shipped in TODO.md

**Files:**
- Modify: `TODO.md` (the `### 1. Other 4 dilemma categories` section)

- [ ] **Step 1: Replace the section**

Find this block in `TODO.md`:

```markdown
### 1. Other 4 dilemma categories
Wire up `career_achievement`, `self_existence`, `health_pain`, `sudden_emotion`. Each needs:
- Strategy block tuning in `prompt-builder.ts` (the metadata exists in `lib/categories.ts`; just flip `enabled: true`)
- Per-category AI quality smoke test (3 representative inputs each, eyeball Zen vs moralizing)
- Possibly per-category UI accent (different opening prompt placeholder?)
```

Replace with:

```markdown
### 1. Other 4 dilemma categories ✅ shipped 2026-05-07
Spec: `docs/superpowers/specs/2026-05-07-four-categories-design.md` · Plan: `docs/superpowers/plans/2026-05-07-four-categories-plan.md`
- `career_achievement`, `self_existence`, `health_pain`, `sudden_emotion` are all `enabled: true` in `src/lib/categories.ts`.
- Per-category placeholder copy lives on `CategoryMeta.placeholder` and is threaded into `ChatInput` via `chat/page.tsx`.
- `tests/categories.test.ts` regression-locks each category injecting label + strategy + likelySegments into the system instruction.
- Strategies remain verbatim from `AGENTS.md` §3 (any reactive tuning is recorded as separate `fix(categories): tune …` commits).
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs(todo): mark Phase 2 #1 four-categories as shipped"
```

---

## Self-review summary (run by author of this plan, not a separate task)

- **Spec coverage:**
  - §1 Goal — Tasks 1+2+3.
  - §2 Non-goals — none of the listed non-goals appear in any task.
  - §4 Architecture surface — Tasks 1, 2 cover all listed files; ChatInput correctly excluded.
  - §5.1 categories.ts — Task 1.
  - §5.2 ChatInput unchanged — confirmed in this plan's File Structure note.
  - §5.3 chat/page.tsx — Task 2.
  - §5.4 categories.test.ts — Task 1.
  - §6 Placeholder copy — encoded in Task 1 step 3.
  - §7 Data flow — preserved by approach.
  - §8 Error handling (no new paths) — no error handling tasks needed.
  - §9 Testing — Task 1 (unit), Task 3 (manual smoke).
  - §10 Acceptance criteria — Tasks 1+2+3+4 collectively satisfy all six bullets.
- **Placeholder scan:** no "TBD", "TODO", or hand-wavy language; every code step shows the code.
- **Type consistency:** `CategoryMeta.placeholder` is `string` everywhere it appears; `placeholder` prop on `ChatInput` is `string | undefined`; `getCategory(category).placeholder` returns `string`. All match.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-07-four-categories-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task with two-stage review between.
2. **Inline Execution** — execute tasks in this session, batching with checkpoints.

Either way, **Task 3 must be run by Kenny** (real Gemini call + human Zen-quality judgement); subagents will produce the checklist as their deliverable and stop.

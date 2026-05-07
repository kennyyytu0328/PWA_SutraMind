# Design: Wire Up the Other Four Dilemma Categories

**Date:** 2026-05-07
**Author:** Claude (collaborating with Kenny Tu)
**Status:** Approved (ready for implementation plan)
**Tracks:** TODO.md Phase 2 #1

---

## 1. Goal

Make all five dilemma categories from `AGENTS.md` §3 functional in the app, not just `emotion_relation`. After this change, the user can pick any of the five tiles on `/categories` and complete a 3-round Heart Sutra dialogue with category-appropriate strategy.

Categories being unlocked:

| `id` | 類別 (label) | Inference strategy |
|---|---|---|
| `career_achievement` | 職場與成就 | 解構「得失心」，強調「無所得」的過程價值 |
| `self_existence` | 自我與存在 | 回歸「不生不滅」，打破對自我形象的固化執著 |
| `health_pain` | 健康與病痛 | 實施「主客體分離」，觀察病痛而非成為病痛 |
| `sudden_emotion` | 突發性情緒 | 利用「六根清淨」進行情緒阻斷，回歸當下覺知 |

`emotion_relation` (情感與關係) is already enabled and continues to work as today.

## 2. Non-goals

- **No new prompt engineering.** Strategy text for each category is taken verbatim from AGENTS.md §3 (already in `src/lib/categories.ts`). If a category misbehaves under smoke test, we tune that one category's `strategy` field reactively, not pre-emptively.
- **No streaming, retry, or round-counter changes.** `useChatSession.ts`, `lib/gemini.ts`, `lib/db.ts` are untouched.
- **No category-specific opening AI greeting.** Considered as option C in brainstorming and rejected as scope creep.
- **No new components.** `CategoryGrid` already respects `enabled`; `ChatInput` only gains an optional prop.

## 3. Approach summary

The brainstorming session settled on three choices:

- **Scope:** Trust-the-spec flip — keep AGENTS.md strategies verbatim, ship, then iterate per-category only if quality regresses (option A in Q1).
- **UI accent:** Per-category placeholder text in the chat input box (option B in Q2).
- **Test:** Manual smoke + table-driven prompt-builder unit test (option C in Q3).

## 4. Architecture

Pure presentation-and-data change. No `lib/` logic moves. The change surface is:

```
src/lib/categories.ts            (extend metadata + flip flags)
src/app/chat/page.tsx            (pass per-category placeholder through)
tests/categories.test.ts         (NEW: table-driven metadata test)
```

`src/components/ChatInput.tsx` is unchanged — it already accepts the prop.

`prompt-builder.ts` already reads `getCategory(category).strategy` and `.likelySegments`, so unlocking the four categories is purely a metadata flip — no prompt code changes needed.

## 5. Component & file changes

### 5.1 `src/lib/categories.ts`

- Extend `CategoryMeta` interface with one new required field:
  ```ts
  placeholder: string
  ```
- Fill in `placeholder` for all 5 entries (see §6 for copy).
- Flip `enabled: true` for `career_achievement`, `self_existence`, `health_pain`, `sudden_emotion`.

### 5.2 `src/components/ChatInput.tsx`

**No change needed.** The component already accepts `placeholder?: string` with a sensible default (`此刻，你心中浮現的是什麼？`) and forwards it to the underlying `<textarea>`. Discovered during spec self-review — the wiring just isn't being driven from `chat/page.tsx` yet.

### 5.3 `src/app/chat/page.tsx`

- Read `getCategory(category).placeholder` and pass to `<ChatInput placeholder={...} />`. Single-line change.

### 5.4 `tests/categories.test.ts` (NEW)

Table-driven test covering all 5 categories. Three `describe`-level checks:

1. All 5 categories are `enabled`.
2. Every category has a non-empty `placeholder`.
3. For each category, `buildPrompt({ category, ... })`'s `systemInstruction` contains:
   - the category's `label`
   - the category's `strategy` text
   - each id in `likelySegments`

This is the regression net for "strategy block correctly injects per category." It does NOT verify Zen quality — only that the metadata flows through.

## 6. Per-category placeholder copy

| `id` | Placeholder |
|---|---|
| `emotion_relation` | 什麼樣的關係讓你心裡放不下？ |
| `career_achievement` | 工作上是什麼讓你不甘心？ |
| `self_existence` | 你最近常問自己什麼？ |
| `health_pain` | 身體哪裡不舒服？心裡又怎麼想？ |
| `sudden_emotion` | 現在是什麼感覺先冒出來？ |

Voice: gentle, present-tense, sensory-or-relational. Avoids 你應該 / 要學會 / 請描述 imperatives.

## 7. Data flow

```
CATEGORIES (categories.ts)
  ├──→ CategoryGrid          (renders 5 tiles, all enabled)
  ├──→ chat/page.tsx
  │      └──→ ChatInput       (placeholder prop)
  └──→ prompt-builder.ts
         └──→ buildCategoryStrategyBlock  (reads .strategy + .likelySegments,
                                           UNCHANGED)
```

## 8. Error handling

No new error paths. Existing `GeminiError` classification (`RATE_LIMITED`, `INVALID_KEY`, `SAFETY_BLOCKED`, `UNKNOWN`) covers every category identically. `getCategory()` already throws on unknown id; that path is unchanged.

**Anticipated edge case (not pre-emptively guarded):** Gemini's safety filter may behave differently for `health_pain` (death, pain, illness keywords). If smoke test surfaces a `SAFETY_BLOCKED` result, we tune `strategy` text or the user's input phrasing reactively.

## 9. Testing strategy

- **Unit:** `tests/categories.test.ts` (NEW) — 3 tests, `.each` expanding to 5 sub-cases on the third = **7 new test cases** (1 + 1 + 5). Suite reaches **72** total (currently 65).
- **Component:** none. Per CLAUDE.md, component tests are skipped at this stage; the placeholder prop is too thin to break that pattern.
- **Manual smoke:** Kenny runs `pnpm dev:fresh`, then for each of the 4 newly-enabled categories: picks the tile, sends one message using a preset as input, eyeballs the AI reply for Zen vs moralizing tone, segment-reference relevance. Verifies placeholder text is per-category. Reports any regressions per-category for tuning.

## 10. Acceptance criteria

- [ ] All 5 tiles in `/categories` are interactive (no greyed-out state).
- [ ] Each newly-enabled category routes to `/chat?category=<id>` and accepts input.
- [ ] `ChatInput` shows the category-specific placeholder before the user types.
- [ ] All 72 unit tests pass; clean typecheck; clean static export.
- [ ] Manual smoke: at least one preset-driven message per newly-enabled category produces a Zen-toned, schema-valid AI reply that cites relevant segment(s). Subjective quality judged by Kenny.
- [ ] Any category that fails the manual smoke is tuned in `categories.ts:strategy` and re-smoked before merge to `main`.

## 11. Out of scope (for follow-up backlog)

- Per-category opening AI greeting (option C in Q2 — rejected).
- Per-category UI accent color or iconography.
- Per-category round count (currently hardcoded to 3).
- LLM-evaluator-driven Zen-quality tests (would need a separate eval harness; deferred).

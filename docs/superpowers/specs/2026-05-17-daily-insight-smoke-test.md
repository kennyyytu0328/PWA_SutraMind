# Phase 3-C — Daily Insight Manual Smoke Test Guide

**Date:** 2026-05-17
**Feature:** Daily Insight (今日靜觀) card on `/mirror`
**Branch:** `feature/daily-insight`
**Spec:** `2026-05-17-daily-insight-design.md`

Run all 7 steps in a real browser before merging. Tick the boxes as you go.

---

## Setup

```powershell
# from repo root
pnpm dev
```

Open http://localhost:3000 (or whatever port the dev server prints). Open devtools (F12). You'll be jumping between the **Application** tab (for IndexedDB), the **Network** tab (for offline simulation), and the **Rendering** tab (for `prefers-reduced-motion`).

**Helper console one-liners** — paste in the devtools Console as needed:

```js
// Wipe the entire database (fresh-install state)
indexedDB.deleteDatabase('SutraMindDB')
// then refresh the page

// Clear ONLY today's insight (without touching analytics)
(async () => {
  const req = indexedDB.open('SutraMindDB')
  req.onsuccess = () => {
    const db = req.result
    const tx = db.transaction('dailyInsight', 'readwrite')
    tx.objectStore('dailyInsight').clear()
    tx.oncomplete = () => console.log('dailyInsight cleared')
  }
})()
```

You'll need a valid Gemini API key already saved (from `/setup`) for steps 2, 3, 4.

---

## Step 1 — Empty state (no analytics yet)

- [ ] Wipe the database (console snippet above) + refresh the page.
- [ ] You should land on `/setup` (route guard). Paste a valid Gemini API key.
- [ ] Navigate directly to `/mirror`.

**Expected:** The existing `EmptyMirror` view appears (「映照本週執著之分布 / 暫無紀錄」). The new `DailyInsightCard` does **not** render in this branch (intentional — the card lives only on the populated `/mirror` view).

---

## Step 2 — Ready state (analytics exist, no insight today)

- [ ] From `/categories`, pick any category and complete **one full 3-round chat session**. The analytics pipeline fires fire-and-forget after the 3rd round.
- [ ] Wait ~5 seconds for the Gemma analytics extraction to land in IndexedDB. You can confirm via devtools → Application → IndexedDB → `SutraMindDB` → `analytics` → a row for today should exist.
- [ ] Navigate to `/mirror`.

**Expected:**
- A new gold-frame card sits at the top of the page, above `AttachmentIndex`.
- It shows: lotus glyph, `今日靜觀` title, and a single 「請示今日靜觀」 button with a gold-accent outline.
- No reflection text visible yet.
- Below the card, the usual `AttachmentIndex` / `RadarPanel` / `TrendPanel` render as before — verify they look unchanged.

---

## Step 3 — Live reveal (tap-to-request happy path)

- [ ] Click 「請示今日靜觀」.

**Expected (in order):**
1. The button disappears immediately. A 5-second `BreathingLoader` (soft-glow circle pulsing) replaces it.
2. After Gemma responds (typically 3–8 seconds), the card transitions to the **shown** state:
   - Sutra original line (serif font, wide letter-spacing `tracking-[0.5em]`).
   - A 60px gold hairline divider with 0.4 opacity.
   - Reflection prose (30–60 zh-chars) animates char-by-char from left to right (ink-drop reveal). Each char fades in with a slight stagger.
   - A small lotus glyph closes the card.
3. The animation completes in ~1–3 seconds depending on text length.

**Watch for:**
- [ ] Sutra original line doesn't overflow the card on your viewport. If it wraps awkwardly (especially segment_5, which is 30 chars) note it — we may need to loosen `tracking-[0.5em]` to `tracking-[0.3em]` or add `break-words`.
- [ ] Reflection prose is grammatical, second-person 「你」, no exclamation marks, no obvious "AI-ese". This is a Zen-quality check, not a binary pass/fail — report anything that feels off-tone.
- [ ] No JS console errors during the animation.

---

## Step 4 — Static replay (same-day revisit)

- [ ] After step 3 completes, hard-refresh `/mirror` (Ctrl+Shift+R).

**Expected:**
- Same reflection appears, but **statically** — no char-by-char animation, no BreathingLoader.
- The card jumps straight to the **shown** state on first paint.
- Sutra original + hairline + prose + closing lotus all render at once.

If the reveal animates again on refresh, the `isFirstReveal` ref logic in `useDailyInsight` is misbehaving. That's a real bug — flag it.

- [ ] (Optional sanity check) In devtools console, run:

```js
(async () => {
  const req = indexedDB.open('SutraMindDB')
  req.onsuccess = () => {
    const db = req.result
    const tx = db.transaction('dailyInsight', 'readonly')
    tx.objectStore('dailyInsight').getAll().onsuccess = (e) => console.log(e.target.result)
  }
})()
```

You should see exactly one row with today's date, the segmentId Gemma's reflection was paired with, the dominant dim, the `metricsSnapshot`, and a `createdAt` timestamp.

---

## Step 5 — Network error path

- [ ] Clear today's insight row only (use the "Clear ONLY today's insight" console snippet from Setup). Refresh.
- [ ] Card should return to the **ready** state with the button.
- [ ] In devtools → Network tab, set throttling to **Offline**.
- [ ] Click 「請示今日靜觀」.

**Expected:**
- Brief BreathingLoader appears.
- After ~9–10 seconds (callGeminiRaw's internal retry: 3s + 5s + final fail), the loader disappears.
- Button reappears with a muted line below it: 「網路未連線，稍後再試」.
- **No row** is written to `dailyInsight` (verify with the console snippet from step 4 — should return `[]`).

Restore network throttling to **Online** before continuing.

(Optional: also test the **invalid API key** path by going to `/setup`, temporarily replacing the key with `AIza-bogus-key`, returning to `/mirror`, and tapping the button. Expected message: 「API 金鑰無效，請至設定更新（前往設定）」 with an underlined link to `/setup`. Restore your real key when done.)

---

## Step 6 — Reduced motion

- [ ] Tap the button again (with network restored and a valid key) to get a fresh reflection. Verify it animates normally.
- [ ] Clear today's insight row again. Refresh.
- [ ] In devtools, open **Rendering** tab: ⋮ menu → More tools → Rendering. Scroll down to **Emulate CSS media feature `prefers-reduced-motion`** and set it to `reduce`.
- [ ] Click 「請示今日靜觀」.

**Expected with reduced motion:**
- BreathingLoader appears as a **static** gold glow (no 5s pulse).
- When the reflection lands, prose appears **instantly** as one block — no char-by-char ink-drop.
- Sutra original + hairline + lotus all render normally; only the motion is suppressed.

Reset the rendering override to `(none)` when done.

---

## Step 7 — Date rollover

The proper test is to wait until midnight local time, but you can simulate it:

- [ ] In devtools console, clear the `dailyInsight` table (snippet from Setup).
- [ ] Refresh `/mirror`.

**Expected:**
- Card returns to the **ready** state with the button.
- (You can tap and get a fresh insight; the new row should have today's date.)

This proves the liveQuery key (`todayLocalISO()`) is the only thing gating the **shown → ready** transition. When the date string changes (whether via clock or via row deletion), the card resets.

(If you want to test actual midnight rollover: change your system clock to one minute before midnight, wait, then watch the card behaviour. Restore the clock afterwards. Optional — not strictly required.)

---

## Pass criteria

All 7 steps complete without:

- [ ] JS console errors in any state
- [ ] Visual regressions on the rest of `/mirror` (AttachmentIndex / RadarPanel / TrendPanel must render identically to before this feature)
- [ ] Layout overflow on a mobile-width viewport (≤ 375px) — check at least step 3's `shown` state
- [ ] Off-tone reflection prose (3rd person, exclamation marks, productivity-app voice)

If everything looks right: report back and I'll invoke the merge workflow. If anything fails, report what you saw — most issues are one-line fixes in the card or hook.

---

## Quick reference: known not-yet-tested edge cases

These are documented as "not blocking merge" per the spec but worth poking at if you have time:

- **Rapid double-tap** the button before the BreathingLoader appears. The pipeline's same-day guard should prevent a duplicate Gemini call. The UI may show 2 quick state flips (`ready → requesting → requesting`) — that's fine; the guard is on the data layer, not the click handler.
- **Rate limit** is hard to hit on Gemini's free tier — skip this case unless you happen to trigger it naturally.
- **Mid-request route navigation** (tap button → immediately click 歷史 nav link). Should not crash; the pending fetch resolves into thin air. Card on return to `/mirror` should show whichever state matches: if Gemini wrote a row before navigation, **shown**; otherwise **ready**.

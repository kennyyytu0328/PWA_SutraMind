# Preview-First Onboarding — Design

**Date:** 2026-05-29
**Status:** Approved (design), pending implementation plan
**Topic:** Let visitors experience the space before being asked for a Gemini API key.

## Problem

The single biggest adoption barrier is the BYOK wall. Today an un-keyed visitor
hits `src/app/page.tsx`, which immediately `router.replace('/setup')` — they can
do *nothing* until they leave to Google AI Studio, fetch a key, and come back.
The likely audience (people seeking the Heart Sutra to sit with emotional
difficulty) is largely non-technical; "go get an API key first" kills the funnel
before any value is felt.

This is a hard constraint, not a bug: BYOK + client-only is the soul of the app
(see `CLAUDE.md` → "Things to NOT do"). We cannot add a backend or a shared demo
key. So the fix is **value before friction** — let people *feel* the space, then
invite the key.

## Goal

New funnel for a first-time, un-keyed visitor:

```
/  (welcome landing)  →  /preview (pick an agony, watch a real conversation)  →  /setup (add key)
```

Returning (keyed) visitors are **unaffected** — `/` still auto-advances them to
`/categories`. No friction is added to anyone who already onboarded.

## Non-goals (YAGNI)

- All five categories. We ship **three** curated conversations (情感與關係,
  職場與成就, 自我與存在); the data module is trivial to expand to the
  remaining two later.
- Interactive "tap-to-reveal" *within* a conversation. Each conversation is a
  **passive replay**. (The visitor does pick *which* conversation — a chooser,
  not an in-conversation branch.)
- Any "try a real prompt without a key." That needs the API; out of scope.
- Encrypting / changing key storage. Untouched.

## Decisions (locked with user)

| Decision | Choice |
|---|---|
| Canned content scope | **Three curated samples** — 情感與關係 (分手遺憾), 職場與成就 (為生活奔波), 自我與存在 (意義喪失) |
| Preview interaction | **Passive replay** (bloom-on-scroll), visitor picks which conversation |
| Entry point | **New welcome landing at `/`** |

## Routing

- **`/` (`src/app/page.tsx`) becomes the welcome landing.** Preserve the two
  existing behaviors: the `abandonStaleActiveSessions()` cleanup on mount, and
  the `apiKey → router.replace('/categories')` redirect. The *only* change: when
  `!apiKey` (and not loading), **render the welcome landing** instead of
  `router.replace('/setup')`. While `loading`, keep showing the existing breath
  loader so we never flash the landing at a returning user.
- **New `/preview` route** (`src/app/preview/page.tsx`) — public, never gated by
  key. Plain client page, no route params → static-export safe.
- `/setup` — unchanged.

## Welcome landing (`/` for un-keyed visitors)

A calm, centered composition built entirely from the existing design system —
serif title, `zen-*` tokens, a `LotusGlyph`, generous whitespace. The global
`AppHeader` (lotus + 心經數位道場 + ambient-audio toggle; **no nav links**) and the
`zen-mount-fade` on `<main>` already apply, so the page inherits the ritual feel
for free.

Content (final copy TBD during implementation, drafted here):

- A short framing line — about sitting with difficulty, **not** a feature list.
  Draft: 「心有罣礙時，與心經對坐片刻。」
- Two CTAs:
  - **預覽體驗** → `/preview` — secondary / outline style.
  - **開始** → `/setup` — primary `zen-glow-button`.

If `page.tsx` grows busy, the landing UI is extracted to
`src/components/WelcomeLanding.tsx` (per the many-small-files convention).

## Preview page (`/preview`)

The page mirrors the **real product journey** (choose a difficulty → converse),
but with no key and no network:

1. **Chooser (default state).** A short line + **three tiles** — one per curated
   conversation (情感與關係 / 職場與成就 / 自我與存在) — styled in the existing
   gold-frame visual language (reuse `CategoryGrid`'s tile look; the chooser is a
   thin variant that maps to preview conversations rather than `createSession`).
   The visitor picks the agony closest to theirs.
2. **Replay (after selection).** The chosen **3-round conversation** renders with
   the **real `ChatMessage` components** in **`revealMode="replay"`** — the exact
   bloom-on-scroll behavior `/history/detail` already uses. As the visitor
   scrolls, each turn blooms in: a "recorded sit." Reuses a battle-tested path
   and honors `useReducedMotion` for free (no new animation surface).
3. **Close.** A `<PreviewClosing />` gold-frame CTA panel: **開始你的對話**
   (`zen-glow-button` → `/setup`) plus a quiet **看看其他困境** that returns to the
   chooser, and **返回** → `/`.

Each assistant turn carries real `referencedSegmentIds` (→ `SegmentReference`
renders automatically) and a `closingPractice`, so the preview showcases the
**full ritual**, not a stripped chat.

Structure:

```
AppHeader (global)
  ← 返回 (quiet link to /)
  ── chooser state ──
  [short framing line]
  3 × preview tile (gold-frame)         → select → replay state
  ── replay state ──
  [chosen category label]
  ChatMessage × 6 (3 user + 3 assistant), revealMode="replay"
  <PreviewClosing />   ← 開始你的對話 / 看看其他困境
```

Selection lives in local component state (`useState<CategoryId | null>`); no
routing change per pick, so it stays a single static page.

### Approach considered (preview replay mechanism)

- **(A) Reuse `revealMode="replay"`** — RECOMMENDED. Matches "passive replay,"
  reuses the `/history/detail` path, zero new timing/reduced-motion logic.
- (B) Scripted auto-advance timeline on timers — more "alive," but net-new
  animation surface and reduced-motion handling for marginal gain.
- (C) Static render-all (`revealMode="static"`) — simplest, but loses the
  replay feel the user asked for.

Chosen: **(A)**.

## Canned content

Lives in a new typed data module **`src/data/preview-conversation.ts`**, exporting
a typed constant so it is type-checked against the `ChatMessage` shape:

```ts
import type { CategoryId, ChatMessage } from '@/types/chat'

export interface PreviewConversation {
  category: CategoryId
  subject: string                 // short label for the chooser tile, e.g. 分手遺憾
  messages: ChatMessage[]
}

export const PREVIEW_CONVERSATIONS: PreviewConversation[] = [ /* 3 entries */ ]
```

- It only **references** segment ids; it does **not** touch `sutra-db.json`
  (canonical). `SegmentReference` resolves ids via the existing `sutra.ts` lookup.
- Authored to match real `prompt-builder` output: plain Chinese, **no** sutra
  original characters in the body (the UI renders those from the ids), ≤ ~180
  characters per reply, calm/forward-looking, **never** moralizing (no 你應該 /
  要學會 / 請記住 / 時間會治癒), ending in a reflective question or tiny practice;
  the final round ends with one <30s present-moment practice + a brief blessing.
- `timestamp` fields use fixed deterministic values (not rendered by
  `ChatMessage`, but required by the type).

### Drafted conversation 1 — `emotion_relation` 情感與關係 · subject 分手遺憾

> Strategy: 強化「心無罣礙」，引導建立健康心理邊界. Likely segments: `segment_4`, `segment_6`.

**Round 1**
- **User:** 我們分開三個月了，但我還是每天想著如果當初多做一點，是不是就不會走到這一步。
- **Assistant** — `referencedSegmentIds: ["segment_6"]`
  - body: 你反覆回到「如果當初」，是心還握著一個「本該擁有」的版本。當我們不再認定自己失去了某樣本該屬於你的東西，牽掛才有鬆開的縫隙。那段關係給過的溫度是真實的，它的結束，並不抵銷它曾經存在。
  - `closingPractice`: 試著問自己：此刻放不下的，是那個人，還是那個「我本可以更好」的自己？

**Round 2**
- **User:** 可能是後者吧。我一直覺得是我不夠好，才讓他離開。
- **Assistant** — `referencedSegmentIds: ["segment_3"]`
  - body: 「我不夠好」是一個很重的標籤，但它不是事實，只是心在離別後替自己寫下的註解。一段關係的結束，並不會讓你這個人減少一分。他的離開，是兩個人、無數因緣的流動，不是對你價值的判決。
  - `closingPractice`: 把「是我不夠好」換成「這段關係結束了」，在心裡各默念一次，感受兩者重量的不同。

**Round 3 (final)**
- **User:** 這樣想，胸口好像鬆了一點。但我還是會怕，怕自己再也遇不到這樣的人。
- **Assistant** — `referencedSegmentIds: ["segment_6"]`
  - body: 「怕再也遇不到」，是心替還沒發生的未來先預支了恐懼。恐懼往往不來自現實，而來自我們緊抓著的想像。你此刻是完整的，不必靠一段尚未到來的關係來證明自己。
  - `closingPractice`: 現在，把一隻手放在胸口，做三次緩慢的呼吸，每一次吐氣時，輕輕對自己說「我在這裡，我是完整的」。願你在來去之間，安住於不曾離開的自己。

### Drafted conversation 2 — `career_achievement` 職場與成就 · subject 為生活奔波

> Strategy: 解構「得失心」，強調「無所得」的過程價值. Likely segment: `segment_5`.
> Premise (per user): most people don't work toward promotion or raises —
> they work to cover living costs, the home loan, the car loan. There is no
> "greater goal," just the treadmill of necessity. The 房貸/車貸 *are* 罣礙
> (weights hung on the mind). Honor the burden as real; soften only the
> mind's perpetual clenching around it. Never moralize ("money isn't
> everything", "find your passion").

**Round 1**
- **User:** 其實我每天上班，不是為了什麼理想或升遷。就是房貸、車貸、生活費……不工作不行。久了覺得自己只是在為錢活著，很累，也很空。
- **Assistant** — `referencedSegmentIds: ["segment_6"]`
  - body: 你說的累，不只是身體的累，是心被「不工作不行」這句話，日夜懸著的累。心經裡「罣礙」二字，說的正是這種懸在心上、放不下的重量。帳單是真實的，這份責任也值得被尊重——但壓著你的，也許不只是數字，而是那份「永遠不能停」的緊繃。
  - `closingPractice`: 試著分辨：此刻讓你喘不過氣的，是這個月真實要付的數字，還是那個「萬一停下來怎麼辦」的念頭？

**Round 2**
- **User:** 大概是後者。我好像很久沒有「不擔心」過了，連休息的時候都在想錢。
- **Assistant** — `referencedSegmentIds: ["segment_4"]`
  - body: 「連休息時都在想錢」，是心已經習慣把未來的擔憂，預支到此刻。但你會發現，此刻的你其實是安全的——這一秒，沒有任何帳單正在追討你。心可以練習，在這樣的一秒裡短暫地放下。不是放下責任，是放下「無時無刻都得扛著」的姿勢。
  - `closingPractice`: 現在，給自己十秒，什麼都不解決，只是感覺呼吸進出。讓「想錢」的念頭來了又走，你只是看著它。

**Round 3 (final)**
- **User:** 原來我把「擔心錢」當成了責任感，好像不擔心，就是不負責任。
- **Assistant** — `referencedSegmentIds: ["segment_5"]`
  - body: 你看見了很重要的一件事：擔心，並不會多付清一分錢，它只是讓你在付出勞力之外，又多付了一份心力。真正負責任的，是你每天踏實的行動，不是你緊鎖的眉頭。「無所得」不是要你不在乎，而是：盡了力之後，把結果輕輕交出去，讓心有一道喘息的縫隙。
  - `closingPractice`: 現在，鬆開你的肩膀，做三次深呼吸，每一次吐氣，想像把一點點重量，交還給腳下的大地。願你在為生活奔忙之餘，也為自己留一處，安放那個不必扛著任何東西的你。

### Drafted conversation 3 — `self_existence` 自我與存在 · subject 意義喪失

> Strategy: 回歸「不生不滅」，打破對自我形象的固化執著. Likely segment: `segment_3`.

**Round 1**
- **User:** 最近什麼事都提不起勁。日子一天天過，卻覺得很空，好像活著只是在重複，沒有意義。
- **Assistant** — `referencedSegmentIds: ["segment_3"]`
  - body: 你說的「空」，和心經說的「空」，其實是兩種空。你感到的是「空虛」——像少了什麼；而經文裡的，是「空性」——萬物本就流動，沒有被固定的標籤。也許你不是失去了意義，而是一直在等一個「該有的意義」降臨，卻忘了意義從來不是被找到的，是被活出來的。
  - `closingPractice`: 回想今天，有沒有任何一個微小的瞬間——一口熱茶、一陣風、一句問候——讓你哪怕一秒，覺得「還好」？

**Round 2**
- **User:** 好像有，早上陽光照進來的時候。但這種小事，能算意義嗎？
- **Assistant** — `referencedSegmentIds: ["segment_2"]`
  - body: 你說「這種小事」，是心又急著用大小去秤量。但那道陽光讓你覺得「還好」的瞬間，是真實發生的——它不因為「小」就不算數。意義不是一個要去抵達的宏大答案，它就藏在這些你願意停下來感受的、微小而真實的當下裡。
  - `closingPractice`: 此刻環顧四周，找一樣你平常視而不見、卻一直都在的東西，安靜地看它三秒。

**Round 3 (final)**
- **User:** 原來我一直在等一個很大的答案，卻錯過了這些。
- **Assistant** — `referencedSegmentIds: ["segment_3"]`
  - body: 是的。「我的人生沒有意義」也是一個標籤，而標籤可以被輕輕放下。你不曾真的空無一物——只是太久沒有停下來，看看自己其實一直擁有的。日子的重複裡，也藏著只屬於你的、不生不滅的此刻。
  - `closingPractice`: 現在，把雙手覆在心口，感受它一直在跳動——這就是你活著、且完整的證明。做一次深呼吸。願你在平凡的每一天裡，都遇見那個不必被定義、也已圓滿的自己。

## Components added / changed

| Path | Change |
|---|---|
| `src/app/page.tsx` | Render welcome landing when `!apiKey`; keep cleanup + keyed redirect |
| `src/app/preview/page.tsx` | NEW — chooser state + replay state + closing CTA (local `useState`) |
| `src/components/PreviewClosing.tsx` | NEW — small gold-frame CTA panel (開始你的對話 → /setup; 看看其他困境 → chooser) |
| `src/components/WelcomeLanding.tsx` | NEW *(only if `page.tsx` gets busy)* — landing UI |
| `src/data/preview-conversation.ts` | NEW — `PREVIEW_CONVERSATIONS` (3 typed conversations) |

## Testing

- **Unit test** (fits the existing `sutra.ts` validation style), new file
  `tests/preview-conversation.test.ts`, iterating **all three** conversations:
  - every `referencedSegmentId` resolves via `getSegmentById(SUTRA_DB, id)`
    (catches a typo'd id → broken reference);
  - each conversation has exactly 3 user + 3 assistant turns in alternating order;
  - each `category` is a valid, enabled `CategoryId`.
- **Manual browser smoke** (matches the project's "component tests skipped"
  convention): un-keyed `/` shows the landing (not a redirect to `/setup`);
  預覽體驗 → `/preview` shows the 3-tile chooser; picking one replays with
  bloom-on-scroll; 看看其他困境 returns to the chooser; 開始你的對話 → `/setup`;
  a keyed visitor still auto-advances `/` → `/categories`; reduced-motion shows
  the conversation without animation.

## Risks / notes

- **Content quality is the whole point** — these three conversations are the
  first impression. The drafts above are for user review before they ship.
- The welcome landing must not flash for returning users: gate it behind
  `!loading && !apiKey`, keep the breath loader while `loading`.
- `/preview` being public is intentional and consistent with the privacy model
  (no key, no network, no data).

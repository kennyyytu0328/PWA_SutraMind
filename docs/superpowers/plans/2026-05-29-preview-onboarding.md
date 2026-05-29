# Preview-First Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an un-keyed visitor land on a calm welcome page, watch a real (canned) Heart-Sutra conversation in the category that matches their difficulty, and only then be invited to add a Gemini API key.

**Architecture:** Three new pieces plus one edit. A pure typed data module holds three hand-authored conversations. `/` renders a welcome landing instead of redirecting un-keyed visitors to `/setup` (keyed visitors still auto-advance to `/categories`). A new public `/preview` route shows a 3-tile chooser → bloom-on-scroll replay (reusing the existing `ChatMessage` + `revealMode="replay"` path) → a gold-frame CTA back to `/setup`. No backend, no network, no key required — consistent with the BYOK/client-only hard rules.

**Tech Stack:** Next.js 14 (App Router, static export), React 18, TypeScript, Tailwind (`zen-*` tokens + `gold-frame`/`zen-glow-button`), Vitest. Spec: `docs/superpowers/specs/2026-05-29-preview-onboarding-design.md`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/data/preview-conversation.ts` | NEW. `PreviewConversation` type + `PREVIEW_CONVERSATIONS` (3 typed conversations). Pure data. |
| `tests/preview-conversation.test.ts` | NEW. Validates the data: count, category validity, turn order, segment-id resolution. |
| `src/components/WelcomeLanding.tsx` | NEW. The `/` landing UI (hero line + 預覽體驗 / 開始 CTAs). |
| `src/app/page.tsx` | MODIFY. Render `WelcomeLanding` when `!apiKey`; keep stale-session cleanup + keyed redirect. |
| `src/components/PreviewClosing.tsx` | NEW. Gold-frame CTA panel (開始你的對話 → `/setup`; 看看其他困境 → chooser). |
| `src/app/preview/page.tsx` | NEW. Chooser state + replay state (local `useState`). |

Conventions to honor (from `CLAUDE.md`): page-level titles use `<h2>` (global `AppHeader` owns the `<h1>`); use `zen-*` tokens, `gold-frame`, `zen-glow-button`, `LotusGlyph` (never mount a second `LotusSymbol`); Zen vocabulary, no native dialogs.

---

## Task 1: Preview conversation data module

**Files:**
- Create: `src/data/preview-conversation.ts`
- Test: `tests/preview-conversation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/preview-conversation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PREVIEW_CONVERSATIONS } from '@/data/preview-conversation'
import { getSegmentById } from '@/lib/sutra'
import { isCategoryEnabled } from '@/lib/categories'
import sutraDb from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'

const SUTRA_DB = sutraDb as SutraSegment[]

describe('preview conversations', () => {
  it('ships exactly three conversations', () => {
    expect(PREVIEW_CONVERSATIONS).toHaveLength(3)
  })

  it('each has a valid, enabled category', () => {
    for (const c of PREVIEW_CONVERSATIONS) {
      expect(isCategoryEnabled(c.category)).toBe(true)
    }
  })

  it('each has a non-empty subject label', () => {
    for (const c of PREVIEW_CONVERSATIONS) {
      expect(c.subject.length).toBeGreaterThan(0)
    }
  })

  it('each has 3 user + 3 assistant turns in alternating order', () => {
    for (const c of PREVIEW_CONVERSATIONS) {
      const roles = c.messages.map((m) => m.role)
      expect(roles).toEqual([
        'user',
        'assistant',
        'user',
        'assistant',
        'user',
        'assistant',
      ])
    }
  })

  it('every assistant turn references at least one segment that resolves', () => {
    for (const c of PREVIEW_CONVERSATIONS) {
      const assistants = c.messages.filter((m) => m.role === 'assistant')
      for (const m of assistants) {
        const ids = m.referencedSegmentIds ?? []
        expect(ids.length, `${c.category} assistant turn`).toBeGreaterThan(0)
        for (const id of ids) {
          expect(getSegmentById(SUTRA_DB, id), `${c.category}: ${id}`).toBeDefined()
        }
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/preview-conversation.test.ts`
Expected: FAIL — cannot resolve import `@/data/preview-conversation` (module does not exist yet).

- [ ] **Step 3: Write the data module**

Create `src/data/preview-conversation.ts`:

```ts
import type { CategoryId, ChatMessage } from '@/types/chat'

export interface PreviewConversation {
  category: CategoryId
  /** Short label shown on the chooser tile, e.g. 分手遺憾 */
  subject: string
  messages: ChatMessage[]
}

/**
 * Hand-authored sample conversations shown on /preview before a visitor adds an
 * API key. Content matches prompt-builder output rules: plain Chinese, no sutra
 * original characters in the body (the UI renders those from referencedSegmentIds),
 * never moralizing, final assistant turn ends with a <30s practice + a blessing.
 * Timestamps are deterministic placeholders — ChatMessage does not render them.
 */
export const PREVIEW_CONVERSATIONS: PreviewConversation[] = [
  {
    category: 'emotion_relation',
    subject: '分手遺憾',
    messages: [
      {
        role: 'user',
        content:
          '我們分開三個月了，但我還是每天想著如果當初多做一點，是不是就不會走到這一步。',
        timestamp: 1,
      },
      {
        role: 'assistant',
        content:
          '你反覆回到「如果當初」，是心還握著一個「本該擁有」的版本。當我們不再認定自己失去了某樣本該屬於你的東西，牽掛才有鬆開的縫隙。那段關係給過的溫度是真實的，它的結束，並不抵銷它曾經存在。',
        referencedSegmentIds: ['segment_6'],
        closingPractice:
          '試著問自己：此刻放不下的，是那個人，還是那個「我本可以更好」的自己？',
        timestamp: 2,
      },
      {
        role: 'user',
        content: '可能是後者吧。我一直覺得是我不夠好，才讓他離開。',
        timestamp: 3,
      },
      {
        role: 'assistant',
        content:
          '「我不夠好」是一個很重的標籤，但它不是事實，只是心在離別後替自己寫下的註解。一段關係的結束，並不會讓你這個人減少一分。他的離開，是兩個人、無數因緣的流動，不是對你價值的判決。',
        referencedSegmentIds: ['segment_3'],
        closingPractice:
          '把「是我不夠好」換成「這段關係結束了」，在心裡各默念一次，感受兩者重量的不同。',
        timestamp: 4,
      },
      {
        role: 'user',
        content: '這樣想，胸口好像鬆了一點。但我還是會怕，怕自己再也遇不到這樣的人。',
        timestamp: 5,
      },
      {
        role: 'assistant',
        content:
          '「怕再也遇不到」，是心替還沒發生的未來先預支了恐懼。恐懼往往不來自現實，而來自我們緊抓著的想像。你此刻是完整的，不必靠一段尚未到來的關係來證明自己。',
        referencedSegmentIds: ['segment_6'],
        closingPractice:
          '現在，把一隻手放在胸口，做三次緩慢的呼吸，每一次吐氣時，輕輕對自己說「我在這裡，我是完整的」。願你在來去之間，安住於不曾離開的自己。',
        timestamp: 6,
      },
    ],
  },
  {
    category: 'career_achievement',
    subject: '為生活奔波',
    messages: [
      {
        role: 'user',
        content:
          '其實我每天上班，不是為了什麼理想或升遷。就是房貸、車貸、生活費……不工作不行。久了覺得自己只是在為錢活著，很累，也很空。',
        timestamp: 1,
      },
      {
        role: 'assistant',
        content:
          '你說的累，不只是身體的累，是心被「不工作不行」這句話，日夜懸著的累。心經裡「罣礙」二字，說的正是這種懸在心上、放不下的重量。帳單是真實的，這份責任也值得被尊重——但壓著你的，也許不只是數字，而是那份「永遠不能停」的緊繃。',
        referencedSegmentIds: ['segment_6'],
        closingPractice:
          '試著分辨：此刻讓你喘不過氣的，是這個月真實要付的數字，還是那個「萬一停下來怎麼辦」的念頭？',
        timestamp: 2,
      },
      {
        role: 'user',
        content: '大概是後者。我好像很久沒有「不擔心」過了，連休息的時候都在想錢。',
        timestamp: 3,
      },
      {
        role: 'assistant',
        content:
          '「連休息時都在想錢」，是心已經習慣把未來的擔憂，預支到此刻。但你會發現，此刻的你其實是安全的——這一秒，沒有任何帳單正在追討你。心可以練習，在這樣的一秒裡短暫地放下。不是放下責任，是放下「無時無刻都得扛著」的姿勢。',
        referencedSegmentIds: ['segment_4'],
        closingPractice:
          '現在，給自己十秒，什麼都不解決，只是感覺呼吸進出。讓「想錢」的念頭來了又走，你只是看著它。',
        timestamp: 4,
      },
      {
        role: 'user',
        content: '原來我把「擔心錢」當成了責任感，好像不擔心，就是不負責任。',
        timestamp: 5,
      },
      {
        role: 'assistant',
        content:
          '你看見了很重要的一件事：擔心，並不會多付清一分錢，它只是讓你在付出勞力之外，又多付了一份心力。真正負責任的，是你每天踏實的行動，不是你緊鎖的眉頭。「無所得」不是要你不在乎，而是：盡了力之後，把結果輕輕交出去，讓心有一道喘息的縫隙。',
        referencedSegmentIds: ['segment_5'],
        closingPractice:
          '現在，鬆開你的肩膀，做三次深呼吸，每一次吐氣，想像把一點點重量，交還給腳下的大地。願你在為生活奔忙之餘，也為自己留一處，安放那個不必扛著任何東西的你。',
        timestamp: 6,
      },
    ],
  },
  {
    category: 'self_existence',
    subject: '意義喪失',
    messages: [
      {
        role: 'user',
        content:
          '最近什麼事都提不起勁。日子一天天過，卻覺得很空，好像活著只是在重複，沒有意義。',
        timestamp: 1,
      },
      {
        role: 'assistant',
        content:
          '你說的「空」，和心經說的「空」，其實是兩種空。你感到的是「空虛」——像少了什麼；而經文裡的，是「空性」——萬物本就流動，沒有被固定的標籤。也許你不是失去了意義，而是一直在等一個「該有的意義」降臨，卻忘了意義從來不是被找到的，是被活出來的。',
        referencedSegmentIds: ['segment_3'],
        closingPractice:
          '回想今天，有沒有任何一個微小的瞬間——一口熱茶、一陣風、一句問候——讓你哪怕一秒，覺得「還好」？',
        timestamp: 2,
      },
      {
        role: 'user',
        content: '好像有，早上陽光照進來的時候。但這種小事，能算意義嗎？',
        timestamp: 3,
      },
      {
        role: 'assistant',
        content:
          '你說「這種小事」，是心又急著用大小去秤量。但那道陽光讓你覺得「還好」的瞬間，是真實發生的——它不因為「小」就不算數。意義不是一個要去抵達的宏大答案，它就藏在這些你願意停下來感受的、微小而真實的當下裡。',
        referencedSegmentIds: ['segment_2'],
        closingPractice:
          '此刻環顧四周，找一樣你平常視而不見、卻一直都在的東西，安靜地看它三秒。',
        timestamp: 4,
      },
      {
        role: 'user',
        content: '原來我一直在等一個很大的答案，卻錯過了這些。',
        timestamp: 5,
      },
      {
        role: 'assistant',
        content:
          '是的。「我的人生沒有意義」也是一個標籤，而標籤可以被輕輕放下。你不曾真的空無一物——只是太久沒有停下來，看看自己其實一直擁有的。日子的重複裡，也藏著只屬於你的、不生不滅的此刻。',
        referencedSegmentIds: ['segment_3'],
        closingPractice:
          '現在，把雙手覆在心口，感受它一直在跳動——這就是你活著、且完整的證明。做一次深呼吸。願你在平凡的每一天裡，都遇見那個不必被定義、也已圓滿的自己。',
        timestamp: 6,
      },
    ],
  },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/preview-conversation.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/preview-conversation.ts tests/preview-conversation.test.ts
git commit -m "feat(preview): add curated preview conversations data + tests"
```

---

## Task 2: Welcome landing on `/`

No unit test — this is presentational UI, verified by manual browser smoke per the project's "component tests skipped" convention.

**Files:**
- Create: `src/components/WelcomeLanding.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the landing component**

Create `src/components/WelcomeLanding.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { LotusGlyph } from '@/components/Lotus'

export function WelcomeLanding() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center gap-10 text-center">
      <LotusGlyph className="w-16 h-16" />
      <div className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl tracking-[0.1em] leading-relaxed">
          心有罣礙時，與心經對坐片刻。
        </h2>
        <p className="text-zen-muted leading-loose tracking-[0.05em]">
          這裡沒有評分，沒有進度，只有一段陪你照見當下的對話。
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link
          href="/preview"
          className="border border-zen-accent/60 text-zen-accent px-6 py-3 rounded-md text-center tracking-widest hover:bg-zen-accent/10"
        >
          預覽體驗
        </Link>
        <Link href="/setup" className="zen-glow-button px-6 py-3 text-center">
          開始
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into `/`**

Replace the entire contents of `src/app/page.tsx` with:

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApiKey } from '@/hooks/useApiKey'
import { abandonStaleActiveSessions } from '@/lib/db'
import { WelcomeLanding } from '@/components/WelcomeLanding'

export default function HomePage() {
  const router = useRouter()
  const { apiKey, loading } = useApiKey()

  useEffect(() => {
    abandonStaleActiveSessions().catch(() => {})
  }, [])

  useEffect(() => {
    if (loading) return
    if (apiKey) router.replace('/categories')
  }, [apiKey, loading, router])

  // While loading, or when a key exists (redirect to /categories is in flight),
  // show the breath loader so the landing never flashes at a returning user.
  if (loading || apiKey) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-zen-accent/30 animate-breath" />
      </div>
    )
  }

  return <WelcomeLanding />
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke**

Run: `pnpm dev`, then in the browser with **no API key** stored (clear IndexedDB if needed via DevTools → Application → IndexedDB → delete the SutraMind DB):
- Visit `/` → see the welcome landing (lotus, 心有罣礙時… line, 預覽體驗 + 開始 buttons). NOT redirected to `/setup`.
- Click 開始 → lands on `/setup`.
- With a key already stored, visit `/` → breath loader briefly, then auto-redirect to `/categories` (landing must not flash).

- [ ] **Step 5: Commit**

```bash
git add src/components/WelcomeLanding.tsx src/app/page.tsx
git commit -m "feat(preview): welcome landing on / for un-keyed visitors"
```

---

## Task 3: Preview page (chooser → replay → CTA)

No unit test — presentational UI; the underlying data is already covered by Task 1. Verified by manual browser smoke.

**Files:**
- Create: `src/components/PreviewClosing.tsx`
- Create: `src/app/preview/page.tsx`

- [ ] **Step 1: Create the closing CTA panel**

Create `src/components/PreviewClosing.tsx`:

```tsx
'use client'
import Link from 'next/link'

interface Props {
  onSeeOthers: () => void
}

export function PreviewClosing({ onSeeOthers }: Props) {
  return (
    <section className="gold-frame p-6 text-center flex flex-col gap-5">
      <p className="text-zen-muted leading-loose tracking-[0.05em]">
        這是一段預先擬好的對話。當你準備好，便能與心經，展開屬於你自己的對坐。
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/setup" className="zen-glow-button px-6 py-3 text-center">
          開始你的對話
        </Link>
        <button
          type="button"
          onClick={onSeeOthers}
          className="border border-zen-muted/30 text-zen-muted px-6 py-3 rounded-md tracking-widest hover:border-zen-accent hover:text-zen-accent"
        >
          看看其他困境
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create the preview page**

Create `src/app/preview/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChatMessage } from '@/components/ChatMessage'
import { PreviewClosing } from '@/components/PreviewClosing'
import {
  PREVIEW_CONVERSATIONS,
  type PreviewConversation,
} from '@/data/preview-conversation'

function BackLink() {
  return (
    <Link
      href="/"
      className="text-sm text-zen-muted hover:text-zen-accent self-start"
    >
      ← 返回
    </Link>
  )
}

function PreviewChooser({
  onPick,
}: {
  onPick: (c: PreviewConversation) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-serif text-xl tracking-[0.1em]">
        哪一種，最靠近此刻的你？
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PREVIEW_CONVERSATIONS.map((c) => (
          <button
            key={c.category}
            type="button"
            onClick={() => onPick(c)}
            className="gold-frame p-6 text-center hover:bg-zen-accent/10"
          >
            <span className="font-serif text-lg text-zen-text tracking-widest">
              {c.subject}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PreviewReplay({
  conversation,
  onSeeOthers,
}: {
  conversation: PreviewConversation
  onSeeOthers: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-serif text-xl tracking-[0.1em]">
        {conversation.subject}
      </h2>
      <div className="flex flex-col gap-4">
        {conversation.messages.map((m, i) => (
          <ChatMessage key={i} message={m} revealMode="replay" />
        ))}
      </div>
      <PreviewClosing onSeeOthers={onSeeOthers} />
    </div>
  )
}

export default function PreviewPage() {
  const [picked, setPicked] = useState<PreviewConversation | null>(null)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <BackLink />
      {picked ? (
        <PreviewReplay conversation={picked} onSeeOthers={() => setPicked(null)} />
      ) : (
        <PreviewChooser onPick={setPicked} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke**

With `pnpm dev` running (no key required — `/preview` is public):
- Visit `/preview` → see 3 gold-frame tiles: 分手遺憾 / 為生活奔波 / 意義喪失.
- Tap 為生活奔波 → the 3-round conversation renders; assistant turns bloom in (ink-bloom), the 引用 segment toggle and closing-practice line appear after each bloom.
- Tap an 引用 toggle → the gold-frame sutra panel (original + vernacular) expands.
- Scroll to the bottom → 開始你的對話 (→ `/setup`) and 看看其他困境 (→ back to the 3 tiles).
- Toggle OS "reduce motion" and reload → conversation shows fully, no bloom animation.

- [ ] **Step 5: Commit**

```bash
git add src/components/PreviewClosing.tsx src/app/preview/page.tsx
git commit -m "feat(preview): /preview chooser, replay, and closing CTA"
```

---

## Task 4: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `pnpm test`
Expected: all suites pass, including the new `tests/preview-conversation.test.ts`.

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build (static export)**

Run: `pnpm build`
Expected: build succeeds; `out/preview/index.html` is generated (confirms `/preview` exports statically).

- [ ] **Step 4: End-to-end manual smoke (production build)**

Run: `pnpm dev:fresh` (cleans `.next`/`out` after the build, then dev) and walk the full funnel with no key:
`/` landing → 預覽體驗 → `/preview` chooser → pick one → replay → 開始你的對話 → `/setup`. Then add a key on `/setup` → `/categories`. Re-visit `/` → auto-redirects to `/categories` (no landing flash).

- [ ] **Step 5: Commit (only if Step 4 surfaced fixes)**

```bash
git add -A
git commit -m "fix(preview): address smoke-test findings"
```

---

## Self-Review notes (author)

- **Spec coverage:** routing change (Task 2), public `/preview` chooser+replay+CTA (Task 3), 3 curated conversations honoring voice rules (Task 1 data), segment-id + structure unit test (Task 1 test), static-export check (Task 4). All spec sections map to a task.
- **Type consistency:** `PreviewConversation { category, subject, messages }` defined in Task 1 is the exact shape imported in Tasks 1-test and 3. `revealMode="replay"` matches `InkDropMode`. `getSegmentById(db, id)` and `isCategoryEnabled(id)` signatures match `src/lib/sutra.ts` / `src/lib/categories.ts`.
- **No placeholders:** every code step contains complete content.

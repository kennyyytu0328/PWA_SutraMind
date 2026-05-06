# SutraMind PWA — Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the smallest end-to-end vertical slice of SutraMind PWA — BYOK Gemini chat with structured Sutra reference output, capped at 3 rounds, single category (情感與關係), with Dexie session persistence and a read-only History page.

**Architecture:** 100% client-side Next.js 14 (App Router, static export). All AI calls go directly browser → Gemini API using user-provided key. Sutra-DB bundled at build. Sessions persisted to IndexedDB via Dexie. Prompt assembly centralized in one pure module to maximize testability of the highest-leverage code.

**Tech Stack:** Next.js 14 + TypeScript + Tailwind CSS + Dexie.js + `@google/genai` SDK + Vitest + `fake-indexeddb` + pnpm.

**Spec:** `docs/superpowers/specs/2026-05-06-sutramind-walking-skeleton-design.md`

---

## Working environment notes

- Project root: `D:\MyWorkData\WebApp_Tools\SutraMind_PWA`
- Windows + PowerShell. The plan uses cross-platform commands (git, pnpm). When a Windows-only nuance matters, it's called out inline.
- Project is **not** a git repo yet. Task 1 initializes it.
- For each external library encountered (Next.js, Dexie, `@google/genai`, Tailwind, Vitest), the agent should run a `context7` lookup before writing non-trivial usage if uncertain, since SDK surfaces evolve.

---

## File map

```
SutraMind_PWA/
├── .gitignore                                  [Task 1]
├── package.json                                [Task 1]
├── pnpm-lock.yaml                              [Task 1]
├── tsconfig.json                               [Task 2]
├── next.config.mjs                             [Task 2]
├── postcss.config.js                           [Task 3]
├── tailwind.config.ts                          [Task 3]
├── vitest.config.ts                            [Task 4]
├── tests/setup.ts                              [Task 4]
├── src/
│   ├── data/sutra-db.json                      [Task 5]
│   ├── types/chat.ts                           [Task 6]
│   ├── lib/sutra.ts                            [Task 7]
│   ├── lib/categories.ts                       [Task 8]
│   ├── lib/db.ts                               [Task 9]
│   ├── lib/prompt-builder.ts                   [Tasks 10-12]
│   ├── lib/gemini.ts                           [Task 13]
│   ├── hooks/useApiKey.ts                      [Task 14]
│   ├── hooks/useSessions.ts                    [Task 14]
│   ├── hooks/useSession.ts                     [Task 15]
│   ├── components/                             [Tasks 16-18]
│   ├── styles/globals.css                      [Task 16]
│   └── app/                                    [Tasks 16-21]
├── tests/
│   ├── sutra.test.ts                           [Task 7]
│   ├── categories.test.ts                      [Task 8]
│   ├── db.test.ts                              [Task 9]
│   ├── prompt-builder.test.ts                  [Tasks 10-12]
│   └── gemini.test.ts                          [Task 13]
└── docs/superpowers/...                        (existing)
```

---

## Task 1: Initialize project + git + base dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git**

```bash
cd "D:/MyWorkData/WebApp_Tools/SutraMind_PWA"
git init
git add AGENTS.md docs
git commit -m "chore: initial commit (spec + plan)"
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
# deps
node_modules/
# next
.next/
out/
# env
.env*.local
.env
# misc
.DS_Store
*.log
# test
coverage/
# editor
.vscode/
.idea/
```

- [ ] **Step 3: Initialize pnpm + install runtime deps**

```bash
pnpm init
pnpm add next@14 react@18 react-dom@18 dexie dexie-react-hooks @google/genai
```

- [ ] **Step 4: Install dev deps**

```bash
pnpm add -D typescript @types/react @types/react-dom @types/node \
  tailwindcss postcss autoprefixer \
  vitest @vitest/ui fake-indexeddb jsdom
```

- [ ] **Step 5: Add scripts to `package.json`**

Edit `package.json` and ensure the `scripts` block reads exactly:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "chore: scaffold project with pnpm + base deps"
```

---

## Task 2: Configure TypeScript + Next.js (static export)

**Files:**
- Create: `tsconfig.json`
- Create: `next.config.mjs`

- [ ] **Step 1: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Write `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
}

export default nextConfig
```

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json next.config.mjs
git commit -m "chore: configure typescript + next static export"
```

---

## Task 3: Configure Tailwind with Zen palette

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`

- [ ] **Step 1: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zen: {
          bg: '#121212',
          surface: '#1E1E1E',
          text: '#EAE0D5',
          muted: '#8A8079',
          accent: '#C9A961',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'breath': 'breath 5s ease-in-out infinite',
      },
      keyframes: {
        breath: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.95)' },
          '50%': { opacity: '0.9', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Write `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts postcss.config.js
git commit -m "chore: configure tailwind with zen palette"
```

---

## Task 4: Configure Vitest with fake-indexeddb

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 2: Write `tests/setup.ts`**

```ts
import 'fake-indexeddb/auto'
```

- [ ] **Step 3: Smoke-test the runner with a trivial passing test**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `pnpm test`
Expected: `1 passed`. Then delete `tests/smoke.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/setup.ts
git commit -m "chore: configure vitest + fake-indexeddb"
```

---

## Task 5: Bundle Sutra-DB

**Files:**
- Create: `src/data/sutra-db.json`

- [ ] **Step 1: Create the data file**

Copy the 9-segment JSON array from `AGENTS.md` §核心靜態資料庫 verbatim into `src/data/sutra-db.json`. The file must start with `[` and end with `]`. Each object has keys: `id`, `original`, `vernacular`, `keywords`, `therapeutic_focus`. IDs are `segment_1` through `segment_9`.

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('src/data/sutra-db.json','utf8')).length)"
```

Expected: `9`

- [ ] **Step 3: Commit**

```bash
git add src/data/sutra-db.json
git commit -m "feat: bundle Sutra-DB (9 Heart Sutra segments)"
```

---

## Task 6: Define core types

**Files:**
- Create: `src/types/chat.ts`

- [ ] **Step 1: Write the types**

```ts
// src/types/chat.ts
export type CategoryId =
  | 'emotion_relation'
  | 'career_achievement'
  | 'self_existence'
  | 'health_pain'
  | 'sudden_emotion'

export type RoundNumber = 1 | 2 | 3

export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  referencedSegmentIds?: string[]
  closingPractice?: string | null
  timestamp: number
}

export interface Session {
  id?: number
  category: CategoryId
  startedAt: number
  endedAt?: number
  messages: ChatMessage[]
  status: SessionStatus
}

export interface ApiKeyRecord {
  id?: number
  value: string
  savedAt: number
}

export interface SutraSegment {
  id: string
  original: string
  vernacular: string
  keywords: string[]
  therapeutic_focus: string
}

export interface GeminiStructuredResponse {
  referenced_segment_ids: string[]
  response_text: string
  closing_practice: string | null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/chat.ts
git commit -m "feat: define core chat / session / sutra types"
```

---

## Task 7: Sutra helpers (TDD)

**Files:**
- Test: `tests/sutra.test.ts`
- Create: `src/lib/sutra.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/sutra.test.ts
import { describe, it, expect } from 'vitest'
import sutraDB from '@/data/sutra-db.json'
import { getSegmentById, validateSegmentIds, isKnownSegmentId } from '@/lib/sutra'
import type { SutraSegment } from '@/types/chat'

const db = sutraDB as SutraSegment[]

describe('sutra helpers', () => {
  it('getSegmentById returns the matching segment', () => {
    const s = getSegmentById(db, 'segment_4')
    expect(s).toBeDefined()
    expect(s?.id).toBe('segment_4')
    expect(s?.original).toMatch(/眼耳鼻舌身意/)
  })

  it('getSegmentById returns undefined for unknown id', () => {
    expect(getSegmentById(db, 'segment_99')).toBeUndefined()
  })

  it('isKnownSegmentId returns true for valid ids', () => {
    expect(isKnownSegmentId(db, 'segment_1')).toBe(true)
    expect(isKnownSegmentId(db, 'segment_99')).toBe(false)
  })

  it('validateSegmentIds filters out unknowns and preserves order', () => {
    const result = validateSegmentIds(db, ['segment_99', 'segment_4', 'bogus', 'segment_1'])
    expect(result).toEqual(['segment_4', 'segment_1'])
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

Run: `pnpm test tests/sutra.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/lib/sutra.ts`**

```ts
import type { SutraSegment } from '@/types/chat'

export function getSegmentById(
  db: SutraSegment[],
  id: string
): SutraSegment | undefined {
  return db.find((s) => s.id === id)
}

export function isKnownSegmentId(db: SutraSegment[], id: string): boolean {
  return db.some((s) => s.id === id)
}

export function validateSegmentIds(db: SutraSegment[], ids: string[]): string[] {
  return ids.filter((id) => isKnownSegmentId(db, id))
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test tests/sutra.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add tests/sutra.test.ts src/lib/sutra.ts
git commit -m "feat: sutra segment lookup + validation helpers"
```

---

## Task 8: Categories metadata (TDD)

**Files:**
- Test: `tests/categories.test.ts`
- Create: `src/lib/categories.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/categories.test.ts
import { describe, it, expect } from 'vitest'
import { CATEGORIES, getCategory, isCategoryEnabled } from '@/lib/categories'

describe('categories', () => {
  it('exposes 5 categories', () => {
    expect(CATEGORIES).toHaveLength(5)
  })

  it('only emotion_relation is enabled in skeleton', () => {
    expect(isCategoryEnabled('emotion_relation')).toBe(true)
    expect(isCategoryEnabled('career_achievement')).toBe(false)
    expect(isCategoryEnabled('self_existence')).toBe(false)
    expect(isCategoryEnabled('health_pain')).toBe(false)
    expect(isCategoryEnabled('sudden_emotion')).toBe(false)
  })

  it('emotion_relation has chinese label and strategy hints', () => {
    const c = getCategory('emotion_relation')
    expect(c.label).toBe('情感與關係')
    expect(c.strategy).toMatch(/心無罣礙/)
    expect(c.likelySegments).toContain('segment_4')
    expect(c.likelySegments).toContain('segment_6')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test tests/categories.test.ts`

- [ ] **Step 3: Implement `src/lib/categories.ts`**

```ts
import type { CategoryId } from '@/types/chat'

export interface CategoryMeta {
  id: CategoryId
  label: string
  presets: string[]
  strategy: string
  likelySegments: string[]
  enabled: boolean
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'emotion_relation',
    label: '情感與關係',
    presets: ['分手遺憾', '關係孤獨', '溝通耗竭'],
    strategy: '強化「心無罣礙」，引導使用者建立健康的心理邊界。',
    likelySegments: ['segment_4', 'segment_6'],
    enabled: true,
  },
  {
    id: 'career_achievement',
    label: '職場與成就',
    presets: ['不甘心回報不足', '職涯迷茫', '同儕比較'],
    strategy: '解構「得失心」，強調「無所得」的過程價值。',
    likelySegments: ['segment_5'],
    enabled: false,
  },
  {
    id: 'self_existence',
    label: '自我與存在',
    presets: ['年齡焦慮', '生活空虛', '意義喪失'],
    strategy: '回歸「不生不滅」，打破對自我形象的固化執著。',
    likelySegments: ['segment_3'],
    enabled: false,
  },
  {
    id: 'health_pain',
    label: '健康與病痛',
    presets: ['長期疼痛', '死亡恐懼', '病後無法接受'],
    strategy: '實施「主客體分離」，觀察病痛而非成為病痛。',
    likelySegments: ['segment_1', 'segment_2'],
    enabled: false,
  },
  {
    id: 'sudden_emotion',
    label: '突發性情緒',
    presets: ['資訊過載', '莫名的憤怒或悲傷'],
    strategy: '利用「六根清淨」進行情緒阻斷，回歸當下覺知。',
    likelySegments: ['segment_4'],
    enabled: false,
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

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test tests/categories.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add tests/categories.test.ts src/lib/categories.ts
git commit -m "feat: define 5 dilemma categories metadata"
```

---

## Task 9: Dexie database module (TDD)

**Files:**
- Test: `tests/db.test.ts`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, saveApiKey, loadApiKey, clearApiKey,
         createSession, appendMessage, completeSession, listSessions,
         getSession } from '@/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('apiKey CRUD', () => {
  it('returns null when no key is stored', async () => {
    expect(await loadApiKey()).toBeNull()
  })

  it('saves and loads a key', async () => {
    await saveApiKey('AIza-test-key')
    expect(await loadApiKey()).toBe('AIza-test-key')
  })

  it('overwrites previous key on save', async () => {
    await saveApiKey('first')
    await saveApiKey('second')
    expect(await loadApiKey()).toBe('second')
  })

  it('clears the key', async () => {
    await saveApiKey('to-clear')
    await clearApiKey()
    expect(await loadApiKey()).toBeNull()
  })
})

describe('sessions CRUD', () => {
  it('creates a session with status active', async () => {
    const id = await createSession('emotion_relation')
    const s = await getSession(id)
    expect(s?.status).toBe('active')
    expect(s?.category).toBe('emotion_relation')
    expect(s?.messages).toEqual([])
  })

  it('appends messages immutably', async () => {
    const id = await createSession('emotion_relation')
    await appendMessage(id, {
      role: 'user', content: 'hi', timestamp: Date.now(),
    })
    const s = await getSession(id)
    expect(s?.messages).toHaveLength(1)
    expect(s?.messages[0].content).toBe('hi')
  })

  it('completes a session', async () => {
    const id = await createSession('emotion_relation')
    await completeSession(id)
    const s = await getSession(id)
    expect(s?.status).toBe('completed')
    expect(s?.endedAt).toBeTypeOf('number')
  })

  it('lists sessions newest first', async () => {
    const a = await createSession('emotion_relation')
    await new Promise((r) => setTimeout(r, 5))
    const b = await createSession('emotion_relation')
    const list = await listSessions()
    expect(list[0].id).toBe(b)
    expect(list[1].id).toBe(a)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test tests/db.test.ts`

- [ ] **Step 3: Implement `src/lib/db.ts`**

```ts
import Dexie, { type EntityTable } from 'dexie'
import type {
  ApiKeyRecord,
  Session,
  ChatMessage,
  CategoryId,
} from '@/types/chat'

class SutraMindDB extends Dexie {
  apiKey!: EntityTable<ApiKeyRecord, 'id'>
  sessions!: EntityTable<Session, 'id'>

  constructor() {
    super('SutraMindDB')
    this.version(1).stores({
      apiKey: '++id',
      sessions: '++id, category, startedAt',
    })
  }
}

export const db = new SutraMindDB()

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
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test tests/db.test.ts`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add tests/db.test.ts src/lib/db.ts
git commit -m "feat: dexie schema + apiKey/session CRUD"
```

---

## Task 10: Prompt builder — role + sutra knowledge blocks (TDD)

**Files:**
- Test: `tests/prompt-builder.test.ts`
- Create: `src/lib/prompt-builder.ts`

- [ ] **Step 1: Write the failing tests for the role + knowledge blocks**

```ts
// tests/prompt-builder.test.ts
import { describe, it, expect } from 'vitest'
import { buildPrompt } from '@/lib/prompt-builder'
import sutraDB from '@/data/sutra-db.json'
import type { SutraSegment } from '@/types/chat'

const db = sutraDB as SutraSegment[]

const baseInput = {
  category: 'emotion_relation' as const,
  history: [],
  userMessage: '我跟伴侶分手了',
  sutraDB: db,
  roundNumber: 1 as const,
}

describe('prompt-builder: role + sutra knowledge blocks', () => {
  it('includes the role block describing the digital mentor', () => {
    const p = buildPrompt(baseInput)
    expect(p.systemInstruction).toMatch(/digital mentor/i)
    expect(p.systemInstruction).toMatch(/Mahayana|般若|Heart Sutra/i)
    expect(p.systemInstruction).toMatch(/CBT/)
  })

  it('lists the four behavioural rules from the spec', () => {
    const p = buildPrompt(baseInput)
    expect(p.systemInstruction).toMatch(/Deep Listening|深層聽解/)
    expect(p.systemInstruction).toMatch(/Sutra Mapping|經文映射/)
    expect(p.systemInstruction).toMatch(/De-labeling|去標籤化/)
    expect(p.systemInstruction).toMatch(/Zen Response|禪意回覆/)
  })

  it('embeds full sutra DB inside <SUTRA_DB> tags as JSON', () => {
    const p = buildPrompt(baseInput)
    expect(p.systemInstruction).toContain('<SUTRA_DB>')
    expect(p.systemInstruction).toContain('</SUTRA_DB>')
    const m = p.systemInstruction.match(/<SUTRA_DB>([\s\S]*?)<\/SUTRA_DB>/)
    expect(m).not.toBeNull()
    const parsed = JSON.parse(m![1])
    expect(parsed).toHaveLength(9)
    expect(parsed[0]).toHaveProperty('id', 'segment_1')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test tests/prompt-builder.test.ts`

- [ ] **Step 3: Implement skeleton of `src/lib/prompt-builder.ts`**

```ts
// src/lib/prompt-builder.ts
import type {
  CategoryId,
  ChatMessage,
  RoundNumber,
  SutraSegment,
} from '@/types/chat'
import { getCategory } from '@/lib/categories'

export interface BuildPromptInput {
  category: CategoryId
  history: ChatMessage[]
  userMessage: string
  sutraDB: SutraSegment[]
  roundNumber: RoundNumber
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export interface GeminiPayload {
  systemInstruction: string
  contents: GeminiContent[]
  responseSchema: object
  generationConfig: {
    temperature: number
    responseMimeType: 'application/json'
  }
}

const ROLE_BLOCK = `
[Role]
You are a digital mentor blending Mahayana Buddhist wisdom (Heart Sutra / 般若波羅蜜多心經) with modern Cognitive Behavioural Therapy (CBT). Your knowledge base is the Sutra-DB provided below.

Behavioural rules (follow ALL):
1. Deep Listening (深層聽解): identify the attachment point in the user's emotion, not the surface complaint.
2. Sutra Mapping (經文映射): pick 1-2 most relevant segments from the Sutra-DB; quote the original briefly and re-interpret it for the user's situation.
3. De-labeling (去標籤化): help the user see the emptiness (空) of "the suffering" and "the self" — soften the solidity of the emotion.
4. Zen Response (禪意回覆): elegant, calm, forward-looking. NEVER moralize. NEVER use phrases like "你應該", "要學會", "請記住", "時間會治癒". Prefer guided questions or awareness practices.
`.trim()

function buildSutraKnowledgeBlock(sutraDB: SutraSegment[]): string {
  return `
[Sutra Knowledge Base]
Here is your full knowledge base. Each segment has: id, original (Chinese sutra text), vernacular (modern translation), keywords, therapeutic_focus.

<SUTRA_DB>
${JSON.stringify(sutraDB, null, 2)}
</SUTRA_DB>
`.trim()
}

// Placeholders to be filled in later tasks:
function buildCategoryStrategyBlock(_category: CategoryId): string {
  return ''
}
function buildClosingRulesBlock(_round: RoundNumber): string {
  return ''
}
function buildOutputContractBlock(): string {
  return ''
}
function formatHistory(_history: ChatMessage[], _userMessage: string): GeminiContent[] {
  return []
}

export function buildPrompt(input: BuildPromptInput): GeminiPayload {
  const { category, sutraDB, roundNumber, history, userMessage } = input
  const systemInstruction = [
    ROLE_BLOCK,
    buildSutraKnowledgeBlock(sutraDB),
    buildCategoryStrategyBlock(category),
    buildClosingRulesBlock(roundNumber),
    buildOutputContractBlock(),
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    systemInstruction,
    contents: formatHistory(history, userMessage),
    responseSchema: {},
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  }
}
```

- [ ] **Step 4: Run — expect PASS for the 3 tests in this task**

Run: `pnpm test tests/prompt-builder.test.ts`
Expected: 3 passed (we will add more tests in Tasks 11 & 12; some may fail temporarily but that's OK at this stage as they don't exist yet).

- [ ] **Step 5: Commit**

```bash
git add tests/prompt-builder.test.ts src/lib/prompt-builder.ts
git commit -m "feat(prompt): role + sutra knowledge blocks"
```

---

## Task 11: Prompt builder — category strategy + round-aware closing (TDD)

**Files:**
- Modify: `tests/prompt-builder.test.ts` (append)
- Modify: `src/lib/prompt-builder.ts`

- [ ] **Step 1: Append failing tests**

Append to `tests/prompt-builder.test.ts`:

```ts
describe('prompt-builder: category strategy block', () => {
  it('injects emotion_relation strategy', () => {
    const p = buildPrompt({ ...baseInput, category: 'emotion_relation' })
    expect(p.systemInstruction).toMatch(/情感與關係|emotion_relation/)
    expect(p.systemInstruction).toMatch(/心無罣礙/)
    expect(p.systemInstruction).toMatch(/segment_4/)
  })
})

describe('prompt-builder: round-aware closing rules', () => {
  it('round 1 uses reflective-question closing', () => {
    const p = buildPrompt({ ...baseInput, roundNumber: 1 })
    expect(p.systemInstruction).toMatch(/reflective question|awareness practice/i)
    expect(p.systemInstruction).not.toMatch(/final round|brief blessing/i)
  })

  it('round 2 also uses reflective-question closing', () => {
    const p = buildPrompt({ ...baseInput, roundNumber: 2 })
    expect(p.systemInstruction).toMatch(/reflective question|awareness practice/i)
  })

  it('round 3 uses concrete-practice + blessing closing', () => {
    const p = buildPrompt({ ...baseInput, roundNumber: 3 })
    expect(p.systemInstruction).toMatch(/final round/i)
    expect(p.systemInstruction).toMatch(/concrete.*practice/i)
    expect(p.systemInstruction).toMatch(/blessing/i)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test tests/prompt-builder.test.ts`

- [ ] **Step 3: Replace the two stub functions in `src/lib/prompt-builder.ts`**

Find `function buildCategoryStrategyBlock` and replace with:

```ts
function buildCategoryStrategyBlock(categoryId: CategoryId): string {
  const c = getCategory(categoryId)
  return `
[Category Strategy]
The user has selected category: ${c.label} (${categoryId}).
Inference focus: ${c.strategy}
Likely relevant segments (use as starting hints, not constraints): ${c.likelySegments.join(', ')}
`.trim()
}
```

Find `function buildClosingRulesBlock` and replace with:

```ts
function buildClosingRulesBlock(round: RoundNumber): string {
  if (round < 3) {
    return `
[Closing Rules — round ${round} of 3]
End your reply with EITHER a single reflective question OR a tiny awareness practice (e.g., "now notice your breath for three cycles"). Keep it gentle. Do NOT moralize.
`.trim()
  }
  return `
[Closing Rules — final round (3 of 3)]
This is the final round. End with:
1. ONE concrete present-moment practice the user can do right now (under 30 seconds).
2. A brief, sincere blessing (one short sentence).
Do NOT moralize. Do NOT promise outcomes.
`.trim()
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test tests/prompt-builder.test.ts`
Expected: previously-passing 3 tests + 4 new ones all green (7 passing in this file so far).

- [ ] **Step 5: Commit**

```bash
git add tests/prompt-builder.test.ts src/lib/prompt-builder.ts
git commit -m "feat(prompt): category strategy + round-aware closing"
```

---

## Task 12: Prompt builder — output contract + history formatting (TDD)

**Files:**
- Modify: `tests/prompt-builder.test.ts` (append)
- Modify: `src/lib/prompt-builder.ts`

- [ ] **Step 1: Append failing tests**

Append to `tests/prompt-builder.test.ts`:

```ts
describe('prompt-builder: output contract', () => {
  it('responseSchema requires referenced_segment_ids and response_text', () => {
    const p = buildPrompt(baseInput)
    const s = p.responseSchema as any
    expect(s.type).toBe('object')
    expect(s.required).toContain('referenced_segment_ids')
    expect(s.required).toContain('response_text')
    expect(s.properties.referenced_segment_ids.type).toBe('array')
    expect(s.properties.response_text.type).toBe('string')
  })

  it('system instruction forbids putting original sutra text inside response_text', () => {
    const p = buildPrompt(baseInput)
    expect(p.systemInstruction).toMatch(/JSON/)
    expect(p.systemInstruction).toMatch(/do not include.*original.*response_text/i)
  })
})

describe('prompt-builder: contents history formatting', () => {
  it('returns single user content when history is empty', () => {
    const p = buildPrompt(baseInput)
    expect(p.contents).toHaveLength(1)
    expect(p.contents[0]).toEqual({
      role: 'user',
      parts: [{ text: '我跟伴侶分手了' }],
    })
  })

  it('translates history into gemini user/model role pairs', () => {
    const p = buildPrompt({
      ...baseInput,
      history: [
        { role: 'user', content: 'hi', timestamp: 1 },
        {
          role: 'assistant',
          content: 'reply text',
          referencedSegmentIds: ['segment_4'],
          closingPractice: null,
          timestamp: 2,
        },
      ],
      userMessage: 'follow up',
    })
    expect(p.contents).toEqual([
      { role: 'user', parts: [{ text: 'hi' }] },
      { role: 'model', parts: [{ text: 'reply text' }] },
      { role: 'user', parts: [{ text: 'follow up' }] },
    ])
  })

  it('feeds only response_text back as model turn (not the JSON wrapper)', () => {
    const p = buildPrompt({
      ...baseInput,
      history: [
        {
          role: 'assistant',
          content: 'plain text',
          referencedSegmentIds: ['segment_4'],
          timestamp: 1,
        },
      ],
      userMessage: 'q',
    })
    const modelTurn = p.contents.find((c) => c.role === 'model')!
    expect(modelTurn.parts[0].text).toBe('plain text')
    expect(modelTurn.parts[0].text).not.toMatch(/referenced_segment_ids/)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test tests/prompt-builder.test.ts`

- [ ] **Step 3: Replace the remaining stubs in `src/lib/prompt-builder.ts`**

Find `function buildOutputContractBlock` and replace with:

```ts
function buildOutputContractBlock(): string {
  return `
[Output Contract]
You MUST respond with a single JSON object matching this schema:
{
  "referenced_segment_ids": string[]   // 1-2 ids from <SUTRA_DB> you actually drew from
  "response_text": string              // your Zen reply, plain text only
  "closing_practice": string | null    // tiny actionable practice OR null
}

Rules:
- "response_text" is plain Chinese text. Do not include the original sutra characters in response_text — the UI will render the original from referenced_segment_ids.
- Keep response_text under ~180 Chinese characters.
- referenced_segment_ids MUST contain at least one valid id (segment_1 .. segment_9).
`.trim()
}
```

Find `function formatHistory` and replace with:

```ts
function formatHistory(
  history: ChatMessage[],
  userMessage: string
): GeminiContent[] {
  const out: GeminiContent[] = []
  for (const m of history) {
    out.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })
  }
  out.push({ role: 'user', parts: [{ text: userMessage }] })
  return out
}
```

Update the `responseSchema` returned by `buildPrompt` — replace `responseSchema: {}` with:

```ts
    responseSchema: {
      type: 'object',
      properties: {
        referenced_segment_ids: { type: 'array', items: { type: 'string' } },
        response_text: { type: 'string' },
        closing_practice: { type: 'string', nullable: true },
      },
      required: ['referenced_segment_ids', 'response_text'],
    },
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test tests/prompt-builder.test.ts`
Expected: 12 passed total in this file.

- [ ] **Step 5: Commit**

```bash
git add tests/prompt-builder.test.ts src/lib/prompt-builder.ts
git commit -m "feat(prompt): output contract + history formatting"
```

---

## Task 13: Gemini client wrapper (TDD)

**Files:**
- Test: `tests/gemini.test.ts`
- Create: `src/lib/gemini.ts`

> Reference verification: before writing `src/lib/gemini.ts`, run a context7 lookup against `/websites/googleapis_github_io_js-genai` for "GoogleGenAI generateContent config systemInstruction responseSchema" if unsure about the current SDK call shape. The known-correct shape as of the spec date: `new GoogleGenAI({ apiKey })` then `ai.models.generateContent({ model, contents, config: { systemInstruction, responseMimeType, responseSchema, temperature } })`. Result text via `response.text`.

- [ ] **Step 1: Write the failing tests (error classification only — no real network)**

```ts
// tests/gemini.test.ts
import { describe, it, expect } from 'vitest'
import { classifyGeminiError, GeminiError } from '@/lib/gemini'

describe('classifyGeminiError', () => {
  it('classifies 401 as AUTH_FAILED', () => {
    const e = classifyGeminiError({ status: 401, message: 'unauthorized' })
    expect(e).toBeInstanceOf(GeminiError)
    expect(e.kind).toBe('AUTH_FAILED')
    expect(e.retryable).toBe(false)
  })

  it('classifies 403 as AUTH_FAILED', () => {
    const e = classifyGeminiError({ status: 403, message: 'forbidden' })
    expect(e.kind).toBe('AUTH_FAILED')
  })

  it('classifies 429 as RATE_LIMIT (retryable)', () => {
    const e = classifyGeminiError({ status: 429, message: 'too many' })
    expect(e.kind).toBe('RATE_LIMIT')
    expect(e.retryable).toBe(true)
  })

  it('classifies network TypeError as NETWORK (retryable)', () => {
    const e = classifyGeminiError(new TypeError('Failed to fetch'))
    expect(e.kind).toBe('NETWORK')
    expect(e.retryable).toBe(true)
  })

  it('falls back to UNKNOWN', () => {
    const e = classifyGeminiError({ status: 500, message: 'oops' })
    expect(e.kind).toBe('UNKNOWN')
    expect(e.retryable).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test tests/gemini.test.ts`

- [ ] **Step 3: Implement `src/lib/gemini.ts`**

```ts
// src/lib/gemini.ts
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

export function classifyGeminiError(err: unknown): GeminiError {
  if (err instanceof TypeError) {
    return new GeminiError('NETWORK', err.message, true)
  }
  const anyErr = err as { status?: number; message?: string }
  const status = anyErr?.status
  const message = anyErr?.message ?? 'Unknown error'
  if (status === 401 || status === 403) {
    return new GeminiError('AUTH_FAILED', message, false)
  }
  if (status === 429) {
    return new GeminiError('RATE_LIMIT', message, true)
  }
  return new GeminiError('UNKNOWN', message, true)
}

export const DEFAULT_MODEL = 'gemini-2.5-flash'

export async function callGemini(
  apiKey: string,
  payload: GeminiPayload
): Promise<GeminiStructuredResponse> {
  let raw: string
  try {
    const ai = new GoogleGenAI({ apiKey })
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
    raw = response.text ?? ''
  } catch (err) {
    throw classifyGeminiError(err)
  }

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

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test tests/gemini.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add tests/gemini.test.ts src/lib/gemini.ts
git commit -m "feat(gemini): client wrapper + error classification"
```

---

## Task 14: API key + sessions hooks

**Files:**
- Create: `src/hooks/useApiKey.ts`
- Create: `src/hooks/useSessions.ts`

> No tests for hooks at skeleton stage (manual verification per spec §9). Tasks 7-13 already cover the pure logic.

- [ ] **Step 1: Write `src/hooks/useApiKey.ts`**

```ts
'use client'
import { useEffect, useState } from 'react'
import { loadApiKey, saveApiKey, clearApiKey } from '@/lib/db'

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadApiKey().then((k) => {
      setApiKey(k)
      setLoading(false)
    })
  }, [])

  async function save(value: string) {
    await saveApiKey(value)
    setApiKey(value)
  }

  async function clear() {
    await clearApiKey()
    setApiKey(null)
  }

  return { apiKey, loading, save, clear }
}
```

- [ ] **Step 2: Write `src/hooks/useSessions.ts`**

```ts
'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Session } from '@/types/chat'

export function useSessions(): Session[] | undefined {
  return useLiveQuery(() =>
    db.sessions.orderBy('startedAt').reverse().toArray()
  )
}

export function useSession(id: number | null): Session | undefined {
  return useLiveQuery(
    () => (id == null ? undefined : db.sessions.get(id)),
    [id]
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useApiKey.ts src/hooks/useSessions.ts
git commit -m "feat(hooks): useApiKey + useSessions live queries"
```

---

## Task 15: Chat session state machine hook

**Files:**
- Create: `src/hooks/useChatSession.ts`

- [ ] **Step 1: Write `src/hooks/useChatSession.ts`**

```ts
'use client'
import { useCallback, useEffect, useState } from 'react'
import sutraDB from '@/data/sutra-db.json'
import { buildPrompt } from '@/lib/prompt-builder'
import { callGemini, GeminiError } from '@/lib/gemini'
import { appendMessage, completeSession, getSession } from '@/lib/db'
import { validateSegmentIds } from '@/lib/sutra'
import type {
  CategoryId,
  ChatMessage,
  RoundNumber,
  Session,
  SutraSegment,
} from '@/types/chat'

const db = sutraDB as SutraSegment[]

export type ChatStatus =
  | 'idle'
  | 'sending'
  | 'awaiting_user'
  | 'completed'
  | 'error'

export interface UseChatSessionResult {
  session: Session | null
  status: ChatStatus
  error: GeminiError | null
  roundNumber: RoundNumber
  send: (text: string) => Promise<void>
  retry: () => Promise<void>
  finishSession: () => Promise<void>
}

export function useChatSession(
  sessionId: number,
  apiKey: string,
  category: CategoryId
): UseChatSessionResult {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [error, setError] = useState<GeminiError | null>(null)
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)

  useEffect(() => {
    getSession(sessionId).then((s) => setSession(s ?? null))
  }, [sessionId])

  const userTurnsCompleted = session
    ? session.messages.filter((m) => m.role === 'assistant').length
    : 0
  const roundNumber = (Math.min(userTurnsCompleted + 1, 3)) as RoundNumber

  async function refresh() {
    setSession((await getSession(sessionId)) ?? null)
  }

  const performSend = useCallback(
    async (text: string) => {
      setStatus('sending')
      setError(null)

      const userMsg: ChatMessage = {
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }
      await appendMessage(sessionId, userMsg)
      const fresh = await getSession(sessionId)
      if (!fresh) throw new Error('Session vanished')
      setSession(fresh)

      const historyExcludingPending = fresh.messages.slice(0, -1)

      try {
        const payload = buildPrompt({
          category,
          history: historyExcludingPending,
          userMessage: text,
          sutraDB: db,
          roundNumber: (Math.min(
            historyExcludingPending.filter((m) => m.role === 'assistant').length + 1,
            3
          )) as RoundNumber,
        })
        const reply = await callGemini(apiKey, payload)
        const cleanIds = validateSegmentIds(db, reply.referenced_segment_ids)

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: reply.response_text,
          referencedSegmentIds: cleanIds,
          closingPractice: reply.closing_practice ?? null,
          timestamp: Date.now(),
        }
        await appendMessage(sessionId, assistantMsg)
        const updated = await getSession(sessionId)
        setSession(updated ?? null)

        const assistantCount =
          updated?.messages.filter((m) => m.role === 'assistant').length ?? 0
        if (assistantCount >= 3) {
          await completeSession(sessionId)
          await refresh()
          setStatus('completed')
        } else {
          setStatus('awaiting_user')
        }
      } catch (err) {
        // The user turn is already persisted. retry() will reuse it without
        // re-appending. Round counter only advances on a successful assistant turn.
        setPendingUserMessage(text)
        setError(err as GeminiError)
        setStatus('error')
      }
    },
    [sessionId, apiKey, category]
  )

  const send = useCallback(
    async (text: string) => {
      if (status === 'sending' || status === 'completed') return
      await performSend(text)
    },
    [performSend, status]
  )

  const retry = useCallback(async () => {
    if (!pendingUserMessage) return
    // Re-call without appending another user turn.
    const fresh = await getSession(sessionId)
    if (!fresh) return
    const lastUser = fresh.messages[fresh.messages.length - 1]
    if (lastUser?.role !== 'user') return
    setStatus('sending')
    setError(null)
    try {
      const historyExcludingLast = fresh.messages.slice(0, -1)
      const payload = buildPrompt({
        category,
        history: historyExcludingLast,
        userMessage: lastUser.content,
        sutraDB: db,
        roundNumber: (Math.min(
          historyExcludingLast.filter((m) => m.role === 'assistant').length + 1,
          3
        )) as RoundNumber,
      })
      const reply = await callGemini(apiKey, payload)
      const cleanIds = validateSegmentIds(db, reply.referenced_segment_ids)
      await appendMessage(sessionId, {
        role: 'assistant',
        content: reply.response_text,
        referencedSegmentIds: cleanIds,
        closingPractice: reply.closing_practice ?? null,
        timestamp: Date.now(),
      })
      await refresh()
      const after = await getSession(sessionId)
      const assistants = after?.messages.filter((m) => m.role === 'assistant').length ?? 0
      if (assistants >= 3) {
        await completeSession(sessionId)
        await refresh()
        setStatus('completed')
      } else {
        setStatus('awaiting_user')
      }
      setPendingUserMessage(null)
    } catch (err) {
      setError(err as GeminiError)
      setStatus('error')
    }
  }, [sessionId, apiKey, category, pendingUserMessage])

  const finishSession = useCallback(async () => {
    await completeSession(sessionId)
    await refresh()
    setStatus('completed')
  }, [sessionId])

  return { session, status, error, roundNumber, send, retry, finishSession }
}
```

- [ ] **Step 2: Manual smoke compile**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useChatSession.ts
git commit -m "feat(hooks): chat session state machine"
```

---

## Task 16: Global layout + entry route + globals.css

**Files:**
- Create: `src/styles/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Write `src/styles/globals.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@400;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  background-color: #121212;
  color: #EAE0D5;
  min-height: 100vh;
}

body {
  font-family: 'Noto Sans TC', system-ui, sans-serif;
}
```

- [ ] **Step 2: Write `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'SutraMind — 智慧心經導師',
  description: '一個極致私密的數位心靈空間。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hant">
      <body className="bg-zen-bg text-zen-text antialiased">
        <main className="min-h-screen mx-auto max-w-2xl px-6 py-12">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Write `src/app/page.tsx`**

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApiKey } from '@/hooks/useApiKey'
import { abandonStaleActiveSessions } from '@/lib/db'

export default function HomePage() {
  const router = useRouter()
  const { apiKey, loading } = useApiKey()

  useEffect(() => {
    abandonStaleActiveSessions().catch(() => {})
  }, [])

  useEffect(() => {
    if (loading) return
    if (apiKey) router.replace('/categories')
    else router.replace('/setup')
  }, [apiKey, loading, router])

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 rounded-full bg-zen-accent/30 animate-breath" />
    </div>
  )
}
```

- [ ] **Step 4: Build smoke test**

Run: `pnpm build`
Expected: Build completes; `out/` directory created.

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "feat(ui): global layout + entry route guard"
```

---

## Task 17: Setup page (BYOK)

**Files:**
- Create: `src/components/ApiKeyForm.tsx`
- Create: `src/app/setup/page.tsx`

- [ ] **Step 1: Write `src/components/ApiKeyForm.tsx`**

```tsx
'use client'
import { useState } from 'react'

interface Props {
  initialValue?: string
  onSave: (value: string) => Promise<void>
}

export function ApiKeyForm({ initialValue = '', onSave }: Props) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) {
      setError('請輸入 API key')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(value.trim())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-zen-muted">Gemini API Key</span>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="AIza..."
          className="bg-zen-surface border border-zen-muted/30 rounded-md px-4 py-3 text-zen-text focus:outline-none focus:border-zen-accent"
          autoComplete="off"
        />
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="bg-zen-accent/80 hover:bg-zen-accent text-zen-bg font-medium px-6 py-3 rounded-md disabled:opacity-50"
      >
        {saving ? '儲存中...' : '儲存並開始'}
      </button>
      <p className="text-xs text-zen-muted leading-relaxed">
        金鑰僅儲存於此裝置的瀏覽器 (IndexedDB)，永不離開你的裝置。
        前往 <a className="underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> 取得免費 API key。
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Write `src/app/setup/page.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { useApiKey } from '@/hooks/useApiKey'
import { ApiKeyForm } from '@/components/ApiKeyForm'

export default function SetupPage() {
  const router = useRouter()
  const { apiKey, save } = useApiKey()

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl">SutraMind</h1>
        <p className="text-zen-muted">設定你的 Gemini API Key 開始使用。</p>
      </header>
      <ApiKeyForm
        initialValue={apiKey ?? ''}
        onSave={async (v) => {
          await save(v)
          router.replace('/categories')
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Manual smoke**

Run: `pnpm dev`, open `http://localhost:3000/setup`, paste a fake string, submit. Verify navigation to `/categories` (will 404 until next task — that's expected).

- [ ] **Step 4: Commit**

```bash
git add src/components/ApiKeyForm.tsx src/app/setup/page.tsx
git commit -m "feat(ui): BYOK setup page"
```

---

## Task 18: Categories page

**Files:**
- Create: `src/components/CategoryGrid.tsx`
- Create: `src/app/categories/page.tsx`

- [ ] **Step 1: Write `src/components/CategoryGrid.tsx`**

```tsx
'use client'
import { CATEGORIES } from '@/lib/categories'
import type { CategoryId } from '@/types/chat'

interface Props {
  onSelect: (id: CategoryId) => void
}

export function CategoryGrid({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          disabled={!c.enabled}
          onClick={() => onSelect(c.id)}
          className={`text-left p-6 rounded-lg border transition
            ${c.enabled
              ? 'bg-zen-surface border-zen-muted/30 hover:border-zen-accent cursor-pointer'
              : 'bg-zen-surface/40 border-zen-muted/10 opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl">{c.label}</h3>
            {!c.enabled && (
              <span className="text-xs text-zen-muted">即將開放</span>
            )}
          </div>
          <p className="mt-2 text-sm text-zen-muted">
            {c.presets.join('、')}
          </p>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/categories/page.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CategoryGrid } from '@/components/CategoryGrid'
import { isCategoryEnabled } from '@/lib/categories'
import { createSession } from '@/lib/db'
import type { CategoryId } from '@/types/chat'

export default function CategoriesPage() {
  const router = useRouter()

  async function handleSelect(id: CategoryId) {
    if (!isCategoryEnabled(id)) return
    const sessionId = await createSession(id)
    router.push(`/chat?sessionId=${sessionId}`)
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">此刻，是什麼讓你停留？</h1>
        <Link href="/history" className="text-sm text-zen-muted hover:text-zen-accent">
          歷史 →
        </Link>
      </header>
      <CategoryGrid onSelect={handleSelect} />
    </div>
  )
}
```

- [ ] **Step 3: Manual smoke**

Open `http://localhost:3000/categories`. Verify only "情感與關係" is clickable; others are visibly muted with "即將開放" label.

- [ ] **Step 4: Commit**

```bash
git add src/components/CategoryGrid.tsx src/app/categories/page.tsx
git commit -m "feat(ui): categories grid with skeleton-stage gating"
```

---

## Task 19: Chat presentational components

**Files:**
- Create: `src/components/SegmentReference.tsx`
- Create: `src/components/ChatMessage.tsx`
- Create: `src/components/ChatInput.tsx`
- Create: `src/components/RoundIndicator.tsx`

- [ ] **Step 1: Write `src/components/SegmentReference.tsx`**

```tsx
'use client'
import { useState } from 'react'
import sutraDB from '@/data/sutra-db.json'
import { getSegmentById } from '@/lib/sutra'
import type { SutraSegment } from '@/types/chat'

const db = sutraDB as SutraSegment[]

interface Props {
  ids: string[]
}

export function SegmentReference({ ids }: Props) {
  const [open, setOpen] = useState(false)
  const segments = ids.map((id) => getSegmentById(db, id)).filter(Boolean) as SutraSegment[]
  if (segments.length === 0) return null

  return (
    <div className="mt-3 text-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-zen-muted hover:text-zen-accent"
      >
        {open ? '▼' : '▶'} 引用：般若波羅蜜多心經 §
        {segments.map((s) => s.id.split('_')[1]).join(', ')}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-4">
          {segments.map((s) => (
            <div key={s.id} className="border-l-2 border-zen-accent/50 pl-4">
              <p className="font-serif text-zen-text">{s.original}</p>
              <p className="mt-2 text-zen-muted">{s.vernacular}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/ChatMessage.tsx`**

```tsx
import type { ChatMessage as ChatMessageType } from '@/types/chat'
import { SegmentReference } from './SegmentReference'

interface Props {
  message: ChatMessageType
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-5 py-4 ${
          isUser
            ? 'bg-zen-accent/15 text-zen-text'
            : 'bg-zen-surface text-zen-text'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {!isUser && message.referencedSegmentIds && (
          <SegmentReference ids={message.referencedSegmentIds} />
        )}
        {!isUser && message.closingPractice && (
          <p className="mt-3 text-sm text-zen-accent border-t border-zen-muted/20 pt-3">
            ∙ {message.closingPractice}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/ChatInput.tsx`**

```tsx
'use client'
import { useState } from 'react'

interface Props {
  disabled?: boolean
  onSubmit: (text: string) => void
  placeholder?: string
}

export function ChatInput({ disabled, onSubmit, placeholder }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = value.trim()
    if (!t || disabled) return
    onSubmit(t)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder={placeholder ?? '此刻，你心中浮現的是什麼？'}
        className="flex-1 bg-zen-surface border border-zen-muted/30 rounded-md px-4 py-3 text-zen-text resize-none focus:outline-none focus:border-zen-accent disabled:opacity-50"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="self-end bg-zen-accent/80 hover:bg-zen-accent text-zen-bg font-medium px-5 py-3 rounded-md disabled:opacity-30"
      >
        送出
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Write `src/components/RoundIndicator.tsx`**

```tsx
import type { RoundNumber } from '@/types/chat'

interface Props {
  current: RoundNumber
  completed: number
}

export function RoundIndicator({ current, completed }: Props) {
  return (
    <div className="flex items-center gap-3 text-sm text-zen-muted">
      <span>第 {Math.min(current, 3)} / 3 輪</span>
      <span className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${
              i <= completed ? 'bg-zen-accent' : 'bg-zen-muted/30'
            }`}
          />
        ))}
      </span>
    </div>
  )
}
```

- [ ] **Step 5: Compile check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/SegmentReference.tsx src/components/ChatMessage.tsx \
        src/components/ChatInput.tsx src/components/RoundIndicator.tsx
git commit -m "feat(ui): chat presentational components"
```

---

## Task 20: Chat page

**Files:**
- Create: `src/app/chat/page.tsx`

- [ ] **Step 1: Write `src/app/chat/page.tsx`**

```tsx
'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChatMessage } from '@/components/ChatMessage'
import { ChatInput } from '@/components/ChatInput'
import { RoundIndicator } from '@/components/RoundIndicator'
import { useApiKey } from '@/hooks/useApiKey'
import { useChatSession } from '@/hooks/useChatSession'
import { getSession } from '@/lib/db'
import type { CategoryId } from '@/types/chat'

function ChatPageInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const sessionIdParam = sp.get('sessionId')
  const sessionId = sessionIdParam ? Number(sessionIdParam) : NaN

  const { apiKey, loading: keyLoading } = useApiKey()
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(sessionId)) {
      router.replace('/categories')
      return
    }
    getSession(sessionId).then((s) => {
      if (!s) router.replace('/categories')
      else {
        setCategory(s.category)
        setResolved(true)
      }
    })
  }, [sessionId, router])

  if (keyLoading || !resolved || !apiKey || !category) {
    return <p className="text-zen-muted">載入中...</p>
  }

  return (
    <ChatBody sessionId={sessionId} apiKey={apiKey} category={category} />
  )
}

function ChatBody({
  sessionId,
  apiKey,
  category,
}: {
  sessionId: number
  apiKey: string
  category: CategoryId
}) {
  const router = useRouter()
  const { session, status, error, roundNumber, send, retry, finishSession } =
    useChatSession(sessionId, apiKey, category)

  if (!session) return <p className="text-zen-muted">準備中...</p>

  const completedRounds = session.messages.filter((m) => m.role === 'assistant').length
  const isCompleted = status === 'completed' || session.status === 'completed'

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <Link href="/categories" className="text-sm text-zen-muted hover:text-zen-accent">
          ← 返回
        </Link>
        <RoundIndicator current={roundNumber} completed={completedRounds} />
      </header>

      <div className="flex flex-col gap-4 min-h-[40vh]">
        {session.messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
        {status === 'sending' && (
          <div className="flex justify-start">
            <div className="bg-zen-surface rounded-lg px-5 py-4">
              <div className="w-3 h-3 rounded-full bg-zen-accent/50 animate-breath" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-md p-4 text-sm flex flex-col gap-3">
          <p>
            {error.kind === 'AUTH_FAILED'
              ? 'API key 似乎無效，請更新後重試。'
              : error.kind === 'RATE_LIMIT'
              ? '請求過於頻繁，請稍候再試。'
              : error.kind === 'NETWORK'
              ? '網路連線失敗。'
              : 'AI 回覆異常，請再試一次。'}
          </p>
          <div className="flex gap-3">
            {error.retryable && (
              <button
                onClick={() => retry()}
                className="text-zen-accent hover:underline"
              >
                重試
              </button>
            )}
            {error.kind === 'AUTH_FAILED' && (
              <button
                onClick={() => router.push('/setup')}
                className="text-zen-accent hover:underline"
              >
                更新 API key
              </button>
            )}
          </div>
        </div>
      )}

      {isCompleted ? (
        <div className="flex flex-col gap-4 border-t border-zen-muted/20 pt-6">
          <p className="text-zen-muted">這次對話已完成。</p>
          <div className="flex gap-3">
            <Link
              href="/history"
              className="bg-zen-surface border border-zen-muted/30 hover:border-zen-accent px-5 py-3 rounded-md"
            >
              查看歷史
            </Link>
            <Link
              href="/categories"
              className="bg-zen-accent/80 hover:bg-zen-accent text-zen-bg font-medium px-5 py-3 rounded-md"
            >
              放下並重新開始
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ChatInput
            disabled={status === 'sending'}
            onSubmit={(text) => send(text)}
          />
          {completedRounds > 0 && (
            <button
              onClick={finishSession}
              className="text-sm text-zen-muted hover:text-zen-accent self-start"
            >
              提早放下並結束
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<p className="text-zen-muted">載入中...</p>}>
      <ChatPageInner />
    </Suspense>
  )
}
```

- [ ] **Step 2: Compile check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/chat/page.tsx
git commit -m "feat(ui): chat page with 3-round flow + error UX"
```

---

## Task 21: History pages

**Files:**
- Create: `src/components/SessionListItem.tsx`
- Create: `src/app/history/page.tsx`
- Create: `src/app/history/[id]/page.tsx`

- [ ] **Step 1: Write `src/components/SessionListItem.tsx`**

```tsx
import Link from 'next/link'
import { getCategory } from '@/lib/categories'
import type { Session } from '@/types/chat'

function fmtDate(t: number) {
  return new Date(t).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  session: Session
}

export function SessionListItem({ session }: Props) {
  const cat = getCategory(session.category)
  const firstUser = session.messages.find((m) => m.role === 'user')?.content ?? '(空)'
  const statusLabel =
    session.status === 'active' ? '進行中'
      : session.status === 'completed' ? '已完成'
      : '已放下'

  return (
    <Link
      href={`/history/${session.id}`}
      className="block bg-zen-surface border border-zen-muted/20 hover:border-zen-accent rounded-lg p-5"
    >
      <div className="flex justify-between text-xs text-zen-muted">
        <span>{cat.label}</span>
        <span>{fmtDate(session.startedAt)} · {statusLabel}</span>
      </div>
      <p className="mt-2 text-zen-text line-clamp-2">{firstUser}</p>
    </Link>
  )
}
```

- [ ] **Step 2: Write `src/app/history/page.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { useSessions } from '@/hooks/useSessions'
import { SessionListItem } from '@/components/SessionListItem'

export default function HistoryPage() {
  const sessions = useSessions()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">心經行走的足跡</h1>
        <Link href="/categories" className="text-sm text-zen-muted hover:text-zen-accent">
          ← 返回
        </Link>
      </header>

      {sessions === undefined && <p className="text-zen-muted">載入中...</p>}
      {sessions && sessions.length === 0 && (
        <p className="text-zen-muted">尚未有任何對話。</p>
      )}
      {sessions && sessions.length > 0 && (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <SessionListItem key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/app/history/[id]/page.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from '@/hooks/useSessions'
import { ChatMessage } from '@/components/ChatMessage'
import { getCategory } from '@/lib/categories'

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const session = useSession(Number.isFinite(id) ? id : null)

  if (session === undefined) return <p className="text-zen-muted">載入中...</p>
  if (session === null) return <p className="text-zen-muted">找不到此 session。</p>

  const cat = getCategory(session.category)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-xl">{cat.label}</h1>
        <Link href="/history" className="text-sm text-zen-muted hover:text-zen-accent">
          ← 返回歷史
        </Link>
      </header>
      <div className="flex flex-col gap-4">
        {session.messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: For Next.js static export, define `generateStaticParams` for the dynamic route**

Static export requires `generateStaticParams` for `[id]` routes. Since IDs are user-data only, we set `dynamicParams: true` won't work in pure static export — instead, we mark this route as client-only by setting `export const dynamic = 'force-static'` and exporting an empty `generateStaticParams`. **This means deep-linking to `/history/<id>` from a fresh tab will 404 in production export**, but in-app navigation works because it's client-side.

Add to top of `src/app/history/[id]/page.tsx`:

```tsx
export const dynamic = 'force-static'
export function generateStaticParams() {
  return []
}
```

Note: This is a known skeleton-stage limitation. A follow-up task can switch to a query-param pattern (`/history/detail?id=N`) to remove the limitation.

- [ ] **Step 5: Build smoke test**

Run: `pnpm build`
Expected: succeeds, `out/` populated. Warnings about empty `generateStaticParams` are fine.

- [ ] **Step 6: Commit**

```bash
git add src/components/SessionListItem.tsx src/app/history
git commit -m "feat(ui): history list + detail pages"
```

---

## Task 22: End-to-end manual verification + AI quality smoke test

This is the final gate before declaring the skeleton done. No code is written; this task is an explicit verification pass against the spec's §10 "Done" criteria.

- [ ] **Step 1: Boot the dev server fresh**

```bash
pnpm dev
```

Open `http://localhost:3000` in a private/incognito window (so IndexedDB is empty).

- [ ] **Step 2: Run the spec's manual checklist (spec §9)**

For each, mark observed result:

- [ ] Cold start with no API key → setup page appears
- [ ] Paste obviously-fake key (e.g., `bad-key`) → first chat send shows AUTH_FAILED banner with "更新 API key" button → click navigates to /setup
- [ ] Paste valid Gemini key → 3 rounds, each AI reply renders with segment reference
- [ ] Round counter dots fill 1 → 2 → 3 as AI replies arrive
- [ ] After round 3, input disabled, two CTA buttons appear
- [ ] Reload mid-session → returning to /history shows the partial conversation; status is `abandoned` (boot guard transitioned active → abandoned)
- [ ] Other 4 categories appear muted with "即將開放"
- [ ] /history lists newest-first; clicking expands full conversation with sutra references

- [ ] **Step 3: Run the AI quality smoke test (spec §10 item 4)**

Three separate sessions, one input each:

1. `我跟交往三年的伴侶分手了，每天晚上都睡不著`
2. `覺得自己永遠交不到真心朋友，活在一個人的世界`
3. `明明知道該放下了，但還是忍不住一直去看他的社群`

For each AI reply, check:

- [ ] `referenced_segment_ids` non-empty and ids exist (segment reference renders)
- [ ] No moralizing phrases: 你應該、要學會、請記住、時間會治癒、一定會、必須
- [ ] Ends with a reflective question OR a tiny awareness practice (rounds 1-2) / concrete practice + blessing (round 3)
- [ ] Reply is under ~180 Chinese characters

If any reply fails: revisit `src/lib/prompt-builder.ts`, tune the relevant block (most likely `ROLE_BLOCK` constraints or `buildClosingRulesBlock`), re-run tests, and re-test the failing input.

- [ ] **Step 4: Final automated checks**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

All three must pass cleanly. The `out/` directory should contain the static export.

- [ ] **Step 5: Commit any prompt tuning made during AI quality pass**

```bash
git add -A
git commit -m "feat(prompt): tune wording from AI smoke-test feedback"
```
(Skip if no changes were needed.)

- [ ] **Step 6: Tag the skeleton**

```bash
git tag -a walking-skeleton -m "Walking skeleton complete: BYOK + 3-round chat + history"
```

---

## Plan complete

Skeleton scope is now closed. Out-of-scope items (PWA, animations, other categories, encryption, streaming, multi-language, GitHub Pages CI) are tracked in spec §11 and can be planned independently.

Suggested next plans (one per follow-up):
1. PWA layer (Service Worker, manifest, offline cache for shell + Sutra-DB)
2. Zen animations (Ink-Drop streaming, Breathing Loader during API call, Sand-Art on session end)
3. Remaining 4 categories (each gets its own strategy block + segment hint testing)
4. API-key encryption with Web Crypto
5. GitHub Pages CI workflow

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

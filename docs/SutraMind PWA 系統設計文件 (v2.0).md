這是一份針對 **「SutraMind PWA：智慧心經導師」** 演進至 v2.0 的全面系統設計文件（System Design Document）。

這份文件專為 **Local-first（地端優先）與資料驅動（Data-driven）** 架構量身打造，詳細定義了如何在「無後端」狀態下，單純利用瀏覽器 IndexedDB 與高續航力的 **Gemma 4 / Gemini 3.1 Flash Lite** 引擎，玩轉大數據分析與個人化儀式感功能。

---

# 📜 SutraMind PWA 系統設計文件 (v2.0)

## 1. 系統架構概要 (Architecture Overview)

本系統採取 **Zero-Backend（零後端）與 Data Gravity-Client（數據留端）** 的極簡美學設計。所有敏感的心靈困惑數據與金鑰（API Key）皆儲存於使用者地端載具，利用大語言模型的「結構化 JSON 輸出（Structured Output）」能力，直接在前端完成數據清洗、標籤化與趨勢統計。

```
[使用者輸入] ──> [Gemma 4 / Gemini 3.1] ──(結構化 JSON)──> [地端 IndexedDB]
                                                               │
[本地排程觸發] <── [動態趨勢分析] <─── [Recharts 視覺化] <──────┘

```

---

## 2. 本地資料模型設計 (Local Data Schema)

採用 `Dexie.js` 作為 IndexedDB 的封裝庫，定義三個核心資料表（Stores），以支持歷史對話、大數據分析與遊戲化修行等級：

```typescript
import Dexie, { type Table } from 'dexie';

// 1. 定義結構化分析指標
export interface EmotionMetrics {
  work_anxiety: number;         // 職場焦慮 (0-10)
  relationship_clinging: number;// 關係執著 (0-10)
  existential_emptiness: number;// 存在虛無/年齡焦慮 (0-10)
  health_fear: number;          // 健康/病痛恐懼 (0-10)
  acute_emotion: number;        // 突發性情緒衝擊 (0-10)
}

export interface ChatLog {
  id?: number;
  session_id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  mapped_segment?: string;      // 映射的心經章節 ID (如 segment_1)
}

export interface DailyAnalytics {
  date: string;                 // Key: YYYY-MM-DD
  metrics: EmotionMetrics;      // 經過大模型轉譯的量化指標
  mind_summary: string;         // 今日心靈摘要
}

export interface UserProfile {
  key: string;                  // api_key, cultivation_rank, last_login
  value: any;
}

// 2. 初始化本地資料庫
class SutraMindDB extends Dexie {
  chats!: Table<ChatLog>;
  analytics!: Table<DailyAnalytics>;
  profile!: Table<UserProfile>;

  constructor() {
    super('SutraMindDB');
    this.version(2).stores({
      chats: '++id, session_id, timestamp',
      analytics: 'date',
      profile: 'key'
    });
  }
}

export const db = new SutraMindDB();

```

---

## 3. 核心 LLM 管道與結構化輸出 (LLM Pipeline)

為了讓 `Gemma 4`（1,500 RPD 擔當核心推理）或 `Gemini 3.1 Flash Lite`（500 RPD 擔當快速備援）能夠輸出可供前端 `Recharts` 繪圖的精準數據，我們在呼叫 API 時必須強制注入 **Response Schema**。

### API 請求配置範例

```typescript
import { GoogleGenAI, SchemaType } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: userStoredKey });

// 定義希望大模型回傳的 JSON 規格
const analyticsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    work_anxiety: { type: SchemaType.INTEGER, description: "職場焦慮程度，0至10" },
    relationship_clinging: { type: SchemaType.INTEGER, description: "感情或人際關係執著度，0至10" },
    existential_emptiness: { type: SchemaType.INTEGER, description: "存在虛無、虛度光陰感，0至10" },
    health_fear: { type: SchemaType.INTEGER, description: "身體病痛或死亡恐懼度，0至10" },
    acute_emotion: { type: SchemaType.INTEGER, description: "突發性急性情緒失控度，0至10" },
    mind_summary: { type: SchemaType.STRING, description: "一字千金的今日心靈狀態一句話總結" },
    recommended_segment: { type: SchemaType.STRING, description: "最推薦的心經章節編號，如 segment_1" }
  },
  required: ["work_anxiety", "relationship_clinging", "existential_emptiness", "health_fear", "acute_emotion", "mind_summary"]
};

// 呼叫評估管道
async function pipelineChatToAnalytics(chatContent: string) {
  const response = await ai.models.generateContent({
    model: "gemma-4-31b", // 使用高配額、高推理的 Gemma 4
    contents: `請評估以下使用者的內心困惑對話，並將其轉化為量化指標："${chatContent}"`,
    config: {
      systemInstruction: "你是一位精通心經與數據分析的心理學導師。請理性、客觀地為使用者的字裡行間進行情緒特徵工程提取。",
      responseMimeType: "application/json",
      responseSchema: analyticsSchema,
      thinking: true // 啟用 Gemma 4 的內建推理模式（Reasoning Mode）
    }
  });

  return JSON.parse(response.text);
}

```

---

## 4. 「個人化每日覺察導引」數據流 (Daily Insight Flow)

這是大幅拉高使用者黏著度的核心儀式感功能，完全在地端異步運作：

```
[使用者清晨/當日首次開屏] 
       │
 [Step 1: 檢查] ────> 偵測今日 (YYYY-MM-DD) 的 `analytics` 資料表是否已有資料？
       │             ├── 有：直接渲染今日處方箋頁面。
       │             └── 沒有：觸發 Step 2。
       ▼
 [Step 2: 聚合] ────> 從 IndexedDB 撈取過去 7 天的歷史指標：`db.analytics.limit(7).toArray()`。
       │             └── 計算出平均最高分之苦惱維度（例如：`health_fear` 平均高達 8.2 分）。
       ▼
 [Step 3: 生成] ────> 呼叫大模型，注入 Context。
       │             └── Prompt: "偵測到使用者本週受『健康病痛』折磨最深。請調用 Sutra-DB 的 segment_1，
       │                          為他生成一段 80 字的溫柔晨間覺察提醒。"
       ▼
 [Step 4: 持久化] ──> 將生成的文字與初始化的今日指標，寫入 `db.analytics.put()`。
       │
 [Step 5: 渲染] ────> 搭配 Zen UI "Ink-Drop Rendering" 動畫緩慢浮現，敲擊地端磬聲。

```

---

## 5. 數據分析與視覺化面板 (The Mind Mirror)

在前端利用 `Recharts` 讀取 `db.analytics.toArray()`。

* **心鏡雷達圖 (Radar Chart):** 展示使用者在五個維度上的「執著分布圖」。幫助使用者客觀「照見」自己的痛苦分布。
* **空性趨勢線 (Trend Line):** 將五個指標相加求平均值（定義為 $執著指數$）。當隨著使用時間拉長，平均曲線逐漸下滑時，視覺化呈現「度一切苦厄」的量化成就感。

---

## 6. 禪意 UI/UX 動態技術規格 (Framer Motion)

為了消除「大數據分析」與「AI」帶來的冰冷科技感，動態設計必須滿足以下工程指標：

```json
{
  "loader_animation": {
    "type": "Breathing Scale & Opacity",
    "frequency": "0.12 Hz (每 8 秒一個完整呼吸循環，吸氣 4 秒、呼氣 4 秒)",
    "css_property": "scale: 1.0 -> 1.15 -> 1.0; filter: drop-shadow(0 0 8px rgba(140,120,81,0.3))"
  },
  "ink_drop_text": {
    "type": "Staggered Letter Reveal with Blur",
    "stagger_delay": "0.05s per character",
    "initial_state": "opacity: 0, filter: blur(12px), y: 5px",
    "animate_state": "opacity: 1, filter: blur(0px), y: 0px",
    "transition": "easeOut, duration: 0.8s"
  },
  "sand_art_disposal": {
    "type": "AnimatePresence Layout Exit",
    "duration": "1.2s",
    "exit_state": "opacity: 0, scale: 1.2, filter: blur(15px) grayscale(100%)",
    "psychological_effect": "象徵物質與情緒由實轉空，隨風消逝"
  }
}

```

---

## 7. 結論與系統擴充性 (Architect's Note)

這套 v2.0 架構達成了開發者與使用者的雙贏。對身為開發者的你來說，**維運成本為 0、個資合規風險為 0**；對使用者來說，所有的煩惱隱私都鎖在自己的手機裡，且獲得了一個能夠將古典智慧與量化心理學完美結合的專屬空間。

這份升級後的 v2.0 架構設計文件，是否已經完全滿足你對於這個 PWA 應用的工程藍圖？如果你想開始動工，我們可以直接來寫 **`src/services/db.ts` (Dexie 完整初始化代碼)**，或者是寫 **「每日引導功能」的完整 React Custom Hook**？
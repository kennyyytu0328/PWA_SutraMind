這是一份經過深度整合與工程重構後的 **《SutraMind PWA：智慧心經導師》設計文件 (v1.1)**。

這份文件現在納入了更強大的 AI 模型選擇、具體的心理困惑預設邏輯，以及完整的 Zen UI/UX 規範，專為身為全端架構師的你量身打造。

---

# 📜 SutraMind PWA 系統設計文件 (v1.1)

## 1. 產品願景 (Product Vision)
透過「無後端 (Serverless)」架構，建立一個極致私密的數位心靈空間。利用 Google Gemini 的長文本理解能力，將《心經》空性哲理與使用者現實痛苦進行 **語意映射 (Semantic Mapping)**，提供即時的心理重構與解惑。

## 2. 進階技術棧 (Advanced Tech Stack)
* **AI Engine (BYOK & Model Tiering):**
    * **Gemini 2.5 Flash:** 預設選用。用於深度心理分析與具備溫度的同理心對話。
    * **Gemini 3.1 Flash Lite:** 可選模式。用於追求極致回應速度與多模態交互的實驗場景。
* **Frontend & PWA:**
    * **Next.js (Static Export):** 確保 CSR (Client-Side Rendering) 效能與 PWA Service Worker 的離線能力。
    * **Tailwind CSS:** 實現自定義的「禪意設計系統」。
* **State & Storage:**
    * **Dexie.js (IndexedDB):** 負責 `API_KEY`、`SessionPersistence` 與使用者本地對話日誌。
    * **In-memory JSON:** 存放 `Sutra-DB.json`。

## 3. 輸入感知設計 (Input Sensing & Dilemma Mapping)
除了使用者自行輸入外，系統預設的「人生五大苦惱」選單，每個選單對應不同的 Inference Strategy 如下：類別 (Category)對應經文模組 (Sutra-DB Mapping)預設常見困惑選項 (User Presets)

類別 (Category),預設常見困惑選項 (Presets),推理策略重點 (Inference Logic)  
職場與成就,不甘心回報不足、職涯迷茫、同儕比較。,解構「得失心」，強調「無所得」的過程價值。  
情感與關係,分手遺憾、關係孤獨、溝通耗竭。,強化「心無罣礙」，引導使用者建立健康的心理邊界。  
自我與存在,年齡焦慮、生活空虛、意義喪失。,回歸「不生不滅」，打破對自我形象的固化執著。  
健康與病痛,長期疼痛、死亡恐懼、病後無法接受。,實施「主客體分離」，觀察病痛而非成為病痛。  
突發性情緒,資訊過載、莫名的憤怒或悲傷。,利用「六根清淨」進行情緒阻斷，回歸當下覺知。

## 4. 禪意 UI/UX 規範 (Zen Design System)
我們不只是在做 App，是在營造一個「數位道場」。

### A. 視覺規範 (Visual Specification)
* **空間 (Space):** 採用大比例的 **Negative Space (負空間)**。組件間距遵循 $2^n$ 比例，但基礎單位設定較大 (如 `p-8` 或 `p-12`)。
* **排版 (Typography):**
    * `Title/Quote`: `font-serif` (如 Noto Serif TC)，傳遞經典與權威感。
    * `Body/UI`: `font-sans` (如 Noto Sans TC)，確保資訊傳達的效率與現代感。
* **色彩 (Palette):**
    * `Background`: `#121212` (深灰而非全黑，減少視覺殘留)。
    * `Surface`: `#1E1E1E` (用於卡片，與背景產生微小深度差)。
    * `Primary Text`: `#EAE0D5` (溫潤的羊皮紙色，降低強光刺激)。

### B. 微交互與感知 (Micro-interactions)
* **Breathing Loader:** 呼叫 API 時，中央出現一個擴散的圓環光暈（CSS `animate-pulse`），頻率與人類深呼吸同步（約 5 秒一次）。
* **Ink-Drop Rendering:** 訊息生成採用逐步顯現效果，模擬水墨在紙張上暈染的質感，而非生硬的打字機效果。
* **Sand-Art Disposal:** 當使用者選擇「放下並結束對話」時，使用 Canvas 或 CSS Filter 製作粒子化效果，讓文字如同沙子般隨風散去。

### C. 動畫實作清單

* **Breathing Loader (呼吸引導):** 實作: 使用 Tailwind animate-ping 結合自定義的 5s 週期曲線。

效果: API 加載時顯示擴散圓環，引導使用者同步進行深呼吸。

* **Ink-Drop Rendering (水墨暈染):** 實作: Framer Motion 的 staggerChildren 結合 filter: blur()。

效果: 文字像墨水滴入宣紙，從模糊到清晰逐字浮現，降低閱讀壓迫感。

* **Sand-Art Disposal (粒子消散):** 實作: Framer Motion 的 exit 屬性，結合 scale: 1.2 與 filter: opacity(0) blur(10px)。

效果: 當使用者點擊「清空/放下」時，對話泡泡如同沙畫被微風吹散。

---

# 📦 核心靜態資料庫 (Sutra-DB.json)

```json
[
  {
    "id": "segment_1",
    "original": "觀自在菩薩，行深般若波羅蜜多時，照見五蘊皆空，度一切苦厄。",
    "vernacular": "當你能夠運用深層智慧觀察時，會發現構成『我』的身心元素（色受想行識）本質皆為虛幻流動。看透這點，便能從感官與心理的痛苦中解脫。",
    "keywords": ["五蘊皆空", "覺察", "主客體分離"],
    "therapeutic_focus": "解除對『自我』受傷感的執著；在病痛中實現『痛而不苦』的觀察。"
  },
  {
    "id": "segment_2",
    "original": "舍利子！色不異空，空不異色；色即是空，空即是色；受想行識，亦復如是。",
    "vernacular": "物質現象與本質虛空沒有區別。現象即是本質，本質即是現象。你的焦慮感受與大腦劇場只是暫時出現的現象，並非永恆的實體。",
    "keywords": ["色空不二", "去標籤化"],
    "therapeutic_focus": "處理過度解讀與執著；將身體病痛視為中性的生理現象變化。"
  },
  {
    "id": "segment_3",
    "original": "舍利子！是諸法空相，不生不滅，不垢不淨，不增不減。",
    "vernacular": "世間萬物的本質是中性的。事情本身沒有所謂的生滅、垢淨或得失。這一切標籤都是心識強加的。",
    "keywords": ["不生不滅", "中性觀察"],
    "therapeutic_focus": "打破二元對立；緩解對『完美狀態』的執著與身體劣化的恐懼。"
  },
  {
    "id": "segment_4",
    "original": "是故空中無色，無受想行識，無眼耳鼻舌身意，無色聲香味觸法，無眼界，乃至無意識界。",
    "vernacular": "在純粹的覺知中，不要被眼睛看到的假象、耳朵聽到的批評、或是大腦產生的妄想所束縛。試著回到感官尚未給出反應前的平靜狀態。",
    "keywords": ["六根清淨", "感官遮斷", "資訊降噪"],
    "therapeutic_focus": "當受到外界批評、人際摩擦或資訊過載時，引導其回歸內心平靜與情緒阻斷。"
  },
  {
    "id": "segment_5",
    "original": "無無明，亦無無明盡，乃至無老死，亦無老死盡。無苦集滅道，無智亦無得。",
    "vernacular": "沒有永遠消除不掉的愚昧，也沒有所謂的『老死』能真正困住你。甚至連追求『開悟』或『解決問題』的念頭都要放下，不再渴求得到，便已解脫。",
    "keywords": ["無所得", "放下目標焦慮", "超越生死"],
    "therapeutic_focus": "緩解對進度、成就、人生意義的過度追求，以及對衰老與死亡的深層焦慮。"
  },
  {
    "id": "segment_6",
    "original": "以無所得故，菩提薩埵，依般若波羅蜜多故，心無罣礙。無罣礙故，無有恐怖，遠離顛倒夢想，究竟涅槃。",
    "vernacular": "正因為了解『沒什麼好失去，也沒什麼好得到』，內心便不再有牽掛。沒有牽掛自然沒有恐懼，遠離不切實際的幻想，回歸絕對的寧靜。",
    "keywords": ["無罣礙", "遠離恐怖", "心靈自由"],
    "therapeutic_focus": "處理強迫症、未來焦慮、未知恐懼，以及對失敗與失去的嚴重執著。"
  },
  {
    "id": "segment_7",
    "original": "三世諸佛，依般若波羅蜜多故，得阿耨多羅三藐三菩提。",
    "vernacular": "過去、現在、未來的所有覺悟者，也都是依靠這種究竟的智慧，才得到了最高、最圓滿的平靜與覺醒。",
    "keywords": ["覺悟", "普世真理", "信心建立"],
    "therapeutic_focus": "在使用者極度自我懷疑或感到孤立無援時，提供一種宏大的普世連結感與安心感。"
  },
  {
    "id": "segment_8",
    "original": "故知般若波羅蜜多，是大神咒，是大明咒，是無上咒，是無等等咒，能除一切苦，真實不虛。",
    "vernacular": "這份究竟的智慧，是具有強大轉化力量的語言，能破除黑暗，是無可比擬的法則。它能消除一切煩惱痛苦，這點真實不虛。",
    "keywords": ["轉化力量", "除一切苦", "信念"],
    "therapeutic_focus": "增強心理暗示，提升使用者對接下來行動建議的接受度與執行力。"
  },
  {
    "id": "segment_9",
    "original": "故說般若波羅蜜多咒，即說咒曰：揭諦揭諦，波羅揭諦，波羅僧揭諦，菩提薩婆訶。",
    "vernacular": "去吧！勇敢地跨越煩惱的河流，走向智慧的彼岸。大家一起努力，成就覺悟的人生！",
    "keywords": ["行動力", "祝福", "圓滿"],
    "therapeutic_focus": "將情緒轉化為具體的行動練習（如立刻放下手機、進行正念呼吸等）。"
  }
]
```

---

## 5. 系統啟動指令 (System Instruction Injection)
這段 Prompt 將作為 API Request 的核心，賦予 Gemini 靈魂：

> **System Instruction:**
> "你是一位融合了佛學大乘智慧與現代認知行為治療 (CBT) 的數位導師。你的核心知識庫來自於傳入的 `Sutra-DB.json`。
> 當使用者分享他們的困惑時，你必須遵循：
> 1. **深層聽解 (Deep Listening):** 識別使用者在情緒中展現的『執著點』。
> 2. **經文映射 (Sutra Mapping):** 從 JSON 中挑選 1-2 個最符合該執著點的 segment，引用原文並結合使用者的情境進行『現代化詮釋』。
> 3. **去標籤化 (De-labeling):** 引導使用者看清『苦』與『我』的空性，降低情緒的實體感。
> 4. **禪意回覆 (Zen Response):** 文字必須優雅、寧靜且具備前瞻性。嚴禁說教，改以『引導發問』或『覺察練習』結尾。"

## 6. 部署規劃 (Deployment)
Hosting: Github Pages (Static Assets)。

Privacy: 嚴格執行 BYOK 模式，不設置中央伺服器，對話紀錄本地加密存儲。
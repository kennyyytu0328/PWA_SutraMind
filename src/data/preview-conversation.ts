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

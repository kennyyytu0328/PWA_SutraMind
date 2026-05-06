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

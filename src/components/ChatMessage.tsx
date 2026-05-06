'use client'
import { useState } from 'react'
import type { ChatMessage as ChatMessageType } from '@/types/chat'
import { SegmentReference } from './SegmentReference'
import { InkDropText, type InkDropMode } from './InkDropText'

interface Props {
  message: ChatMessageType
  revealMode?: InkDropMode
}

export function ChatMessage({ message, revealMode = 'static' }: Props) {
  const isUser = message.role === 'user'
  const [skipped, setSkipped] = useState(false)
  const [revealComplete, setRevealComplete] = useState(
    revealMode === 'static' || isUser
  )

  const handleClick = () => {
    if (!isUser && revealMode === 'live' && !skipped) {
      setSkipped(true)
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        data-testid="msg-bubble"
        onClick={handleClick}
        className={`max-w-[85%] rounded-lg px-5 py-4 ${
          isUser
            ? 'bg-zen-accent/15 text-zen-text'
            : 'bg-zen-surface text-zen-text'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <InkDropText
            text={message.content}
            mode={revealMode}
            skip={skipped}
            onComplete={() => setRevealComplete(true)}
          />
        )}
        {!isUser && message.referencedSegmentIds && (
          <div
            className="transition-opacity duration-200"
            style={{ opacity: revealComplete ? 1 : 0 }}
          >
            <SegmentReference ids={message.referencedSegmentIds} />
          </div>
        )}
        {!isUser && message.closingPractice && (
          <p
            className="mt-3 text-sm text-zen-accent border-t border-zen-muted/20 pt-3 transition-opacity duration-200"
            style={{ opacity: revealComplete ? 1 : 0 }}
          >
            ∙ {message.closingPractice}
          </p>
        )}
      </div>
    </div>
  )
}

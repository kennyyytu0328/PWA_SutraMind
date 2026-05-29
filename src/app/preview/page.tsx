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

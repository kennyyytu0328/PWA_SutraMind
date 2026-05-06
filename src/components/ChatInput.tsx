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

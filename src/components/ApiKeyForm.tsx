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

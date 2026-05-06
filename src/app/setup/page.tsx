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

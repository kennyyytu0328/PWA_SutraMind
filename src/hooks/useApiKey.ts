'use client'
import { useEffect, useState } from 'react'
import { loadApiKey, saveApiKey, clearApiKey } from '@/lib/db'

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadApiKey().then((k) => {
      setApiKey(k)
      setLoading(false)
    })
  }, [])

  async function save(value: string) {
    await saveApiKey(value)
    setApiKey(value)
  }

  async function clear() {
    await clearApiKey()
    setApiKey(null)
  }

  return { apiKey, loading, save, clear }
}

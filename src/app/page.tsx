'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApiKey } from '@/hooks/useApiKey'
import { abandonStaleActiveSessions } from '@/lib/db'

export default function HomePage() {
  const router = useRouter()
  const { apiKey, loading } = useApiKey()

  useEffect(() => {
    abandonStaleActiveSessions().catch(() => {})
  }, [])

  useEffect(() => {
    if (loading) return
    if (apiKey) router.replace('/categories')
    else router.replace('/setup')
  }, [apiKey, loading, router])

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 rounded-full bg-zen-accent/30 animate-breath" />
    </div>
  )
}

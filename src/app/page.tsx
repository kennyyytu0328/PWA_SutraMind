'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApiKey } from '@/hooks/useApiKey'
import { abandonStaleActiveSessions } from '@/lib/db'
import { WelcomeLanding } from '@/components/WelcomeLanding'

export default function HomePage() {
  const router = useRouter()
  const { apiKey, loading } = useApiKey()

  useEffect(() => {
    abandonStaleActiveSessions().catch(() => {})
  }, [])

  useEffect(() => {
    if (loading) return
    if (apiKey) router.replace('/categories')
  }, [apiKey, loading, router])

  // While loading, or when a key exists (redirect to /categories is in flight),
  // show the breath loader so the landing never flashes at a returning user.
  if (loading || apiKey) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-zen-accent/30 animate-breath" />
      </div>
    )
  }

  return <WelcomeLanding />
}

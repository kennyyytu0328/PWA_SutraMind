'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CategoryGrid } from '@/components/CategoryGrid'
import { isCategoryEnabled } from '@/lib/categories'
import { createSession } from '@/lib/db'
import type { CategoryId } from '@/types/chat'

export default function CategoriesPage() {
  const router = useRouter()

  async function handleSelect(id: CategoryId) {
    if (!isCategoryEnabled(id)) return
    const sessionId = await createSession(id)
    router.push(`/chat?sessionId=${sessionId}`)
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl">此刻，是什麼讓你停留？</h1>
        <nav className="flex items-center gap-4 text-sm text-zen-muted">
          <Link href="/mirror" className="hover:text-zen-accent">
            心鏡 →
          </Link>
          <Link href="/history" className="hover:text-zen-accent">
            歷史 →
          </Link>
        </nav>
      </header>
      <CategoryGrid onSelect={handleSelect} />
    </div>
  )
}

import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'SutraMind — 智慧心經導師',
  description: '一個極致私密的數位心靈空間。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hant">
      <body className="bg-zen-bg text-zen-text antialiased">
        <main className="min-h-screen mx-auto max-w-2xl px-6 py-12">
          {children}
        </main>
      </body>
    </html>
  )
}

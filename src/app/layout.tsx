import type { Metadata, Viewport } from 'next'
import { LotusSymbol } from '@/components/Lotus'
import { AppHeader } from '@/components/AppHeader'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'
import '@/styles/globals.css'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export const metadata: Metadata = {
  title: 'SutraMind — 智慧心經導師',
  description: '一個極致私密的數位心靈空間。',
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${BASE_PATH}/icons/icon.svg`, type: 'image/svg+xml' },
      { url: `${BASE_PATH}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${BASE_PATH}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: `${BASE_PATH}/icons/icon-192.png`, sizes: '192x192' }],
  },
  appleWebApp: {
    capable: true,
    title: 'SutraMind',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#121212',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hant">
      <body className="bg-zen-bg text-zen-text antialiased min-h-screen">
        <LotusSymbol />
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-12">
          {children}
        </main>
        <RegisterServiceWorker />
      </body>
    </html>
  )
}

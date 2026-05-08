'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    const swUrl = `${basePath}/sw.js`
    const scope = `${basePath}/`

    navigator.serviceWorker.register(swUrl, { scope }).catch((err) => {
      console.error('SW registration failed:', err)
    })
  }, [])

  return null
}

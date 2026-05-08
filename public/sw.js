/* SutraMind Service Worker
 * Strategy:
 *   - App shell (HTML navigations)        : network-first, fall back to cached start_url
 *   - /_next/static/*                     : cache-first (immutable, hashed filenames)
 *   - Audio (.mp3)                        : cache-first, lazy-populated on first request
 *   - Icons / manifest / public assets    : stale-while-revalidate
 *   - generativelanguage.googleapis.com   : never intercepted (always live)
 */

const VERSION = 'v2'
const SHELL_CACHE = `sutramind-shell-${VERSION}`
const STATIC_CACHE = `sutramind-static-${VERSION}`
const AUDIO_CACHE = `sutramind-audio-${VERSION}`
const ALL_CACHES = [SHELL_CACHE, STATIC_CACHE, AUDIO_CACHE]

const SCOPE = self.registration.scope // ends with '/'
const SHELL_URLS = [
  SCOPE,
  `${SCOPE}manifest.webmanifest`,
  `${SCOPE}icons/icon.svg`,
  `${SCOPE}icons/icon-192.png`,
  `${SCOPE}icons/icon-512.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => undefined)
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('sutramind-') && !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isAudio(url) {
  return /\.mp3($|\?)/i.test(url.pathname)
}

function isHashedStatic(url) {
  return url.pathname.startsWith(`${new URL(SCOPE).pathname}_next/static/`)
}

async function networkFirstNavigation(request) {
  try {
    const fresh = await fetch(request)
    if (fresh.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, fresh.clone()).catch(() => undefined)
    }
    return fresh
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    const shell = await caches.match(SCOPE)
    if (shell) return shell
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const fresh = await fetch(request)
  if (fresh.ok) cache.put(request, fresh.clone()).catch(() => undefined)
  return fresh
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone()).catch(() => undefined)
      return res
    })
    .catch(() => cached)
  return cached || networkPromise
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (url.hostname === 'generativelanguage.googleapis.com') return
  if (!isSameOrigin(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isAudio(url)) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE))
    return
  }

  if (isHashedStatic(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
})

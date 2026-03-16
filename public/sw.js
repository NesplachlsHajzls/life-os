// ── Cache version — bump on every deploy that changes JS bundles ──
// Changing this name causes activate to delete all old caches.
const CACHE = 'life-os-v3'
const OFFLINE_URL = '/'

// ── Install: pre-cache offline fallback only ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([OFFLINE_URL]))
  )
  self.skipWaiting()
})

// ── Activate: delete ALL previous caches ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first for HTML & API, cache-first for assets ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  // Only handle same-origin
  if (url.origin !== location.origin) return

  // HTML navigation requests — ALWAYS fetch from network first
  // (prevents stale HTML with wrong script hashes from being served)
  const isNavigation = event.request.mode === 'navigate'
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Next.js static chunks (/_next/static/**) — cache-first
  // These use content hashes so stale files are never a problem
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      })
    )
    return
  }

  // Everything else — network-first with cache fallback
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      try {
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      } catch {
        return (await cache.match(event.request)) || caches.match(OFFLINE_URL)
      }
    })
  )
})

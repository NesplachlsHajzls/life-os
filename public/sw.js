const CACHE = 'life-os-v1'
const OFFLINE_URL = '/'

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([OFFLINE_URL]))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  // Only cache same-origin requests
  if (url.origin !== location.origin) return

  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(event.request)
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) cache.put(event.request, response.clone())
        return response
      }).catch(() => cached || caches.match(OFFLINE_URL))
      return cached || fetchPromise
    })
  )
})

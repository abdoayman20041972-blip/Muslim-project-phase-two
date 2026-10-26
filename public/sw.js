const CACHE_NAME = 'azkar-cache-v6'
const APP_SHELL = ['/', '/manifest.json', '/favicon.svg']
// Pages are fetched network-first so a new deploy shows up on the next visit;
// if the network is slow or offline we fall back to the cached copy.
const NAVIGATION_TIMEOUT_MS = 3500

async function networkFirstNavigation(event, request) {
  const cache = await caches.open(CACHE_NAME)
  const fromCache = async () => (await cache.match(request)) || (await cache.match('/'))
  try {
    let timer
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('navigation-timeout')), NAVIGATION_TIMEOUT_MS)
    })
    const response = await Promise.race([fetch(request), timeout]).finally(() => clearTimeout(timer))
    if (response.ok) {
      event.waitUntil(cache.put(request, response.clone()).catch(() => undefined))
      return response
    }
    if (response.status >= 500) return (await fromCache()) || response
    return response
  } catch {
    return (await fromCache()) || Response.error()
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin
  const quranApi = url.origin === 'https://api.alquran.cloud'
  const fontOrigin = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com'
  if (!sameOrigin && !quranApi && !fontOrigin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event, request))
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok || response.type === 'opaque') {
            const copy = response.clone()
            return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined).then(() => response)
          }
          return response
        })
        .catch(() => cached)
      event.waitUntil(refresh.catch(() => undefined))
      return cached || refresh
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client)
      if (existing) {
        return existing.focus().then(() => existing.postMessage({
          type: 'notification-click',
          url: targetUrl,
        }))
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})

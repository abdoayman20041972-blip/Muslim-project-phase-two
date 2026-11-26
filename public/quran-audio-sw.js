/**
 * Quran audio runtime cache (service worker).
 *
 * Scope: cross-origin per-ayah recitation audio (cdn.islamic.network) only.
 * Same-origin app traffic is never intercepted. The CDN sends no CORS headers,
 * so page-context fetch caching is impossible - but media element responses
 * need no CORS, and a service worker may store and re-serve them (opaque
 * included). This is what lets memorization drills replay previously played
 * ayahs while offline, without pretending page fetch() could do it.
 *
 * Media elements often send Range requests; 206 responses may not be stored,
 * so the full file is fetched without a Range header and stored in the
 * background the first time an ayah plays.
 */
const CACHE = 'quran-ayah-audio-v1'
const AUDIO_HOST = 'cdn.islamic.network'
const AUDIO_PATH = '/quran/audio/'
const MAX_ENTRIES = 800

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

async function trim(cache) {
  const keys = await cache.keys()
  for (let i = 0; i <= keys.length - MAX_ENTRIES; i++) await cache.delete(keys[i])
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.hostname !== AUDIO_HOST || !url.pathname.startsWith(AUDIO_PATH)) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const hit = await cache.match(event.request.url)
    if (hit) return hit
    try {
      const response = await fetch(event.request)
      if (response.status !== 206) {
        const store = fetch(event.request.url, { mode: 'no-cors', credentials: 'omit' })
          .then(async (full) => {
            if (full.status === 200 || full.type === 'opaque') {
              await cache.put(event.request.url, full)
              await trim(cache)
            }
          })
          .catch(() => { /* Storage full or denied: playback continues, nothing claimed. */ })
        event.waitUntil(store)
      }
      return response
    } catch (error) {
      // Offline: serve the stored copy when one exists, otherwise fail as-is.
      const stored = await cache.match(event.request.url)
      if (stored) return stored
      throw error
    }
  })())
})

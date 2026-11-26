/**
 * Local audio reuse for memorization drills - honest semantics.
 *
 * The per-ayah CDN (cdn.islamic.network) sends no CORS headers, so a page
 * context fetch() of the audio fails while the media element plays it fine.
 * Real offline reuse therefore goes through a tiny service worker
 * (public/quran-audio-sw.js): it re-serves audio responses it has seen from
 * Cache Storage and stores a full copy of every ayah played through the app.
 * Media responses need no CORS, so this works where fetch() cannot.
 *
 * Nothing here promises availability: countCachedMemorizeAudio checks what is
 * actually stored before a drill claims it can run offline.
 */

export const QURAN_AUDIO_CACHE = 'quran-ayah-audio-v1'

async function openCache(): Promise<Cache | null> {
  try {
    if (typeof caches === 'undefined') return null
    return await caches.open(QURAN_AUDIO_CACHE)
  } catch {
    return null
  }
}

/**
 * Best-effort registration of the audio caching service worker. Resolves
 * false when service workers are unavailable or registration fails; drills
 * then simply work online-only and the offline preflight blocks honestly.
 */
export async function registerQuranAudioCache(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
    const registration = await navigator.serviceWorker.register('/quran-audio-sw.js')
    return !!registration
  } catch {
    return false
  }
}

/**
 * How many of the given ayah URLs have a verified stored copy on this device.
 * Drives the preflight that tells the user a drill needs internet BEFORE it
 * starts; a URL only counts when Cache Storage really holds it.
 */
export async function countCachedMemorizeAudio(urls: string[]): Promise<number> {
  const cache = await openCache()
  if (!cache) return 0
  let count = 0
  for (const url of urls) {
    const hit = await cache.match(url).catch(() => undefined)
    if (hit) count++
  }
  return count
}

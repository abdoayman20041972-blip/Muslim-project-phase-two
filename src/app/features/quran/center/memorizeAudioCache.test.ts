import { beforeEach, describe, expect, it, vi } from 'vitest'
import { countCachedMemorizeAudio, registerQuranAudioCache, QURAN_AUDIO_CACHE } from './memorizeAudioCache'

function fakeCacheStorage() {
  const stores = new Map<string, Map<string, Response>>()
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)!
    return {
      match: async (url: string) => store.get(url),
      put: async (url: string, response: Response) => { store.set(url, response) },
    } as unknown as Cache
  }
  return { open, store: (name: string) => stores.get(name) }
}

const url = 'https://cdn.islamic.network/quran/audio/128/ar.minshawi/8.mp3'

beforeEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('registerQuranAudioCache', () => {
  it('registers the audio service worker when supported', async () => {
    const register = vi.fn(async () => ({ scope: '/' }))
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { register } })
    expect(await registerQuranAudioCache()).toBe(true)
    expect(register).toHaveBeenCalledWith('/quran-audio-sw.js')
  })

  it('reports false instead of throwing when service workers are unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: undefined })
    expect(await registerQuranAudioCache()).toBe(false)
  })

  it('reports false when registration fails (drills stay online-only)', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { register: vi.fn(async () => { throw new Error('denied') }) } })
    expect(await registerQuranAudioCache()).toBe(false)
  })
})

describe('countCachedMemorizeAudio', () => {
  it('counts only URLs with a verified stored copy', async () => {
    const storage = fakeCacheStorage()
    vi.stubGlobal('caches', storage)
    const cache = await storage.open(QURAN_AUDIO_CACHE)
    await cache.put(url, new Response('x', { status: 200 }))
    expect(await countCachedMemorizeAudio([url, 'https://cdn.islamic.network/quran/audio/128/ar.minshawi/9.mp3'])).toBe(1)
  })

  it('reports zero when Cache Storage is unavailable - never claims availability', async () => {
    vi.stubGlobal('caches', undefined)
    expect(await countCachedMemorizeAudio([url])).toBe(0)
  })
})

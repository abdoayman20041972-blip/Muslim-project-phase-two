import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'

const swSource = readFileSync(resolve(__dirname, '../../public/sw.js'), 'utf-8')

type Res = { ok: boolean; status: number; type: string; tag: string; clone(): Res }
const res = (tag: string, status = 200): Res => ({
  ok: status >= 200 && status < 300,
  status,
  type: 'basic',
  tag,
  clone() {
    return this
  },
})

function loadSw(fetchImpl: (req: unknown) => Promise<Res>) {
  const listeners: Record<string, (e: any) => void> = {}
  const stores = new Map<string, Map<string, Res>>()
  const keyOf = (r: any) => (typeof r === 'string' ? new URL(r, 'https://app.test').href : r.url)
  const makeCache = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const m = stores.get(name)!
    return {
      match: async (r: any) => m.get(keyOf(r)),
      put: async (r: any, v: Res) => void m.set(keyOf(r), v),
      addAll: async () => undefined,
    }
  }
  const caches = {
    open: async (n: string) => makeCache(n),
    match: async (r: any) => {
      for (const m of stores.values()) if (m.has(keyOf(r))) return m.get(keyOf(r))
    },
    keys: async () => [...stores.keys()],
    delete: async (n: string) => stores.delete(n),
  }
  const self: any = {
    location: { origin: 'https://app.test' },
    addEventListener: (t: string, fn: (e: any) => void) => void (listeners[t] = fn),
    skipWaiting: () => undefined,
    clients: { claim: () => undefined, matchAll: async () => [], openWindow: async () => undefined },
  }
  const ctx = vm.createContext({
    self, caches, fetch: fetchImpl, URL,
    Response: { error: () => res('network-error', 0) },
    setTimeout: (...a: any[]) => (setTimeout as any)(...a),
    clearTimeout: (...a: any[]) => (clearTimeout as any)(...a),
  })
  vm.runInContext(swSource, ctx)
  const navigate = async (url = 'https://app.test/') => {
    let out: Promise<Res> | undefined
    listeners.fetch({
      request: { method: 'GET', url, mode: 'navigate' },
      respondWith: (p: Promise<Res>) => void (out = p),
      waitUntil: () => undefined,
    })
    return out!
  }
  return { listeners, stores, navigate, makeCache }
}

afterEach(() => vi.useRealTimers())

const seed = async (sw: ReturnType<typeof loadSw>, tag: string) =>
  (await sw.makeCache('azkar-cache-v6')).put('https://app.test/', res(tag))

describe('service worker page navigation', () => {
  it('uses the v6 cache name', () => {
    expect(swSource).toContain("CACHE_NAME = 'azkar-cache-v6'")
  })

  it('serves the fresh network page even when an older copy is cached', async () => {
    const sw = loadSw(async () => res('new'))
    await seed(sw, 'old')
    expect((await sw.navigate()).tag).toBe('new')
  })

  it('falls back to the cached page when offline', async () => {
    const sw = loadSw(async () => {
      throw new Error('offline')
    })
    await seed(sw, 'cached')
    expect((await sw.navigate()).tag).toBe('cached')
  })

  it('falls back to the cached shell for an uncached route when offline', async () => {
    const sw = loadSw(async () => {
      throw new Error('offline')
    })
    await seed(sw, 'shell')
    expect((await sw.navigate('https://app.test/quran')).tag).toBe('shell')
  })

  it('falls back to the cached page when the network is too slow', async () => {
    vi.useFakeTimers()
    const sw = loadSw(() => new Promise(() => undefined))
    await seed(sw, 'cached')
    const pending = sw.navigate()
    await vi.advanceTimersByTimeAsync(3600)
    expect((await pending).tag).toBe('cached')
  })

  it('uses the cache on a server error but passes a 404 through', async () => {
    const boom = loadSw(async () => res('boom', 503))
    await seed(boom, 'cached')
    expect((await boom.navigate()).tag).toBe('cached')
    const missing = loadSw(async () => res('nf', 404))
    await seed(missing, 'cached')
    expect((await missing.navigate()).tag).toBe('nf')
  })

  it('deletes the old v5 cache on activate', async () => {
    const sw = loadSw(async () => res('x'))
    await sw.makeCache('azkar-cache-v5')
    await sw.makeCache('azkar-cache-v6')
    let done: Promise<unknown> | undefined
    sw.listeners.activate({ waitUntil: (p: Promise<unknown>) => void (done = p) })
    await done
    expect([...sw.stores.keys()]).toEqual(['azkar-cache-v6'])
  })
})

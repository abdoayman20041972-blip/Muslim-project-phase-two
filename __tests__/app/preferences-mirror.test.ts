import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: store.has(key) ? store.get(key)! : null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      store.set(key, value)
    },
    remove: async ({ key }: { key: string }) => {
      store.delete(key)
    },
    keys: async () => ({ keys: [...store.keys()] }),
  },
}))

const KEY = 'azkar_daily_ayah_time'

describe('preferences mirror', () => {
  beforeEach(() => {
    store.clear()
    localStorage.clear()
    sessionStorage.clear()
    vi.resetModules()
  })

  it('first run only mirrors existing values and marks the migration done', async () => {
    localStorage.setItem(KEY, '10:30')
    const mirror = await import('../../src/app/features/storage/preferencesMirror')
    expect(await mirror.restorePreferencesMirror()).toBe(false)
    expect(store.get(KEY)).toBe('10:30')
    expect(store.get('muslim_mirror_v1_done')).toBe('1')
  })

  it('restores keys that disappeared from localStorage and reloads once', async () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, configurable: true })
    store.set('muslim_mirror_v1_done', '1')
    store.set(KEY, '07:45')
    const mirror = await import('../../src/app/features/storage/preferencesMirror')
    expect(await mirror.restorePreferencesMirror()).toBe(true)
    expect(localStorage.getItem(KEY)).toBe('07:45')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not overwrite a value that still exists in localStorage', async () => {
    store.set('muslim_mirror_v1_done', '1')
    store.set(KEY, '07:45')
    localStorage.setItem(KEY, '09:00')
    const mirror = await import('../../src/app/features/storage/preferencesMirror')
    await mirror.restorePreferencesMirror()
    expect(localStorage.getItem(KEY)).toBe('09:00')
  })

  it('sync copies changes and removes keys deleted during the session', async () => {
    const mirror = await import('../../src/app/features/storage/preferencesMirror')
    localStorage.setItem(KEY, '11:00')
    await mirror.syncPreferencesMirror()
    expect(store.get(KEY)).toBe('11:00')
    localStorage.removeItem(KEY)
    await mirror.syncPreferencesMirror()
    expect(store.has(KEY)).toBe(false)
  })
})

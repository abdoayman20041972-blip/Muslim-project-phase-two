import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))

describe('native prayer timings (local calculation first)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
  })

  it('works with no network and includes Sunset for the evening azkar', async () => {
    const { getTimings } = await import('../../src/app/features/prayer/prayerTimings')
    const timings = await getTimings({ lat: 30.0444, lng: 31.2357 }, new Date(2026, 9, 26))
    expect(timings).not.toBeNull()
    for (const key of ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Sunset']) {
      expect(timings![key]).toMatch(/^\d{2}:\d{2}$/)
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('parsePrayerTime tolerates a missing value instead of throwing', async () => {
    const { parsePrayerTime } = await import('../../src/app/features/prayer/prayerTimes')
    expect(parsePrayerTime(undefined, new Date())).toBeNull()
    expect(parsePrayerTime('05:12 (EET)', new Date(2026, 9, 26))?.getHours()).toBe(5)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { loadStations } from './radioData'
import { cleanStationName, normalizeStations, orderedStations } from './radioData'

const payload = { radios: [
  { id: 108, name: 'العامة - متنوعة لمختلف القراء', url: 'https://backup.qurango.net/radio/mix' },
  { id: 79, name: 'مشاري العفاسي', url: 'https://backup.qurango.net/radio/mishary_alafasi' },
  { id: 109046, name: 'ترجمة معاني القرآن باللغة الإنجليزية', url: 'https://backup.qurango.net/radio/translation_quran_english_basit' },
  { id: 21114, name: 'في ظلال السيرة النبوية--- ', url: 'https://backup.qurango.net/radio/fi_zilal_alsiyra' },
  { id: 5, name: 'insecure', url: 'http://example.com/x' },
  { id: 6, name: 'dup', url: 'https://backup.qurango.net/radio/mix' },
] }

describe('radio data', () => {
  it('keeps https stations, drops translations and duplicates, and cleans names', () => {
    const list = normalizeStations(payload)
    expect(list.map((s) => s.id)).toEqual([108, 79, 21114])
    expect(list[2].name).toBe('في ظلال السيرة النبوية')
    expect(cleanStationName('***قصص الأنبياء***')).toBe('قصص الأنبياء')
  })
  it('pins featured on "all" and filters by group and search', () => {
    const list = normalizeStations(payload)
    const all = orderedStations(list, 'all', '')
    expect(all.featured.map((s) => s.id)).toEqual([108, 79])
    expect(all.learn.map((s) => s.id)).toEqual([21114])
    expect(orderedStations(list, 'seerah', '').rest.map((s) => s.id)).toEqual([21114])
    expect(orderedStations(list, 'all', 'مشاري').rest.map((s) => s.id)).toEqual([79])
  })
})

describe('loadStations timeout', () => {
  it('a hung station-list fetch fails fast into the error state instead of loading forever', async () => {
    vi.useFakeTimers()
    try {
      window.localStorage.clear()
      // A fetch that never answers: without the hard timeout the radio screen
      // would stay on «جارٍ تحميل المحطات…» forever.
      vi.stubGlobal('fetch', vi.fn((_input: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        // Never answers on its own; only the abort signal settles it, like a hung connection.
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })))
      const pending = loadStations()
      const outcome = pending.then(
        () => 'resolved',
        () => 'rejected',
      )
      await vi.advanceTimersByTimeAsync(12_500)
      await expect(outcome).resolves.toBe('rejected')
      await pending.catch(() => {})
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
  })
})

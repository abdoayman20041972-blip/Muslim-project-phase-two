import { describe, expect, it } from 'vitest'
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

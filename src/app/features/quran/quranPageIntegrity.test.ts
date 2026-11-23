import { describe, expect, it } from 'vitest'
import pages from './data/quran-pages.json'
import quran from './data/quran-uthmani.json'
import { surahList } from '../../../quran-meta'
import { assertQuranPageMap, groupSurahPages, type QuranPageMap } from './quranPageIntegrity'

const clone = (): QuranPageMap => structuredClone(pages)
const text = quran as Record<string, { number: number; numberInSurah: number; text: string }[]>

describe('complete Quran page map', () => {
  it('contains all 604 Medina pages and 6236 ordered unique references', () => {
    expect(() => assertQuranPageMap(pages, surahList)).not.toThrow()
    expect(Object.keys(pages)).toHaveLength(604)
    expect(Object.values(pages).flat()).toHaveLength(6236)
    expect(new Set(Object.values(pages).flat().map(ayah => ayah.number)).size).toBe(6236)
    expect(pages['1'].map(ayah => ayah.numberInSurah)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it.each(surahList)('groups every ayah of surah $number without omission or blank groups', surah => {
    const ayahs = text[String(surah.number)]
    const groups = groupSurahPages(ayahs, surah.number, pages)
    expect(groups.length).toBeGreaterThan(0)
    const displayed = groups.flatMap(group => {
      expect(group.endIndex).toBeGreaterThanOrEqual(group.startIndex)
      return ayahs.slice(group.startIndex, group.endIndex + 1).map(ayah => ayah.number)
    })
    expect(displayed).toEqual(ayahs.map(ayah => ayah.number))
    for (const group of groups) {
      const expected = (pages as QuranPageMap)[String(group.realPageNumber)]
        .filter(ayah => ayah.surahNumber === surah.number).map(ayah => ayah.number)
      expect(ayahs.slice(group.startIndex, group.endIndex + 1).map(ayah => ayah.number)).toEqual(expected)
    }
  })

  it.each([
    ['original truncated map', (map: QuranPageMap) => { for (let i = 4; i <= 604; i++) delete map[String(i)] }],
    ['missing page', (map: QuranPageMap) => { delete map['300'] }],
    ['empty page', (map: QuranPageMap) => { map['300'] = [] }],
    ['missing ayah', (map: QuranPageMap) => { map['300'].pop() }],
    ['duplicate ayah', (map: QuranPageMap) => { map['300'][1] = map['300'][0] }],
    ['wrong surah', (map: QuranPageMap) => { map['300'][1].surahNumber = 114 }],
    ['wrong local number', (map: QuranPageMap) => { map['300'][1].numberInSurah = 1 }],
    ['wrong global number', (map: QuranPageMap) => { map['300'][1].number = 0 }],
    ['out of order', (map: QuranPageMap) => { map['300'].reverse() }],
    ['shifted boundary preserving counts', (map: QuranPageMap) => { map['299'].push(map['300'].shift()!) }],
    ['non-canonical page key', (map: QuranPageMap) => { map['0300'] = map['300']; delete map['300'] }],
    ['extra page', (map: QuranPageMap) => { map['605'] = [map['604'][0]] }],
  ] as const)('rejects %s', (_name, corrupt) => {
    const map = clone(); corrupt(map)
    expect(() => assertQuranPageMap(map, surahList)).toThrow()
  })

  it.each([null, [], 'invalid', {}, 42])('rejects invalid map values: %j', value => {
    expect(() => assertQuranPageMap(value, surahList)).toThrow()
  })

  it('rejects incomplete loaded-surah references before rendering pages', () => {
    const map = clone(); map['2'] = []
    expect(groupSurahPages(text['2'], 2, map)).toEqual([])
    expect(groupSurahPages(text['1'], 2, pages)).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import quran from '../quran/data/quran-uthmani.json'
import { azkarCategories } from '../../../azkar-data'

// Skeleton: letters only, alef/hamza/ya variants folded, marks and verse signs dropped.
const skel = (t: string) =>
  t
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱا]/g, '')
    .replace(/[ءئؤ]/g, '').replace(/ى/g, 'ي')
    .replace(/[^\u0621-\u064A]/g, '')

type Ayah = { numberInSurah: number; text: string }
const surahText = (n: number, skipBasmala = true) => {
  const entry = (quran as unknown as Record<string, { ayahs?: Ayah[] } | Ayah[]>)[String(n)]
  const ayahs = Array.isArray(entry) ? entry : entry.ayahs!
  const joined = skel(ayahs.map((a) => a.text).join(' '))
  const bismillah = skel('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ')
  return skipBasmala && joined.startsWith(bismillah) ? joined.slice(bismillah.length) : joined
}
const ayahText = (s: number, a: number) => {
  const entry = (quran as unknown as Record<string, { ayahs?: Ayah[] } | Ayah[]>)[String(s)]
  const ayahs = Array.isArray(entry) ? entry : entry.ayahs!
  return skel(ayahs.find((x) => x.numberInSurah === a)!.text)
}
const cat = (id: string) => azkarCategories.find((c) => c.id === id)!
const threeSurahs = skel('') + surahText(112) + surahText(113) + surahText(114)

describe('phase 1 azkar content', () => {
  for (const id of ['morning', 'evening']) {
    it(`${id} has Ayat al-Kursi matching 2:255 and the three surahs x3`, () => {
      const items = cat(id).items
      const kursi = items.filter((i) => skel(i.text) === ayahText(2, 255))
      expect(kursi.length).toBe(1)
      expect(kursi[0].reference?.url).toContain('quran.com/2/255')
      const three = items.filter((i) => skel(i.text) === threeSurahs)
      expect(three.length).toBe(1)
      expect(three[0].repeat).toBe(3)
    })
  }

  it('sleep item-6 now holds Ikhlas, Falaq and Nas, matching the mushaf', () => {
    const item = cat('sleep').items.find((i) => i.id === 'sleep:item-6')!
    expect(skel(item.text)).toBe(threeSurahs)
    expect(item.repeat).toBe(3)
  })

  it('no azkar text carries raw [ ] dataset brackets or double spaces', () => {
    for (const c of azkarCategories) {
      for (const i of c.items) {
        expect(i.text, i.id).not.toMatch(/[\[\]]/)
        expect(i.text, i.id).not.toMatch(/ {2,}/)
      }
    }
  })

  it('the six formerly bracketed hisn items read as plain text', () => {
    const ids = ['adhan:item-4', 'salah:item-6', 'salah:item-10', 'salah:item-31', 'salah:item-34', 'food:item-6']
    const all = azkarCategories.flatMap((c) => c.items)
    for (const id of ids) expect(all.find((i) => i.id === id), id).toBeTruthy()
    expect(skel(all.find((i) => i.id === 'salah:item-34')!.text).endsWith(skel('رَبِّ الْمَلاَئِكَةِ وَالرُّوحِ'))).toBe(true)
  })
})

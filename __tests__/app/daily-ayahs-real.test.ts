import { describe, expect, it } from 'vitest'
import quran from '../../src/app/features/quran/data/quran-uthmani.json'
import { surahList } from '../../src/quran-meta'
import { DAILY_AYAHS } from '../../src/daily-ayahs'

type Verse = { numberInSurah: number; text: string }
const mushaf = quran as unknown as Record<string, Verse[]>

// The daily list is written in plain spelling, the mushaf file in Uthmani rasm.
// Comparison removes marks and the letters whose spelling differs between the two
// (alef and hamza forms, ya/alef maqsura, ta marbuta, inner waw) but keeps a word's
// first letter, so a missing or extra conjunction (و / ف) still fails.
const skeleton = (text: string) =>
  ' ' +
  text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\uFEFF]/g, '')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const bare = word.replace(/[ٱأإآءاىي]/g, '')
      return bare ? bare[0] + bare.slice(1).replace(/و/g, '') : ''
    })
    .join(' ') +
  ' '

const isExcerpt = (excerpt: string, surahShortName: string, ayah: number) => {
  const surah = surahList.find((item) => item.shortName === surahShortName)
  const verse = surah && mushaf[String(surah.number)]?.find((item) => item.numberInSurah === ayah)
  return Boolean(verse) && skeleton(verse!.text).includes(skeleton(excerpt))
}

describe('daily ayahs are real mushaf excerpts', () => {
  it('has 41 entries, matching the rotation comment', () => {
    expect(DAILY_AYAHS).toHaveLength(41)
  })

  it('every entry is a real excerpt of its surah and ayah in the bundled mushaf', () => {
    const bad = DAILY_AYAHS.filter((item) => !isExcerpt(item.text, item.surah, item.number)).map((item) => `${item.surah} ${item.number}: ${item.text}`)
    expect(bad).toEqual([])
  })

  it('An-Nahl 128 is the real verse text', () => {
    const nahl = DAILY_AYAHS.filter((item) => item.surah === 'النحل' && item.number === 128)
    expect(nahl.map((item) => item.text)).toEqual(['إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوْا وَالَّذِينَ هُم مُّحْسِنُونَ'])
  })

  it('the check itself rejects invented text, a wrong ayah number and a wrong conjunction', () => {
    expect(isExcerpt('أَلَا إِنَّ اللَّهَ مَعَ الْمُتَّقِينَ', 'النحل', 128)).toBe(false)
    expect(isExcerpt('إِنَّ مَعَ الْعُسْرِ يُسْرًا', 'الشرح', 7)).toBe(false)
    expect(isExcerpt('وَاللَّهُ يُحِبُّ الْمُتَّقِينَ', 'آل عمران', 76)).toBe(false)
    expect(isExcerpt('فَإِنَّ اللَّهَ يُحِبُّ الْمُتَّقِينَ', 'آل عمران', 76)).toBe(true)
  })

  it('every entry names a surah that exists and an ayah inside it', () => {
    for (const item of DAILY_AYAHS) {
      const surah = surahList.find((s) => s.shortName === item.surah)
      expect(surah, item.surah).toBeTruthy()
      expect(item.number).toBeGreaterThanOrEqual(1)
      expect(item.number).toBeLessThanOrEqual(surah!.numberOfAyahs)
    }
  })
})

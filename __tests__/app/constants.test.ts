import { describe, expect, it } from 'vitest'
import { arabicCount, BISMILLAH, CATEGORY_COUNT_FORMS, normalizeArabic, quranAudioUrl, quranSurahAudioUrl, stripBismillahPrefix, toArabicNumber } from '../../src/app/constants'

describe('Quran text helpers', () => {
  it('normalizes Arabic alef variants and removes diacritics', () => {
    expect(normalizeArabic('إِنَّ آدَمَ')).toBe('ان ادم')
  })

  it('collapses repeated whitespace', () => {
    expect(normalizeArabic('  سبحان   الله  ')).toBe('سبحان الله')
  })

  it('removes a standalone Bismillah prefix from a Quran ayah', () => {
    expect(stripBismillahPrefix(`${BISMILLAH} الْحَمْدُ لِلَّهِ`)).toBe('الْحَمْدُ لِلَّهِ')
  })

  it('handles API Bismillah spelling differences', () => {
    expect(stripBismillahPrefix('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ الحمد لله')).toBe('الحمد لله')
  })

  it('uses the live editions and supported bitrates for Quran audio', () => {
    expect(quranAudioUrl('ar.abdulbasitmurattal', 1)).toBe('https://cdn.islamic.network/quran/audio/192/ar.abdulbasitmurattal/1.mp3')
    expect(quranAudioUrl('ar.abdurrahmaansudais', 1)).toBe('https://cdn.islamic.network/quran/audio/192/ar.abdurrahmaansudais/1.mp3')
    expect(quranAudioUrl('ar.saoodshuraym', 1)).toBe('https://cdn.islamic.network/quran/audio/64/ar.saoodshuraym/1.mp3')
    expect(quranAudioUrl('ar.alafasy', 1)).toBe('https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3')
  })

  it('builds the verified complete-surah URL for every approved reciter', () => {
    const expected = {
      'ar.minshawi': 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/001.mp3',
      'ar.alafasy': 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/001.mp3',
      'ar.husary': 'https://cdn.mp3quran.net/audio/mahmoud-husary/r1/001.mp3',
      'ar.abdulbasitmurattal': 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/001.mp3',
      'ar.abdurrahmaansudais': 'https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/001.mp3',
      'ar.mahermuaiqly': 'https://cdn.mp3quran.net/audio/maher-muaiqly/r1/001.mp3',
      'ar.hudhaify': 'https://cdn.mp3quran.net/audio/ali-hudhaifi/r1/001.mp3',
      'ar.saoodshuraym': 'https://cdn.mp3quran.net/audio/saud-shuraim/r1/001.mp3',
      'ar.ahmedajamy': 'https://cdn.mp3quran.net/audio/ahmad-ajmi/r1/001.mp3',
      'ar.shaatree': 'https://cdn.mp3quran.net/audio/abubakr-shatri/r1/001.mp3',
    } as const

    for (const [reciter, url] of Object.entries(expected)) {
      expect(quranSurahAudioUrl(reciter as Parameters<typeof quranSurahAudioUrl>[0], 1)).toBe(url)
    }
  })

  it('does not alter text without an exact Bismillah prefix', () => {
    const text = 'الحمد لله رب العالمين'
    expect(stripBismillahPrefix(text)).toBe(text)
  })
})

describe('arabicCount', () => {
  const forms = { one: 'ذكر', two: 'ذكران', few: 'أذكار', many: 'ذكرًا' }

  it('uses singular and dual without a digit', () => {
    expect(arabicCount(1, forms)).toBe('ذكر')
    expect(arabicCount(2, forms)).toBe('ذكران')
  })

  it('uses plural for zero and 3 to 10', () => {
    expect(arabicCount(0, forms)).toBe(`${toArabicNumber(0)} أذكار`)
    expect(arabicCount(3, forms)).toBe(`${toArabicNumber(3)} أذكار`)
    expect(arabicCount(10, forms)).toBe(`${toArabicNumber(10)} أذكار`)
  })

  it('uses the accusative singular for 11 and above', () => {
    expect(arabicCount(11, forms)).toBe(`${toArabicNumber(11)} ذكرًا`)
    expect(arabicCount(12, forms)).toBe(`${toArabicNumber(12)} ذكرًا`)
    expect(arabicCount(13, forms)).toBe(`${toArabicNumber(13)} ذكرًا`)
    expect(arabicCount(150, forms)).toBe(`${toArabicNumber(150)} ذكرًا`)
  })

  it('exposes category forms', () => {
    expect(arabicCount(2, CATEGORY_COUNT_FORMS)).toBe('فئتان')
    expect(arabicCount(5, CATEGORY_COUNT_FORMS)).toBe(`${toArabicNumber(5)} فئات`)
  })
})

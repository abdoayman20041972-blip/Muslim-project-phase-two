import { describe, expect, it } from 'vitest'
import { normalizeSurahSearch } from '../../src/app/features/quran/QuranListView'
import { surahList } from '../../src/quran-meta'
import { stripBismillahPrefix, quranAudioUrl } from '../../src/app/constants'

describe('Quran data and utilities', () => {
  it('contains all 114 surahs in numeric order', () => {
    expect(surahList).toHaveLength(114)
    expect(surahList[0].number).toBe(1)
    expect(surahList[113].number).toBe(114)
    expect(surahList.every((s, i) => s.number === i + 1)).toBe(true)
  })
  it('has valid ayah counts and names', () => {
    expect(surahList.every(s => s.name.length > 0 && s.shortName.length > 0 && s.numberOfAyahs > 0)).toBe(true)
  })
  it('uses bismillah audio editions only for eligible surahs', () => {
    expect(quranAudioUrl('ar.alafasy', 1, false)).toContain('/ar.alafasy/1.mp3')
    expect(quranAudioUrl('ar.alafasy', 2, true)).toContain('/ar.alafasy-2/2.mp3')
    expect(quranAudioUrl('ar.alafasy', 9, false)).toContain('/ar.alafasy/9.mp3')
  })
  it('strips only a leading bismillah prefix', () => {
    const text = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ الحمد لله رب العالمين'
    expect(stripBismillahPrefix(text)).toBe('الحمد لله رب العالمين')
    expect(stripBismillahPrefix('الحمد لله رب العالمين')).toBe('الحمد لله رب العالمين')
  })
  it('normalizes common Arabic spelling variants in surah search', () => {
    expect(normalizeSurahSearch('الفاتحة')).toBe('الفاتحه')
    expect(normalizeSurahSearch('آل عمران')).toBe('ال عمران')
  })
  it('does not strip bismillah from unrelated text', () => {
    const text = 'قال بسم الله الرحمن الرحيم ثم بدأ الكلام'
    expect(stripBismillahPrefix(text)).toBe(text)
  })
})





describe('Quran search normalization', () => {
  it('normalizes common Arabic letter variants and digits', () => {
    expect(normalizeSurahSearch('الفاتحه')).toBe(normalizeSurahSearch('الفاتحة'))
    expect(normalizeSurahSearch('١١٤')).toBe('114')
    expect(normalizeSurahSearch('۱۱۴')).toBe('114')
  })
})

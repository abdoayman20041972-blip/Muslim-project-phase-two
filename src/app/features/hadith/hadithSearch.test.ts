import { describe, expect, it } from 'vitest'
import { highlightParts, matches, normalizeArabic } from './hadithSearch'

describe('hadith search normalisation', () => {
  it('finds vowelled text from an unvowelled query', () => {
    expect(matches('إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', 'الاعمال بالنيات')).toBe(true)
  })
  it('folds hamza, yaa, kaf variants and tatweel', () => {
    expect(normalizeArabic('أَإِآ')).toBe('ااا')
    expect(normalizeArabic('عَلَى')).toBe(normalizeArabic('علي'))
    expect(normalizeArabic('کَالْمُعَایَنَةِ')).toBe(normalizeArabic('كالمعاينة'))
    expect(normalizeArabic('الــله')).toBe('الله')
  })
  it('ignores bidi control characters', () => {
    expect(normalizeArabic('\u202Bنص\u202C')).toBe('نص')
  })
  it('empty query matches everything', () => {
    expect(matches('أي نص', '  ')).toBe(true)
  })
  it('does not match unrelated text', () => {
    expect(matches('الأعمال بالنيات', 'الصيام')).toBe(false)
  })
  it('highlights the original span including its vowels', () => {
    const parts = highlightParts('إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', 'الاعمال')
    expect(parts.filter((p) => p.match).map((p) => p.text)).toEqual(['الْأَعْمَالُ'])
    expect(parts.map((p) => p.text).join('')).toBe('إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ')
  })
  it('highlights matches across repeated whitespace', () => {
    const text = '  الأعمال  \n بالنيات'
    expect(matches(text, 'الاعمال بالنيات')).toBe(true)
    const parts = highlightParts(text, 'الاعمال بالنيات')
    expect(parts.some((part) => part.match)).toBe(true)
    expect(parts.map((part) => part.text).join('')).toBe(text)
  })
  it('highlights every occurrence', () => {
    const parts = highlightParts('الله أكبر الله', 'الله')
    expect(parts.filter((p) => p.match)).toHaveLength(2)
  })
})

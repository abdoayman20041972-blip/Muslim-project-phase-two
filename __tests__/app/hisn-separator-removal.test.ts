import { describe, expect, it } from 'vitest'
import { azkarCategories } from '../../src/azkar-data'
import quran from '../../src/app/features/quran/data/quran-uthmani.json'
import before from '../fixtures/hisn-separator-items-before.json'

const text = quran as Record<string, { numberInSurah: number; text: string }[]>
const items = new Map(azkarCategories.flatMap((c) => c.items).map((i) => [i.id, i.text]))

// Consonant skeleton: drops marks, vowel letters, hamza carriers and doubled letters, so the Hisn
// orthography and the bundled Uthmani orthography (dagger alef, assimilated lam) can be compared.
const skeleton = (s: string) =>
  s.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[اإأآٱوؤيىئءـ]/g, '').replace(/[^\u0621-\u064a]/g, '').replace(/(.)\1+/g, '$1')

type Span = { surah: string; ayat: number[] }
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const CASES: { id: keyof typeof before; spans: Span[] }[] = [
  { id: 'awakening:item-4', spans: [{ surah: '3', ayat: range(190, 200) }] },
  { id: 'travel:item-2', spans: [{ surah: '43', ayat: [13, 14] }] },
  { id: 'sleep:item-9', spans: [{ surah: '2', ayat: [285, 286] }] },
  {
    id: 'after-prayer:item-12',
    spans: [
      { surah: '112', ayat: range(1, 4) },
      { surah: '113', ayat: range(1, 5) },
      { surah: '114', ayat: range(1, 6) },
    ],
  },
]

describe('hisn verse separators removed', () => {
  it.each(CASES)('$id: no "*", same words as before, and each verse part matches the Uthmani ayah', ({ id, spans }) => {
    const old = before[id]
    const now = items.get(id) as string
    expect(old).toContain('*')
    expect(now).not.toContain('*')
    // word sequence identical to the previous text (the separators only split or joined words)
    expect(now.split(/\s+/)).toEqual(old.split(/[\s*]+/).filter(Boolean))
    expect(now).not.toMatch(/ {2,}|^\s|\s$/)
    // each part between the old separators is the same consonant text as one ayah of the bundled Uthmani text, in order
    const oldSpans = old.match(/﴿[^﴾]*﴾/g)!
    expect(oldSpans).toHaveLength(spans.length)
    oldSpans.forEach((span, s) => {
      const parts = span.slice(1, -1).split('*')
      expect(parts).toHaveLength(spans[s].ayat.length)
      parts.forEach((part, i) => {
        const ayah = text[spans[s].surah].find((a) => a.numberInSurah === spans[s].ayat[i])!
        expect(skeleton(ayah.text), `${id} ayah ${spans[s].surah}:${spans[s].ayat[i]}`).toContain(skeleton(part))
      })
    })
  })
})

import { describe, expect, it } from 'vitest'
import { HISN_CATEGORIES } from '../../src/azkar-hisn'
import quran from '../../src/app/features/quran/data/quran-uthmani.json'
import before from '../fixtures/hisn-separator-items-before.json'

const text = quran as Record<string, { numberInSurah: number; text: string }[]>
const items = new Map(HISN_CATEGORIES.flatMap((c) => c.items).map((i) => [i.id, i.text]))

// Consonant skeleton: drops marks, vowel letters, hamza carriers and doubled letters, so the Hisn
// orthography and the bundled Uthmani orthography (dagger alef, assimilated lam) can be compared.
const skeleton = (s: string) =>
  s.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[اإأآٱوؤيىئءـ]/g, '').replace(/[^\u0621-\u064a]/g, '').replace(/(.)\1+/g, '$1')

const CASES: { id: keyof typeof before; surah: string; ayat: number[] }[] = [
  { id: 'awakening:item-4', surah: '3', ayat: [190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200] },
  { id: 'travel:item-2', surah: '43', ayat: [13, 14] },
]

describe('hisn verse separators removed', () => {
  it.each(CASES)('$id: no "*", same words as before, and each verse part matches the Uthmani ayah', ({ id, surah, ayat }) => {
    const old = before[id]
    const now = items.get(id) as string
    expect(old).toContain('*')
    expect(now).not.toContain('*')
    // word sequence identical to the previous text (the separators only split or joined words)
    const oldWords = old.split(/[\s*]+/).filter(Boolean)
    expect(now.split(/\s+/)).toEqual(oldWords)
    expect(now).not.toMatch(/ {2,}|^\s|\s$/)
    // each part between separators is the same consonant text as one ayah of the bundled Uthmani text, in order
    const parts = old.match(/﴿([^﴾]*)﴾/)![1].split('*')
    expect(parts).toHaveLength(ayat.length)
    parts.forEach((part, i) => {
      const ayah = text[surah].find((a) => a.numberInSurah === ayat[i])!
      expect(skeleton(ayah.text), `${id} ayah ${surah}:${ayat[i]}`).toContain(skeleton(part))
    })
  })

})

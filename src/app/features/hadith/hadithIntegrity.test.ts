import { describe, expect, it } from 'vitest'
import nawawi from '../../../../public/data/hadith/ara-nawawi.min.json'
import qudsi from '../../../../public/data/hadith/ara-qudsi.min.json'
import dehlawi from '../../../../public/data/hadith/ara-dehlawi.min.json'
import proposal from './review/phase1-proposal.json'
import { HADITH_COLLECTION } from './hadithData'
import {
  convertDehlawiOrthography,
  findBidiControls,
  findDuplicateMatns,
  findMalformedSources,
  findUrduScriptLetters,
  normalizeArabic,
} from './hadithIntegrity'

type Item = (typeof proposal.curated)[number] & {
  proposal: { kind: string; duplicateOf?: string; newSource?: string; newText?: string; options?: { newText: string; source: string }[] }
  noteProposal?: { text: string; reason: string }
  sourceMatn: string[] | null
}
const items = proposal.curated as unknown as Item[]
const itemById = new Map(items.map((item) => [item.id, item]))
const removedIds = items.filter((item) => item.proposal.kind === 'remove-duplicate').map((item) => item.id)

describe('hadith phase 1: review package matches the data it was checked against', () => {
  it('covers every curated entry exactly once, with the same text and source as the active data', () => {
    expect(items.map((item) => item.id).sort()).toEqual(HADITH_COLLECTION.map((entry) => entry.id).sort())
    for (const entry of HADITH_COLLECTION) {
      const item = itemById.get(entry.id)!
      expect(item.activeText, entry.id).toBe(entry.text)
      expect(item.activeSource, entry.id).toBe(entry.source)
    }
  })

  it('stays pending: the proposal is not yet applied to the active data', () => {
    expect(proposal.status).toBe('pending-human-review')
  })

  it('flags exactly the entries verified as partial quotations', () => {
    const flagged = HADITH_COLLECTION.filter((entry) => entry.excerpt).map((entry) => entry.id).sort()
    const verified = items.filter((item) => item.excerpt).map((item) => item.id).sort()
    expect(flagged).toEqual(verified)
    expect(flagged).toHaveLength(14)
  })

  it('keeps the recorded source matn consistent with the active text', () => {
    for (const item of items) {
      if (item.status !== 'exact' && item.status !== 'excerpt') continue
      if (item.id === 'bukhari-52') continue // wording variant, covered by its own option list
      const active = normalizeArabic(item.activeText)
      const segments = (item.sourceMatn ?? []).map(normalizeArabic)
      expect(segments.length, item.id).toBeGreaterThan(0)
      if (item.status === 'exact') {
        expect(segments, item.id).toContain(active)
      } else {
        const whole = segments.join(' ')
        expect(whole, item.id).toContain(active)
        expect(whole.length, item.id).toBeGreaterThan(active.length)
      }
    }
  })
})

describe('hadith phase 1: curated list integrity', () => {
  it('has unique ids and well-formed source labels', () => {
    expect(new Set(HADITH_COLLECTION.map((entry) => entry.id)).size).toBe(HADITH_COLLECTION.length)
    expect(findMalformedSources(HADITH_COLLECTION)).toEqual([])
  })

  it('lists no matn twice except the duplicates the proposal removes', () => {
    const groups = findDuplicateMatns(HADITH_COLLECTION)
    expect(groups).toHaveLength(2)
    for (const group of groups) {
      expect(group.filter((id) => removedIds.includes(id)), group.join(',')).toHaveLength(1)
    }
  })

  it('would be free of duplicates and bad labels once the proposal is applied', () => {
    const applied = HADITH_COLLECTION.filter((entry) => !removedIds.includes(entry.id)).map((entry) => {
      const item = itemById.get(entry.id)!
      const kind = item.proposal.kind
      if (kind === 'correct-reference') return { ...entry, source: item.proposal.newSource! }
      if (kind === 'adjust-text' && item.proposal.newText) return { ...entry, text: item.proposal.newText }
      if (kind === 'adjust-text' && item.proposal.options) {
        const first = item.proposal.options[0]
        return { ...entry, text: first.newText, source: first.source }
      }
      return entry
    })
    expect(applied).toHaveLength(HADITH_COLLECTION.length - removedIds.length)
    expect(findDuplicateMatns(applied)).toEqual([])
    expect(findMalformedSources(applied)).toEqual([])
    expect(new Set(applied.map((entry) => entry.source)).size).toBe(applied.length)
  })

  it('proposes a different, non-empty note for every note it rewrites', () => {
    for (const item of items) {
      if (!item.noteProposal) continue
      const entry = HADITH_COLLECTION.find((candidate) => candidate.id === item.id)!
      expect(item.noteProposal.text, item.id).not.toBe(entry.note)
      expect(item.noteProposal.text.length, item.id).toBeGreaterThan(10)
      expect(item.noteProposal.reason.length, item.id).toBeGreaterThan(5)
    }
  })
})

describe('hadith phase 1: bundled editions', () => {
  it('Dehlawi: Persian letters are converted by the documented rule and nothing else changes', () => {
    const hadiths = dehlawi.hadiths
    expect(hadiths).toHaveLength(40)
    const withUrdu = hadiths.filter((hadith) => findUrduScriptLetters(hadith.text).length > 0)
    expect(withUrdu).toHaveLength(proposal.dehlawiOrthography.changedHadithCount)
    const proposed = new Map(proposal.dehlawiOrthography.hadiths.map((item) => [item.hadithnumber, item.proposedText]))
    for (const hadith of hadiths) {
      const converted = convertDehlawiOrthography(hadith.text)
      expect(findUrduScriptLetters(converted)).toEqual([])
      expect(converted, String(hadith.hadithnumber)).toBe(proposed.get(hadith.hadithnumber) ?? hadith.text)
      expect(convertDehlawiOrthography(converted)).toBe(converted)
      expect(converted.length).toBe(hadith.text.length)
      const keepMapped = (value: string) => value.replace(/[\u06a9\u0643]/g, 'K').replace(/[\u06cc\u064a\u0649]/g, 'Y')
      expect(keepMapped(converted)).toBe(keepMapped(hadith.text))
    }
  })

  it('Dehlawi: final yeh becomes alef maqsura only in the listed words', () => {
    expect(convertDehlawiOrthography('عَلَی')).toBe('عَلَى')
    expect(convertDehlawiOrthography('فِی')).toBe('فِي')
    expect(convertDehlawiOrthography('یَرَی')).toBe('يَرَى')
    expect(convertDehlawiOrthography('الدُّنْیَا')).toBe('الدُّنْيَا')
    expect(convertDehlawiOrthography('کَالْمُعَایَنَةِ')).toBe('كَالْمُعَايَنَةِ')
  })

  it('Nawawi and Qudsi use Arabic letters only', () => {
    for (const edition of [nawawi, qudsi]) {
      for (const hadith of edition.hadiths) expect(findUrduScriptLetters(hadith.text), String(hadith.hadithnumber)).toEqual([])
    }
  })

  it('only Nawawi hadith 2 carries stray bidi controls, as the proposal records', () => {
    const hits = (edition: { hadiths: { hadithnumber: number; text: string }[] }) =>
      edition.hadiths.filter((hadith) => findBidiControls(hadith.text).length > 0).map((hadith) => hadith.hadithnumber)
    expect(hits(nawawi)).toEqual([proposal.nawawiControlChars.hadithnumber])
    expect(hits(qudsi)).toEqual([])
    expect(hits(dehlawi)).toEqual([])
  })

  it('has contiguous numbering and no empty text in every edition', () => {
    for (const edition of [nawawi, qudsi, dehlawi]) {
      edition.hadiths.forEach((hadith, index) => {
        expect(hadith.hadithnumber).toBe(index + 1)
        expect(hadith.text.trim().length).toBeGreaterThan(0)
      })
    }
    expect([nawawi.hadiths.length, qudsi.hadiths.length, dehlawi.hadiths.length]).toEqual([42, 40, 40])
  })
})

describe('hadith phase 1: helpers', () => {
  it('normalizes marks, alef forms and punctuation', () => {
    expect(normalizeArabic('إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ،')).toBe(normalizeArabic('انما الاعمال بالنيات'))
    expect(normalizeArabic('على')).toBe(normalizeArabic('علي'))
  })

  it('detects duplicates across spelling variants', () => {
    expect(
      findDuplicateMatns([
        { id: 'a', text: 'أحبّ الأعمال أدومُها', source: 'x' },
        { id: 'b', text: 'احب الاعمال ادومها', source: 'y' },
        { id: 'c', text: 'لا تغضب', source: 'z' },
      ]),
    ).toEqual([['a', 'b']])
  })
})

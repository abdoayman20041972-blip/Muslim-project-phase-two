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

type Item = {
  id: string
  activeSource: string
  activeText: string
  excerpt?: boolean
  proposal: { kind: string; duplicateOf?: string; newSource?: string; newText?: string; options?: { newText: string; source: string }[] }
  noteProposal?: { text: string }
}
const items = proposal.curated as unknown as Item[]
const removedIds = items.filter((item) => item.proposal.kind === 'remove-duplicate').map((item) => item.id)
const renamed = new Map([['muslim-2627', 'muslim-2626']])
const byId = new Map(HADITH_COLLECTION.map((entry) => [entry.id, entry]))
const idOf = (id: string) => renamed.get(id) ?? id

describe('hadith phase 1: decisions applied to the active data', () => {
  it('records that the choices were delegated and are not scholarly certification', () => {
    expect(proposal.status).toBe('applied-by-delegated-choice')
    expect(proposal.applied.authority).toContain('not scholarly certification')
  })

  it('removes exactly the two duplicates and keeps the originals', () => {
    expect(removedIds.sort()).toEqual(['bukhari-6436', 'tirmidhi-2516'])
    for (const id of removedIds) expect(byId.has(id)).toBe(false)
    expect(byId.has('muslim-783')).toBe(true)
    expect(byId.has('tirmidhi-1987')).toBe(true)
    expect(HADITH_COLLECTION).toHaveLength(items.length - 2)
  })

  it('corrects muslim 2627 to 2626 without touching its text', () => {
    expect(byId.has('muslim-2627')).toBe(false)
    const entry = byId.get('muslim-2626')!
    expect(entry.source).toBe('صحيح مسلم — ٢٦٢٦')
    expect(entry.text).toBe(items.find((item) => item.id === 'muslim-2627')!.activeText)
  })

  it('applies the chosen wording and every note rewrite exactly', () => {
    expect(byId.get('abudawud-4811')!.text).toBe('لا يشكر اللهَ من لا يشكر الناس')
    expect(byId.get('bukhari-52')!.text).toContain('مشبَّهات')
    expect(byId.get('muslim-783')!.text).toContain('تعالى')
    const withNote = items.filter((item) => item.noteProposal)
    expect(withNote).toHaveLength(15)
    for (const item of withNote) expect(byId.get(idOf(item.id))!.note, item.id).toBe(item.noteProposal!.text)
  })

  it('leaves every other text and source untouched', () => {
    const touched = new Set(['abudawud-4811', 'bukhari-52', 'muslim-783', 'muslim-2627', ...removedIds])
    for (const item of items) {
      if (touched.has(item.id)) continue
      const entry = byId.get(item.id)!
      expect(entry.text, item.id).toBe(item.activeText)
      expect(entry.source, item.id).toBe(item.activeSource)
    }
  })

  it('keeps the excerpt flags exactly on the verified partial quotations', () => {
    for (const item of items) {
      if (removedIds.includes(item.id)) continue
      expect(!!byId.get(idOf(item.id))!.excerpt, item.id).toBe(item.excerpt === true)
    }
    expect(HADITH_COLLECTION.filter((entry) => entry.excerpt)).toHaveLength(14)
  })

  it('has unique ids, well-formed labels and no duplicated matn', () => {
    expect(new Set(HADITH_COLLECTION.map((entry) => entry.id)).size).toBe(HADITH_COLLECTION.length)
    expect(findMalformedSources(HADITH_COLLECTION)).toEqual([])
    expect(findDuplicateMatns(HADITH_COLLECTION)).toEqual([])
  })

  it('ships no grade on any entry', () => {
    expect(HADITH_COLLECTION.every((entry) => !('grade' in entry) || !entry.grade)).toBe(true)
  })
})

describe('hadith phase 1: bundled editions', () => {
  it('Dehlawi: no Persian letters remain and the texts equal the documented conversion', () => {
    const hadiths = dehlawi.hadiths
    expect(hadiths).toHaveLength(40)
    const proposed = new Map(proposal.dehlawiOrthography.hadiths.map((item) => [item.hadithnumber, item.proposedText]))
    expect(proposed.size).toBe(proposal.dehlawiOrthography.changedHadithCount)
    for (const hadith of hadiths) {
      expect(findUrduScriptLetters(hadith.text), String(hadith.hadithnumber)).toEqual([])
      expect(convertDehlawiOrthography(hadith.text)).toBe(hadith.text)
      if (proposed.has(hadith.hadithnumber)) expect(hadith.text).toBe(proposed.get(hadith.hadithnumber))
    }
  })

  it('Dehlawi: final yeh becomes alef maqsura only in the listed words', () => {
    expect(convertDehlawiOrthography('عَلَی')).toBe('عَلَى')
    expect(convertDehlawiOrthography('فِی')).toBe('فِي')
    expect(convertDehlawiOrthography('یَرَی')).toBe('يَرَى')
    expect(convertDehlawiOrthography('الدُّنْیَا')).toBe('الدُّنْيَا')
    expect(convertDehlawiOrthography('کَالْمُعَایَنَةِ')).toBe('كَالْمُعَايَنَةِ')
  })

  it('no edition uses Persian letters or carries bidi controls', () => {
    for (const edition of [nawawi, qudsi, dehlawi]) {
      for (const hadith of edition.hadiths) {
        expect(findUrduScriptLetters(hadith.text), String(hadith.hadithnumber)).toEqual([])
        expect(findBidiControls(hadith.text), String(hadith.hadithnumber)).toEqual([])
      }
    }
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

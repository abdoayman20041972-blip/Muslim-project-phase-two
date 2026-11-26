import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadAsbab,
  loadCenterVersion,
  loadGharib,
  loadSurahInfos,
  mergeGharib,
  resetQuranCenterCaches,
  type GharibMap,
} from './quranCenterData'

const heritage: GharibMap = {
  '1': [{ book: 'تذكرة الأريب في تفسير الغريب', author: 'ابن الجوزي', words: [{ text: 'ريب', meaning: 'الشك' }] }],
}
const modern: GharibMap = {
  '1': [{ book: 'السراج في بيان غريب القرآن', author: 'محمد الخضيري', words: [{ text: 'الرحمن', meaning: 'الذي وسعت رحمته جميع الخلق' }] }],
  '2': [{ book: 'كلمات القرآن', author: 'حسنين مخلوف', words: [{ text: 'الكتاب', meaning: 'القرآن' }] }],
}

function stubFetch(routes: Record<string, unknown>) {
  const mock = vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => String(url).includes(k))
    if (!key || routes[key] === undefined) return { ok: false, status: 404, json: async () => null }
    return { ok: true, status: 200, json: async () => routes[key] }
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

beforeEach(() => { resetQuranCenterCaches(); vi.unstubAllGlobals() })

describe('mergeGharib', () => {
  it('puts modern books first and keeps every ayah from both sources', () => {
    const merged = mergeGharib(heritage, modern)
    expect(merged['1'].map((e) => e.book)).toEqual(['السراج في بيان غريب القرآن', 'تذكرة الأريب في تفسير الغريب'])
    expect(merged['2']).toHaveLength(1)
  })
  it('works with either source missing', () => {
    expect(Object.keys(mergeGharib(heritage, null))).toEqual(['1'])
    expect(mergeGharib(null, null)).toEqual({})
  })
})

describe('loadGharib', () => {
  it('merges the bundled heritage file with the optional private one', async () => {
    stubFetch({ '/data/quran-center/gharib/2.json': heritage, '/data/quran-center-private/gharib/2.json': modern })
    const map = await loadGharib(2)
    expect(map?.['1']).toHaveLength(2)
    expect(map?.['2']).toHaveLength(1)
  })
  it('returns heritage alone when no private file exists', async () => {
    stubFetch({ '/data/quran-center/gharib/2.json': heritage })
    const map = await loadGharib(2)
    expect(map?.['1']).toHaveLength(1)
  })
  it('returns null for a surah with no data instead of throwing', async () => {
    stubFetch({})
    expect(await loadGharib(55)).toBeNull()
  })
  it('rejects malformed content instead of rendering it', async () => {
    stubFetch({ '/data/quran-center/gharib/2.json': { '1': [{ book: 'x' }] } })
    expect(await loadGharib(2)).toBeNull()
  })
  it('caches per surah', async () => {
    const fetchMock = stubFetch({ '/data/quran-center/gharib/2.json': heritage })
    await loadGharib(2); await loadGharib(2)
    expect(vi.mocked(fetchMock).mock.calls).toHaveLength(2) // one public + one private attempt
  })
})

describe('loadAsbab', () => {
  it('returns the cleaned text map for a covered surah', async () => {
    stubFetch({ '/data/quran-center/asbab/2.json': { '25': 'نص الرواية' } })
    expect(await loadAsbab(2)).toEqual({ '25': 'نص الرواية' })
  })
  it('returns null for an uncovered surah', async () => {
    stubFetch({})
    expect(await loadAsbab(55)).toBeNull()
  })
  it('rejects non-string entries', async () => {
    stubFetch({ '/data/quran-center/asbab/2.json': { '25': 7 } })
    expect(await loadAsbab(2)).toBeNull()
  })
})

describe('loadSurahInfos / loadCenterVersion', () => {
  it('accepts exactly 114 well-formed rows', async () => {
    const rows = Array.from({ length: 114 }, (_, i) => ({
      surah: i + 1, type: i % 2 ? 'مدنية' : 'مكية', descentOrder: i + 1, wordsCount: 100, introduction: 'نبذة', grace: '',
    }))
    stubFetch({ 'surahs-info.json': rows, 'version.json': { dumpVersion: '2026-11-24' } })
    const list = await loadSurahInfos()
    expect(list).toHaveLength(114)
    expect(list?.[113].surah).toBe(114)
    expect(await loadCenterVersion()).toBe('2026-11-24')
  })
  it('accepts rows without the review-pending virtues field', async () => {
    const rows = Array.from({ length: 114 }, (_, i) => ({
      surah: i + 1, type: 'مكية', descentOrder: i + 1, wordsCount: null, introduction: 'نبذة',
    }))
    stubFetch({ 'surahs-info.json': rows })
    const list = await loadSurahInfos()
    expect(list).toHaveLength(114)
    expect(list?.[0].grace).toBeUndefined()
  })
  it('rejects a truncated file', async () => {
    stubFetch({ 'surahs-info.json': [{ surah: 1, type: 'مكية', introduction: '', grace: '' }] })
    expect(await loadSurahInfos()).toBeNull()
  })
})

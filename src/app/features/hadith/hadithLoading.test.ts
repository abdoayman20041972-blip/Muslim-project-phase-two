import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { clearEditionCache, convertMarkupLineBreaks, HADITH_COLLECTION, loadApiEdition } from './hadithData'
import dehlawi from '../../../../public/data/hadith/ara-dehlawi.min.json'
import nawawi from '../../../../public/data/hadith/ara-nawawi.min.json'
import qudsi from '../../../../public/data/hadith/ara-qudsi.min.json'

const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response
beforeEach(() => { clearEditionCache(); vi.spyOn(globalThis, 'fetch') })
afterEach(() => { vi.restoreAllMocks(); clearEditionCache() })

describe('edition cache and source parity', () => {
  it('clears only hadith session entries, never unrelated session state or local progress', () => {
    sessionStorage.setItem('other-session', 'keep')
    sessionStorage.setItem('hadith-edition:ara-nawawi', 'old')
    localStorage.setItem('azkar_counts', 'keep')
    clearEditionCache()
    expect(sessionStorage.getItem('other-session')).toBe('keep')
    expect(sessionStorage.getItem('hadith-edition:ara-nawawi')).toBeNull()
    expect(localStorage.getItem('azkar_counts')).toBe('keep')
  })
  it('retires the unversioned cache and fetches reviewed data', async () => {
    sessionStorage.setItem('hadith-edition:ara-nawawi', JSON.stringify({ hadiths: [{ hadithnumber: 1, text: 'stale' }], origin: 'bundled' }))
    vi.mocked(fetch).mockResolvedValue(response({ hadiths: [{ hadithnumber: 1, text: '\u202bنص\u202c' }] }))
    const data = await loadApiEdition('ara-nawawi')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(data.hadiths[0].text).toBe('نص')
    expect(sessionStorage.getItem('hadith-edition:ara-nawawi')).toBeNull()
    await loadApiEdition('ara-nawawi')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('makes unconverted Dehlawi CDN text identical to the bundled correction', async () => {
    const legacy = { hadiths: dehlawi.hadiths.map((h) => ({ ...h, text: h.text.replace(/ك/g, 'ک').replace(/ي/g, 'ی') })) }
    vi.mocked(fetch).mockResolvedValueOnce(response({}, false)).mockResolvedValueOnce(response(legacy))
    const data = await loadApiEdition('ara-dehlawi')
    expect(data.origin).toBe('network')
    expect(data.hadiths).toEqual(dehlawi.hadiths.map(({ hadithnumber, text }) => ({ hadithnumber, text })))
  })
  it.each([{ hadiths: [] }, { hadiths: [{ hadithnumber: 1, text: '' }] }, { hadiths: [{ hadithnumber: 1, text: 5 }] }, { hadiths: [{ hadithnumber: 1, text: 'a' }, { hadithnumber: 1, text: 'b' }] }])('rejects malformed or empty local data and falls back', async ({ hadiths }) => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ hadiths })).mockResolvedValueOnce(response({ hadiths: [{ hadithnumber: 1, text: 'valid' }] }))
    expect((await loadApiEdition('ara-nawawi')).origin).toBe('network')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('converts literal <br> markup in upstream texts to real line breaks, from bundled, network and cached data', async () => {
    const marked = { hadiths: [{ hadithnumber: 1, text: 'قبل<br>بعد' }, { hadithnumber: 2, text: 'أ<br> <br>ب<br/>' }] }
    vi.mocked(fetch).mockResolvedValue(response(marked))
    const bundled = await loadApiEdition('ara-qudsi')
    expect(bundled.hadiths[0].text).toBe('قبل\nبعد')
    expect(bundled.hadiths[1].text).toBe('أ\nب')
    expect(bundled.hadiths.every((h) => !h.text.includes('<'))).toBe(true)

    clearEditionCache()
    vi.mocked(fetch).mockResolvedValueOnce(response({}, false)).mockResolvedValueOnce(response(marked))
    const network = await loadApiEdition('ara-nawawi')
    expect(network.origin).toBe('network')
    expect(network.hadiths[0].text).toBe('قبل\nبعد')

    clearEditionCache()
    sessionStorage.setItem('hadith-edition:v3:ara-qudsi', JSON.stringify({ ...marked, origin: 'bundled' }))
    const callsBefore = vi.mocked(fetch).mock.calls.length
    const cached = await loadApiEdition('ara-qudsi')
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
    expect(cached.hadiths[0].text).toBe('قبل\nبعد')
  })
  it('reviews every hadith in all three editions and the curated list: no markup characters after loading', async () => {
    expect(nawawi.hadiths.some((h) => h.text.includes('<br>'))).toBe(true)
    expect(qudsi.hadiths.some((h) => h.text.includes('<br>'))).toBe(true)
    expect(dehlawi.hadiths.every((h) => !/[<>]/.test(h.text))).toBe(true)
    expect(HADITH_COLLECTION.every((h) => !/[<>]/.test(h.text) && !/[<>]/.test(h.note))).toBe(true)
    for (const [edition, data] of [['ara-nawawi', nawawi], ['ara-qudsi', qudsi], ['ara-dehlawi', dehlawi]] as const) {
      vi.mocked(fetch).mockResolvedValue(response(data))
      const loaded = await loadApiEdition(edition)
      expect(loaded.hadiths.length).toBe(data.hadiths.length)
      for (const h of loaded.hadiths) expect(h.text).not.toMatch(/[<>]/)
      clearEditionCache()
    }
  })
  it('convertMarkupLineBreaks only touches br tags, never wording', () => {
    expect(convertMarkupLineBreaks('نص بدون وسوم')).toBe('نص بدون وسوم')
    expect(convertMarkupLineBreaks('أ<br>ب')).toBe('أ\nب')
    expect(convertMarkupLineBreaks('أ <br> ب')).toBe('أ\nب')
    expect(convertMarkupLineBreaks('أ<br><br>ب')).toBe('أ\nب')
    expect(convertMarkupLineBreaks('أ<BR/>ب<br >')).toBe('أ\nب')
    expect(convertMarkupLineBreaks('<br>أ')).toBe('أ')
  })
  it('rejects invalid cached data and uses the bundled source', async () => {
    sessionStorage.setItem('hadith-edition:v2:ara-nawawi', JSON.stringify({ origin: 'network', hadiths: [] }))
    vi.mocked(fetch).mockResolvedValue(response({ hadiths: [{ hadithnumber: 1, text: 'valid' }] }))
    expect((await loadApiEdition('ara-nawawi')).origin).toBe('bundled')
  })
})

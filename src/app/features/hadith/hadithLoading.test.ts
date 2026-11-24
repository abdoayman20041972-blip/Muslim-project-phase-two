import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { clearEditionCache, loadApiEdition } from './hadithData'
import dehlawi from '../../../../public/data/hadith/ara-dehlawi.min.json'

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
  it('rejects invalid cached data and uses the bundled source', async () => {
    sessionStorage.setItem('hadith-edition:v2:ara-nawawi', JSON.stringify({ origin: 'network', hadiths: [] }))
    vi.mocked(fetch).mockResolvedValue(response({ hadiths: [{ hadithnumber: 1, text: 'valid' }] }))
    expect((await loadApiEdition('ara-nawawi')).origin).toBe('bundled')
  })
})

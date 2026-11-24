import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HadithView } from './HadithView'
import { HADITH_COLLECTION, clearEditionCache } from './hadithData'
import { HADITH_SOURCE_URLS } from './hadithSources'
import { APP_SETTINGS_KEYS, SETTINGS_RESET_KEYS, isBackupKey } from '../../settings'

const sample = { hadiths: [{ hadithnumber: 1, text: 'نص تجريبي أول' }, { hadithnumber: 2, text: 'نص تجريبي ثانٍ' }, { hadithnumber: 3, text: 'نص تجريبي ثالث' }] }
const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => body }) as Response
const ar = (n: number) => n.toLocaleString('ar-EG')

beforeEach(() => {
  localStorage.clear()
  clearEditionCache()
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(sample))
})
afterEach(() => vi.restoreAllMocks())

const openCurated = () => {
  render(<HadithView onBack={vi.fn()} />)
  fireEvent.click(screen.getByTestId('hadith-group-curated'))
}
const next = () => fireEvent.click(screen.getByRole('button', { name: 'الحديث التالي' }))

describe('groups screen', () => {
  it('shows one card per group with counts computed from the data', async () => {
    render(<HadithView onBack={vi.fn()} />)
    expect(screen.getByTestId('hadith-count-curated').textContent).toBe(`${ar(HADITH_COLLECTION.length)} حديثًا`)
    await waitFor(() => expect(screen.getByTestId('hadith-count-nawawi').textContent).toBe(`${ar(3)} حديثًا`))
    expect(screen.getByTestId('hadith-count-qudsi').textContent).toBe(`${ar(3)} حديثًا`)
    expect(screen.getByTestId('hadith-count-dehlawi').textContent).toBe(`${ar(3)} حديثًا`)
  })
  it('count digits follow the number style live', async () => {
    render(<HadithView onBack={vi.fn()} />)
    act(() => {
      localStorage.setItem(APP_SETTINGS_KEYS.numberStyle, 'western')
      window.dispatchEvent(new Event('azkar-settings-changed'))
    })
    expect(screen.getByTestId('hadith-count-curated').textContent).toBe(`${HADITH_COLLECTION.length} حديثًا`)
  })
})

describe('reading screen', () => {
  it('shows one hadith with its position and navigates', () => {
    openCurated()
    expect(screen.getByTestId('hadith-position').textContent).toBe(`حديث ${ar(1)} من ${ar(HADITH_COLLECTION.length)}`)
    expect(document.querySelector('.hadith-text')?.textContent).toBe(`«${HADITH_COLLECTION[0].text}»`)
    next()
    expect(screen.getByTestId('hadith-position').textContent).toContain(ar(2))
    expect(document.querySelector('.hadith-text')?.textContent).toBe(`«${HADITH_COLLECTION[1].text}»`)
    fireEvent.click(screen.getByRole('button', { name: 'الحديث السابق' }))
    expect(screen.getByTestId('hadith-position').textContent).toContain(ar(1))
    expect((screen.getByRole('button', { name: 'الحديث السابق' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('marks excerpts with the badge exactly where the data flags them, and no entry carries a grade', () => {
    openCurated()
    let badges = 0
    HADITH_COLLECTION.forEach((hadith, i) => {
      const has = !!screen.queryByTestId('hadith-excerpt-badge')
      expect(has).toBe(!!hadith.excerpt)
      if (has) badges++
      expect(screen.queryByTestId('hadith-grade')).toBeNull()
      if (i < HADITH_COLLECTION.length - 1) next()
    })
    expect(badges).toBe(HADITH_COLLECTION.filter((h) => h.excerpt).length)
    expect(HADITH_COLLECTION.every((h) => !h.grade)).toBe(true)
  })
  it('links every entry to its verified source page', () => {
    openCurated()
    HADITH_COLLECTION.forEach((hadith, i) => {
      const link = screen.getByTestId('hadith-source-link') as HTMLAnchorElement
      expect(link.href).toBe(HADITH_SOURCE_URLS[hadith.id])
      expect(link.target).toBe('_blank')
      if (i < HADITH_COLLECTION.length - 1) next()
    })
    expect(HADITH_COLLECTION.every((h) => HADITH_SOURCE_URLS[h.id])).toBe(true)
  })
  it('copies the hadith text with its source', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    openCurated()
    fireEvent.click(screen.getByRole('button', { name: /نسخ/ }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toContain(HADITH_COLLECTION[0].text)
    expect(await screen.findByText('تم نسخ الحديث')).toBeTruthy()
  })
  it('applies font size and hides notes live from settings', () => {
    openCurated()
    expect(document.querySelector('.hadith-text')?.className).toContain('text-[16px]')
    expect(document.body.textContent).toContain(HADITH_COLLECTION[0].note)
    act(() => {
      localStorage.setItem(APP_SETTINGS_KEYS.hadithFont, 'lg')
      localStorage.setItem(APP_SETTINGS_KEYS.hadithShowNote, '0')
      window.dispatchEvent(new Event('azkar-settings-changed'))
    })
    expect(document.querySelector('.hadith-text')?.className).toContain('text-[19px]')
    expect(document.body.textContent).not.toContain(HADITH_COLLECTION[0].note)
  })
  it('shows the position indicator in the chosen number style', () => {
    openCurated()
    act(() => {
      localStorage.setItem(APP_SETTINGS_KEYS.numberStyle, 'western')
      window.dispatchEvent(new Event('azkar-settings-changed'))
    })
    expect(screen.getByTestId('hadith-position').textContent).toBe(`حديث 1 من ${HADITH_COLLECTION.length}`)
  })
})

describe('search', () => {
  it('finds vowelled hadiths from an unvowelled query, groups results and highlights the match', () => {
    render(<HadithView onBack={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('البحث في الأحاديث'), { target: { value: 'الاعمال بالنيات' } })
    expect(screen.getAllByTestId('hadith-result').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('hadith-hit').length).toBeGreaterThan(0)
  })
  it('opens the reader at the tapped result', () => {
    render(<HadithView onBack={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('البحث في الأحاديث'), { target: { value: HADITH_COLLECTION[3].text.slice(0, 12) } })
    fireEvent.click(screen.getAllByTestId('hadith-result')[0])
    expect(document.querySelector('.hadith-text')?.textContent).toContain(HADITH_COLLECTION[3].text)
    expect(screen.getByTestId('hadith-position').textContent).toContain(ar(4))
  })
  it('says so when nothing matches', async () => {
    render(<HadithView onBack={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('البحث في الأحاديث'), { target: { value: 'zzzz' } })
    await waitFor(() => expect(document.body.textContent).toContain('لا يوجد حديث يطابق بحثك'))
  })
})

describe('hadith font setting registry', () => {
  it('keeps the original storage key, is backed up, and is cleared by reset', () => {
    expect(APP_SETTINGS_KEYS.hadithFont).toBe('hadith_font')
    expect(isBackupKey('hadith_font')).toBe(true)
    expect(SETTINGS_RESET_KEYS).toContain('hadith_font')
    expect(APP_SETTINGS_KEYS.prophetFont).toBe('prophet_font')
    expect(isBackupKey('prophet_font')).toBe(true)
    expect(SETTINGS_RESET_KEYS).toContain('prophet_font')
  })
})

describe('edition loading messages', () => {
  it('says offline-capable only for the bundled file', async () => {
    render(<HadithView onBack={vi.fn()} />)
    await waitFor(() => expect(screen.getByTestId('hadith-count-nawawi').textContent).toContain(ar(3)))
    fireEvent.click(screen.getByTestId('hadith-group-nawawi'))
    expect(document.body.textContent).toContain('من ملف مضمّن، يعمل دون إنترنت')
    expect(document.body.textContent).toContain('نص تجريبي أول')
    expect(document.body.textContent).not.toContain('المكتبة المفتوحة')
  })
  it('uses the CDN fallback when the bundled file fails and labels it as network', async () => {
    const calls: string[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      calls.push(url)
      return url.startsWith('https://cdn.jsdelivr.net') ? json(sample) : json({}, false)
    })
    render(<HadithView onBack={vi.fn()} />)
    await waitFor(() => expect(screen.getByTestId('hadith-count-nawawi').textContent).toContain(ar(3)))
    expect(calls[0]).toContain('/data/hadith/ara-nawawi.min.json')
    expect(calls).toContain('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-nawawi.min.json')
    fireEvent.click(screen.getByTestId('hadith-group-nawawi'))
    expect(document.body.textContent).toContain('حُمّل من الإنترنت')
    expect(document.body.textContent).not.toContain('يعمل دون إنترنت')
  })
  it('shows an honest error with retry when both sources fail, and the curated group still opens', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<HadithView onBack={vi.fn()} />)
    await waitFor(() => expect(screen.getByTestId('hadith-count-nawawi').textContent).toBe('تعذّر التحميل'))
    expect(document.body.textContent).toContain('تعذّر تحميل هذا القسم')
    expect(screen.getAllByRole('button', { name: 'إعادة المحاولة' }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByTestId('hadith-group-curated'))
    expect(screen.getByTestId('hadith-position')).toBeTruthy()
  })
})

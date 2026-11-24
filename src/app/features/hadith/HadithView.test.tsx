import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HadithView } from './HadithView'
import { HADITH_COLLECTION, clearEditionCache } from './hadithData'
import { APP_SETTINGS_KEYS, SETTINGS_RESET_KEYS, isBackupKey } from '../../settings'

const sample = { hadiths: [{ hadithnumber: 7, text: 'نص تجريبي' }] }
const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => body }) as Response

beforeEach(() => {
  localStorage.clear()
  clearEditionCache()
})
afterEach(() => vi.restoreAllMocks())

describe('HadithView curated tab', () => {
  it('marks partial quotations with an excerpt badge and leaves full narrations unmarked', () => {
    render(<HadithView onBack={vi.fn()} />)
    const flagged = HADITH_COLLECTION.filter((entry) => entry.excerpt).length
    expect(flagged).toBeGreaterThan(0)
    expect(screen.getAllByTestId('hadith-excerpt-badge')).toHaveLength(flagged)
    expect(document.querySelectorAll('.hadith-card')).toHaveLength(HADITH_COLLECTION.length)
  })

  it('switches count and source digits when the number style changes, live', () => {
    render(<HadithView onBack={vi.fn()} />)
    expect(document.body.textContent).toContain(`${HADITH_COLLECTION.length.toLocaleString('ar-EG')} حديثًا`)
    expect(document.querySelector('.hadith-source')?.textContent).toMatch(/[٠-٩]/)
    act(() => {
      localStorage.setItem(APP_SETTINGS_KEYS.numberStyle, 'western')
      window.dispatchEvent(new Event('azkar-settings-changed'))
    })
    expect(document.body.textContent).toContain(`${HADITH_COLLECTION.length} حديثًا`)
    expect(document.querySelector('.hadith-source')?.textContent).toMatch(/\d/)
    expect(document.querySelector('.hadith-source')?.textContent).not.toMatch(/[٠-٩]/)
  })

  it('applies the font size setting live', () => {
    render(<HadithView onBack={vi.fn()} />)
    expect(document.querySelector('.hadith-text')?.className).toContain('text-[16px]')
    act(() => {
      localStorage.setItem(APP_SETTINGS_KEYS.hadithFont, 'lg')
      window.dispatchEvent(new Event('azkar-settings-changed'))
    })
    expect(document.querySelector('.hadith-text')?.className).toContain('text-[19px]')
  })
})

describe('hadith font setting registry', () => {
  it('keeps the original storage key, is backed up, and is cleared by reset', () => {
    expect(APP_SETTINGS_KEYS.hadithFont).toBe('hadith_font')
    expect(isBackupKey('hadith_font')).toBe(true)
    expect(SETTINGS_RESET_KEYS).toContain('hadith_font')
  })
})

describe('edition tab messages', () => {
  it('says offline-capable only for the bundled file', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(sample))
    render(<HadithView onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'الأربعون النووية' }))
    await screen.findByText('نص تجريبي')
    expect(document.body.textContent).toContain('من ملف مضمّن، يعمل دون إنترنت')
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
    fireEvent.click(screen.getByRole('tab', { name: 'الأربعون النووية' }))
    await screen.findByText('نص تجريبي')
    expect(calls[0]).toContain('/data/hadith/ara-nawawi.min.json')
    expect(calls[1]).toBe('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-nawawi.min.json')
    expect(document.body.textContent).toContain('حُمّل من الإنترنت')
    expect(document.body.textContent).not.toContain('يعمل دون إنترنت')
  })

  it('shows an honest error that names the real cause and the curated tab when both sources fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<HadithView onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'الأربعون النووية' }))
    await waitFor(() => expect(document.body.textContent).toContain('تعذّر تحميل هذا القسم'))
    expect(document.body.textContent).toContain('تبويب «مختارات»')
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy()
  })
})

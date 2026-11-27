import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { copyPayload, copyText, copyWithToast } from '../../src/app/features/azkar/shareActions'
import { CopyButton } from '../../src/app/features/azkar/CopyButton'
import { readFileSync } from 'node:fs'

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}
function setExec(fn: unknown) {
  Object.defineProperty(document, 'execCommand', { value: fn, configurable: true, writable: true })
}

afterEach(() => {
  setClipboard(undefined)
  document.querySelectorAll('[data-testid^="copy-"],textarea').forEach((n) => n.remove())
})

describe('copy helper', () => {
  it('puts the reference on a new line and trims the text', () => {
    expect(copyPayload('  نص  ', 'سورة الفاتحة — آية ١')).toBe('نص\nسورة الفاتحة — آية ١')
    expect(copyPayload('نص')).toBe('نص')
    expect(copyPayload('نص', '  ')).toBe('نص')
  })

  it('uses the clipboard API when it exists', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    expect(await copyText('abc')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('abc')
  })

  it('falls back to a hidden textarea and execCommand when the API is missing, and cleans up', async () => {
    setClipboard(undefined)
    let copiedValue = ''
    setExec(vi.fn(() => { copiedValue = (document.querySelector('textarea') as HTMLTextAreaElement).value; return true }))
    expect(await copyText('نص عربي')).toBe(true)
    expect(copiedValue).toBe('نص عربي')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('falls back when the clipboard API rejects', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    const exec = vi.fn(() => true)
    setExec(exec)
    expect(await copyText('x')).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
  })

  it('returns false when both paths fail and shows "تعذّر النسخ"', async () => {
    setClipboard(undefined)
    setExec(vi.fn(() => false))
    expect(await copyText('x')).toBe(false)
    expect(await copyWithToast('x')).toBe(false)
    expect(screen.getByTestId('copy-failed').textContent).toBe('تعذّر النسخ')
  })

  it('shows "تم النسخ" after a successful copy', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    expect(await copyWithToast('x', 'ref')).toBe(true)
    expect(screen.getByTestId('copy-done').textContent).toBe('تم النسخ')
  })

  it('the copy button writes text and reference, and the fallback textarea is not blocked by the global copy listener', async () => {
    const block = (event: Event) => {
      const t = event.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return
      event.preventDefault()
    }
    document.addEventListener('copy', block)
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    render(<CopyButton text="الذكر" reference="مصدر" label="نسخ الذكر" />)
    fireEvent.click(screen.getByRole('button', { name: 'نسخ الذكر' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('الذكر\nمصدر'))
    document.removeEventListener('copy', block)
  })
})

describe('every screen with readable text offers copy', () => {
  const need: Array<[string, string]> = [
    ['src/app/features/quran/QuranReaderView.tsx', 'copyWithToast'],
    ['src/app/features/quran/center/AyahCenterCard.tsx', 'CopyButton'],
    ['src/app/features/home/DailyAyahCard.tsx', 'copyWithToast'],
    ['src/app/features/azkar/CategoryView.tsx', 'CopyButton'],
    ['src/app/features/azkar/FavoritesView.tsx', 'CopyButton'],
    ['src/app/features/azkar/AzkarJourney.tsx', 'CopyButton'],
    ['src/app/features/hadith/HadithView.tsx', 'CopyButton'],
    ['src/app/features/prophets/StoryBody.tsx', 'CopyButton'],
    ['src/app/features/prophets/YusufStoryBody.tsx', 'CopyButton'],
    ['src/app/features/essentials/EssentialsView.tsx', 'CopyButton'],
    ['src/app/features/library/BookReader.tsx', 'CopyButton'],
  ]
  for (const [file, symbol] of need) {
    it(`${file.split('/').pop()} uses ${symbol}`, () => {
      const src = readFileSync(file, 'utf8')
      expect(src).toContain(symbol)
      expect(src).toMatch(/نسخ/)
    })
  }
})

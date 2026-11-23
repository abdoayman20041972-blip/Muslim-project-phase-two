import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuranReaderView } from './QuranReaderView'
import { QuranAudioProvider } from './QuranAudioProvider'

vi.mock('./data/quran-pages.json', () => ({ default: { '1': [{ surahNumber: 1, number: 1, numberInSurah: 1 }] } }))
vi.mock('./QuranOfflinePlayer', () => ({ QuranOfflinePlayer: () => null }))

describe('safe Quran reading when the map is incomplete', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('azkar_reading_layout', 'pages')
    window.scrollTo = vi.fn()
  })
  it('shows the entire surah, an accessible warning and no fabricated page number', async () => {
    render(<QuranAudioProvider setView={vi.fn()}><QuranReaderView view={{ name: 'mushaf-surah', number: 2 }} setView={vi.fn()} /></QuranAudioProvider>)
    await screen.findByRole('alert')
    await waitFor(() => expect(document.querySelectorAll('[data-ayah]')).toHaveLength(286))
    expect(screen.getByRole('alert').textContent).toContain('بالتمرير')
    expect(screen.queryByLabelText('تنقل الصفحات')).toBeNull()
    expect(document.querySelector('.quran-page-header')).toBeNull()
    expect(localStorage.getItem('azkar_reading_layout')).toBe('pages')
    expect(screen.getByRole('button', { name: 'إعادة تحميل الصفحة' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'متابعة بوضع الآيات' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(localStorage.getItem('azkar_reading_layout')).toBe('scroll')
    expect(document.querySelectorAll('[data-ayah]')).toHaveLength(286)
  })
})

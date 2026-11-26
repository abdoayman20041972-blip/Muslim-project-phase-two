// Audit test for finding M2: the volume-range explanation ("النص المتاح هنا من … إلى …")
// must survive a diagnostic meta.note that readerNote() hides (the bidaya-history case).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { BookViewer } from './BookViewer'
import { LIBRARY_BOOKS } from './libraryData'

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })

const chapters = [{ g: 'الجزء السادس', t: 'باب أول', p: ['نص'] }]

describe('M2: range note vs filtered diagnostic note', () => {
  it('keeps the range explanation visible when the note is a hidden Latin diagnostic', async () => {
    const meta = {
      total: 662,
      complete: false,
      gap: 'ج٧ ص٣٦٢ إلى ص٣٦٦ (في باب فضائل أمير المؤمنين علي بن أبي طالب)',
      from: 'ج٦ ص٣٠١',
      to: 'ج٩ ص١٨٧',
      note: '5 pages absent from dump (vol 7 p362-366); 2 empty-range entries skipped',
    }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ meta, chapters }) })))
    render(<BookViewer book={LIBRARY_BOOKS.find((b) => b.id === 'bidaya-history')!} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('book-toc')).toBeTruthy())
    const diagnosticHidden = screen.queryByTestId('book-note') === null
    const rangeShown = screen.queryByTestId('book-range') !== null
    console.log('[M2] diagnostic note hidden:', diagnosticHidden, '| range note shown:', rangeShown)
    expect(diagnosticHidden).toBe(true)
    expect(rangeShown).toBe(true)
  })
})

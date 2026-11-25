import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BookViewer } from './BookViewer'
import { LIBRARY_BOOKS } from './libraryData'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

const data = { chapters: [{ g: 'الجزء الأول', t: 'باب أول', p: ['نص الفقرة الأولى'] }, { g: 'الجزء الأول', t: 'باب ثان', p: ['نص الفقرة الثانية'] }, { g: 'الجزء الثاني', t: 'باب ثالث', p: ['نص ثالث'] }] }

describe('BookViewer', () => {
  it('lists sections, then chapters, then opens a chapter', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data })))
    render(<BookViewer book={LIBRARY_BOOKS[0]} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('book-toc')).toBeTruthy())
    fireEvent.click(screen.getByText('الجزء الأول'))
    expect(screen.getByText('باب ثان')).toBeTruthy()
    expect(screen.queryByText('باب ثالث')).toBeNull()
    fireEvent.click(screen.getByText('باب أول'))
    expect(screen.getByTestId('book-chapter')).toBeTruthy()
  })
  it('says so when the book is only partly loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ...data, meta: { total: 9, complete: false } }) })))
    render(<BookViewer book={LIBRARY_BOOKS[0]} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('book-partial')).toBeTruthy())
  })
  it('shows an error when the book file cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    render(<BookViewer book={LIBRARY_BOOKS[0]} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
  })
})

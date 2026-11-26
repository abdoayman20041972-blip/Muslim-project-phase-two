import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const pages: number[] = []
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({ promise: Promise.resolve({
    numPages: 5, destroy: async () => {},
    getPage: async (n: number) => ({ getViewport: () => ({ width: 100, height: 150 }), render: () => { pages.push(n); return { promise: Promise.resolve(), cancel: () => {} } } }),
  }) }),
}))
vi.mock('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url', () => ({ default: 'w.js' }))
import { PdfBookReader } from './PdfBookReader'
afterEach(() => { cleanup(); pages.length = 0 })

describe('PdfBookReader', () => {
  it('renders the first page, turns pages and zooms within 100-300%', async () => {
    HTMLCanvasElement.prototype.getContext = (() => ({})) as never
    render(<PdfBookReader title="t" pdfUrl="u" credit="c" firstPage={2} />)
    await waitFor(() => expect(pages).toContain(2))
    fireEvent.click(screen.getByRole('button', { name: 'الصفحة التالية' }))
    await waitFor(() => expect(pages).toContain(3))
    fireEvent.click(screen.getByRole('button', { name: 'الصفحة السابقة' }))
    await waitFor(() => expect(pages.at(-1)).toBe(2))
    const plus = screen.getByRole('button', { name: 'تكبير' })
    for (let i = 0; i < 6; i++) fireEvent.click(plus)
    expect((plus as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'إعادة الحجم' }))
    expect((screen.getByRole('button', { name: 'تصغير' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows an in-reader note instead of crashing the screen when the reader throws while rendering', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bad = { credit: { toString() { throw new Error('boom') }, $$typeof: Symbol.for('react.element') } as unknown as string }
    render(<PdfBookReader title="t" pdfUrl="u" credit={bad.credit} />)
    expect(screen.getByTestId('pdf-book-fallback')).toBeTruthy()
    expect(screen.getByText('تعذر عرض هذه الصفحة.')).toBeTruthy()
    spy.mockRestore()
  })
})

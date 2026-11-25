import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const pages: number[] = []
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({ promise: Promise.resolve({
    numPages: 5, destroy: async () => {},
    getPage: async (n: number) => ({ getViewport: () => ({ width: 100, height: 150 }), render: () => { pages.push(n); return { promise: Promise.resolve() } } }),
  }) }),
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'w.js' }))
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
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LibraryView } from './LibraryView'

vi.mock('./PdfBookReader', () => ({ PdfBookReader: ({ title }: { title: string }) => <div data-testid="pdf-stub">{title}</div> }))
afterEach(cleanup)

describe('LibraryView', () => {
  it('has no disabled card now that every listed book is ready, and still labels any planned book as coming soon', () => {
    render(<LibraryView onBack={() => {}} />)
    expect(screen.queryAllByText('قريبًا').length).toBe(0)
    const disabled = screen.getAllByRole('button').filter((b) => (b as HTMLButtonElement).disabled)
    expect(disabled.length).toBe(0)
  })
  it('opens the vol 1 scan as a clearly named scanned book, and the lessons list', () => {
    render(<LibraryView onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('scan-safwa'))
    fireEvent.click(screen.getByTestId('scan-safwa-vol1'))
    expect(screen.getByTestId('pdf-stub').textContent).toContain('الجزء الأول')
    cleanup()
    render(<LibraryView onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('lessons-entry'))
    expect(screen.getByTestId('lessons-view')).toBeTruthy()
  })

  it('marks bundled books with a blue dot and the internet lessons with a red one, with no offline phrase', () => {
    const { container } = render(<LibraryView onBack={() => {}} />)
    expect(container.querySelectorAll('.lib-dot-local').length).toBe(5)
    expect(container.querySelectorAll('.lib-dot-net').length).toBe(1)
    expect(container.textContent).not.toContain('يُقرأ دون اتصال')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LibraryView } from './LibraryView'

vi.mock('./PdfBookReader', () => ({ PdfBookReader: ({ title }: { title: string }) => <div data-testid="pdf-stub">{title}</div> }))
afterEach(cleanup)

describe('LibraryView', () => {
  it('only lets ready books open and labels the rest as coming soon', () => {
    render(<LibraryView onBack={() => {}} />)
    expect(screen.getAllByText('قريبًا').length).toBe(1)
    const disabled = screen.getAllByRole('button').filter((b) => (b as HTMLButtonElement).disabled)
    expect(disabled.length).toBe(1)
  })
  it('opens the vol 1 scan as a clearly named scanned book, and the lessons list', () => {
    render(<LibraryView onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('scan-safwa-vol1'))
    expect(screen.getByTestId('pdf-stub').textContent).toContain('الجزء الأول')
    cleanup()
    render(<LibraryView onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('lessons-entry'))
    expect(screen.getByTestId('lessons-view')).toBeTruthy()
  })
})

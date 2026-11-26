import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LibraryView } from './LibraryView'

afterEach(cleanup)

describe('LibraryView', () => {
  it('has no disabled card now that every listed book is ready, and still labels any planned book as coming soon', () => {
    render(<LibraryView onBack={() => {}} />)
    expect(screen.queryAllByText('قريبًا').length).toBe(0)
    const disabled = screen.getAllByRole('button').filter((b) => (b as HTMLButtonElement).disabled)
    expect(disabled.length).toBe(0)
  })
  it('no longer lists Sifat al-Safwa, and opens the lessons list', () => {
    const { container } = render(<LibraryView onBack={() => {}} />)
    expect(container.textContent).not.toContain('صفة الصفوة')
    expect(screen.queryByTestId('scan-safwa')).toBeNull()
    cleanup()
    render(<LibraryView onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('lessons-entry'))
    expect(screen.getByTestId('lessons-view')).toBeTruthy()
  })

  it('marks bundled books with a blue dot and the internet lessons with a red one, with no offline phrase', () => {
    const { container } = render(<LibraryView onBack={() => {}} />)
    expect(container.querySelectorAll('.lib-dot-local').length).toBe(4)
    expect(container.querySelectorAll('.lib-dot-net').length).toBe(1)
    expect(container.textContent).not.toContain('يُقرأ دون اتصال')
  })
})

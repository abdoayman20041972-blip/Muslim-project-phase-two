import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProphetsView } from './ProphetsView'

afterEach(cleanup)

describe('ProphetsView', () => {
  it('opens Yusuf with all 111 ayahs in separate blocks and numbered markers', async () => {
    render(<ProphetsView onBack={() => {}} />)
    fireEvent.click(screen.getByText('يوسف'))
    await waitFor(() => expect(screen.getAllByTestId('ys-verse').length).toBeGreaterThan(10))
    await waitFor(() => expect(document.querySelectorAll('.ys-ayah-no').length).toBe(111))
    expect(screen.getAllByText('قال تعالى').length).toBeGreaterThan(10)
  })

  it('opens Nuh with verses from several surahs, each with its own surah name', async () => {
    render(<ProphetsView onBack={() => {}} />)
    fireEvent.click(screen.getByText('نوح'))
    await waitFor(() => expect(document.querySelectorAll('.ys-ayah-no').length).toBeGreaterThan(60))
    expect(screen.getAllByText(/^سورة هود، الآيات/).length).toBeGreaterThan(3)
    expect(screen.getAllByText(/^سورة نوح، /).length).toBeGreaterThan(2)
    expect(document.querySelector('[data-story="nuh"]')).toBeTruthy()
  })

  it('returns to the top when another story opens with the next button', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    render(<ProphetsView onBack={() => {}} />)
    fireEvent.click(screen.getByText('نوح'))
    scrollIntoView.mockClear()
    fireEvent.click(screen.getByText('القصة التالية'))
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
  })

  it('shows ayah blocks without side bracket ornaments, ayah text and numbers intact', async () => {
    render(<ProphetsView onBack={() => {}} />)
    fireEvent.click(screen.getByText('نوح'))
    await waitFor(() => expect(document.querySelectorAll('.ys-ayah-no').length).toBeGreaterThan(60))
    const blocks = document.querySelectorAll('[data-testid="ys-verse"]')
    expect(blocks.length).toBeGreaterThan(3)
    blocks.forEach((block) => {
      expect(block.querySelector('svg:not([data-copy-icon])')).toBeNull()
      expect(block.querySelector('.ys-verse-text')?.textContent?.trim().length).toBeGreaterThan(10)
    })
  })
  it('shows the Yusuf ayah blocks without side bracket ornaments', async () => {
    render(<ProphetsView onBack={() => {}} />)
    fireEvent.click(screen.getByText('يوسف'))
    await waitFor(() => expect(document.querySelectorAll('.ys-ayah-no').length).toBe(111))
    document.querySelectorAll('[data-testid="ys-verse"]').forEach((block) => expect(block.querySelector('svg:not([data-copy-icon])')).toBeNull())
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from '../../src/app/App'
import { useTasbih } from '../../src/app/features/tasbih/useTasbih'
import { useFavorites } from '../../src/app/features/azkar/useFavorites'

function TasbihHarness() {
  const { counts, dayTotal, load } = useTasbih()
  return <div><button onClick={load}>تحميل</button><span data-testid="count">{counts['subhanallah'] || 0}</span><span data-testid="total">{dayTotal}</span></div>
}

function FavoritesHarness() {
  const { favorites, load } = useFavorites()
  return <div><button onClick={load}>تحميل</button><span>{favorites.length}</span></div>
}

describe('edge cases and failure states', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('does not crash when tasbih storage contains invalid JSON', () => {
    localStorage.setItem('azkar_counts', '{bad-json')
    localStorage.setItem('azkar_day_total', '12')
    localStorage.setItem('azkar_day_total_date', new Date().toLocaleDateString('en-CA'))
    render(<TasbihHarness />)
    fireEvent.click(screen.getByText('تحميل'))
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(screen.getByTestId('total')).toHaveTextContent('12')
  })

  it('does not crash when favorites storage contains invalid JSON', () => {
    localStorage.setItem('azkar_favorites', '{bad-json')
    render(<FavoritesHarness />)
    fireEvent.click(screen.getByText('تحميل'))
    expect(screen.getByText('0')).toBeTruthy()
  })

  it('keeps Quran surah search available without ayah search', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<App />)
    await waitFor(() => expect(screen.getByText('مسلم')).toBeTruthy(), { timeout: 4000 })
    fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'المصحف' }))
    await waitFor(() => expect(screen.getByPlaceholderText('ابحث باسم السورة أو رقمها...')).toBeTruthy())
    expect(screen.queryByPlaceholderText('ابحث في آيات القرآن...')).toBeNull()
  })
})

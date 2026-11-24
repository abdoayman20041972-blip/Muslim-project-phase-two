import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDialogProvider } from '../../src/app/components/confirm-dialog'
import type { ZikrCategory } from '../../src/azkar-data'
import { AzkarListView } from '../../src/app/features/azkar/AzkarListView'
import { CategoryView } from '../../src/app/features/azkar/CategoryView'
import { FavoritesView } from '../../src/app/features/azkar/FavoritesView'
import { AZKAR_OCCASION_KEY, AZKAR_PROGRESS_KEY, todayKey } from '../../src/app/features/azkar/azkarProgress'
import { favoriteKey } from '../../src/app/features/azkar/useFavorites'

const morning: ZikrCategory = {
  id: 'morning',
  label: 'أذكار الصباح',
  subtitle: 'اختبار',
  icon: 'spark',
  items: [
    { id: 'm1', text: 'ذكر صباحي أول', repeat: 1 },
    { id: 'm2', text: 'ذكر صباحي ثانٍ', repeat: 1 },
  ],
}
const evening: ZikrCategory = {
  id: 'evening',
  label: 'أذكار المساء',
  subtitle: 'اختبار',
  icon: 'spark',
  items: [{ id: 'e1', text: 'ذكر مسائي', repeat: 1 }],
}
const travel: ZikrCategory = {
  id: 'travel',
  label: 'السفر والركوب',
  subtitle: 'اختبار',
  icon: 'spark',
  items: [{ id: 't1', text: 'دعاء السفر', repeat: 1 }],
}

const renderCategory = (category: ZikrCategory) => render(
  <ConfirmDialogProvider>
    <CategoryView category={category} favorites={[]} onToggleFavorite={vi.fn()} onBack={vi.fn()} />
  </ConfirmDialogProvider>,
)

beforeEach(() => localStorage.clear())

describe('realistic per-wird daily goals', () => {
  it('shows a goal per wird instead of a whole-catalog denominator', () => {
    render(<AzkarListView categories={[morning, evening, travel]} favoritesCount={0} onBack={vi.fn()} setView={vi.fn()} />)
    expect(screen.getByRole('progressbar', { name: 'تقدم الأذكار اليوم: 0 من 3' })).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'تقدم أذكار الصباح: 0 من 2' })).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'تقدم أذكار المساء: 0 من 1' })).toBeTruthy()
  })

  it('scopes the days log to the wirds only', () => {
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days: { '2026-09-18': { [favoriteKey(travel, travel.items[0])]: 1 } } }))
    render(<AzkarListView categories={[morning, evening, travel]} favoritesCount={0} onBack={vi.fn()} setView={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /سجل الأيام/ })[0])
    expect(screen.getByText(/٠ \/ ٣/)).toBeTruthy()
  })
})

describe('occasional sections keep per-occasion counters', () => {
  it('records taps in the occasion store without touching the daily log', () => {
    renderCategory(travel)
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل مرة من الذكر' }))
    expect(JSON.parse(localStorage.getItem(AZKAR_OCCASION_KEY)!)).toEqual({ version: 1, categories: { travel: { occasion: 1, counts: { 'travel:t1': 1 } } } })
    expect(localStorage.getItem(AZKAR_PROGRESS_KEY)).toBeNull()
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 1 من 1' })).toBeTruthy()
  })

  it('offers a new-occasion reset instead of the daily reset', async () => {
    localStorage.setItem(AZKAR_OCCASION_KEY, JSON.stringify({ version: 1, categories: { travel: { occasion: 1, counts: { 'travel:t1': 1 } } } }))
    renderCategory(travel)
    expect(screen.queryByRole('button', { name: 'مسح تقدم اليوم' })).toBeNull()
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 1 من 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'موقف جديد' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(AZKAR_OCCASION_KEY)!)).toEqual({ version: 1, categories: { travel: { occasion: 2, counts: {} } } }))
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 0 من 1' })).toBeTruthy()
    expect(localStorage.getItem(AZKAR_PROGRESS_KEY)).toBeNull()
  })

  it('shows occasion progress for favorites of situational sections', () => {
    localStorage.setItem(AZKAR_OCCASION_KEY, JSON.stringify({ version: 1, categories: { travel: { occasion: 3, counts: { 'travel:t1': 1 } } } }))
    render(<FavoritesView favorites={[{ key: 'travel:t1', category: travel, item: travel.items[0] }]} onToggleFavorite={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 1 من 1' })).toBeTruthy()
  })

  it('migrates today’s situational taps from the daily store into the occasion store once', () => {
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days: {
      [todayKey()]: { 'travel:t1': 1, [favoriteKey(morning, morning.items[0])]: 1 },
      '2026-09-18': { 'travel:travel:item-1': 1 },
    } }))
    renderCategory(travel)
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 1 من 1' })).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(AZKAR_OCCASION_KEY)!)).toEqual({ version: 1, categories: { travel: { occasion: 1, counts: { 'travel:t1': 1 } } } })
    const daily = JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY)!)
    expect(daily.days[todayKey()]).toEqual({ [favoriteKey(morning, morning.items[0])]: 1 })
    expect(daily.days['2026-09-18']).toEqual({ 'travel:travel:item-1': 1 })
  })

  it('keeps daily recording for wird categories', () => {
    renderCategory(morning)
    fireEvent.click(screen.getAllByRole('button', { name: 'تسجيل مرة من الذكر' })[0])
    expect(JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY)!).days[todayKey()]).toEqual({ [favoriteKey(morning, morning.items[0])]: 1 })
    expect(localStorage.getItem(AZKAR_OCCASION_KEY)).toBeNull()
  })
})

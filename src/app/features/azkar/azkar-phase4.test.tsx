import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDialogProvider } from '../../components/confirm-dialog'
import type { ZikrCategory } from '../../../azkar-data'
import type { View } from '../../constants'
import { APP_SETTINGS_KEYS } from '../../settings'
import { AZKAR_PROGRESS_KEY } from './azkarProgress'
import { AzkarListView } from './AzkarListView'
import { CategoryView } from './CategoryView'

const category: ZikrCategory = {
  id: 't',
  label: 'قسم تجريبي',
  subtitle: 'اختبار',
  icon: 'spark',
  items: [
    { id: 't:item-1', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', source: 'رواه مسلم', repeat: 3 },
    { id: 't:item-2', text: 'اللَّهُمَّ اغْفِرْ لِي', source: 'رواه مسلم', repeat: 1 },
  ],
}

beforeEach(() => {
  localStorage.clear()
})

describe('search reaches the dhikr itself', () => {
  it('opens the category at the matched item', () => {
    const views: View[] = []
    render(<AzkarListView categories={[category]} favoritesCount={0} onBack={() => {}} setView={view => views.push(view)} />)
    fireEvent.click(screen.getByLabelText('البحث في الأذكار'))
    fireEvent.change(screen.getByLabelText('ابحث عن ذكر'), { target: { value: 'اغفر' } })
    fireEvent.click(screen.getByRole('button', { name: /فتح قسم تجريبي/ }))
    expect(views).toEqual([{ name: 'category', id: 't', item: 't:item-2' }])
  })

  it('scrolls to the highlighted item in the category view', async () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    render(
      <ConfirmDialogProvider>
        <CategoryView category={category} favorites={[]} onToggleFavorite={() => {}} onBack={() => {}} highlightItem="t:item-2" />
      </ConfirmDialogProvider>,
    )
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled())
    await waitFor(() => {
      const target = document.querySelector('[data-item-id="t:item-2"]')
      expect(target?.getAttribute('data-highlighted')).toBe('true')
    })
    expect(document.querySelector('[data-item-id="t:item-1"]')?.getAttribute('data-highlighted')).toBeNull()
  })
})

describe('visible days log', () => {
  it('shows previous days in a visible region', async () => {
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days: { '2026-11-23': { 't:t:item-1': 3 } } }))
    render(<AzkarListView categories={[category]} favoritesCount={0} onBack={() => {}} setView={() => {}} />)
    const toggle = screen.getAllByRole('button', { name: /سجل الأيام/ })[0]
    fireEvent.click(toggle)
    const region = await screen.findByRole('region', { name: 'سجل الأيام' })
    expect(region.className).not.toContain('sr-only')
    expect(region.textContent).toContain('٢٠٢٦')
    expect(region.textContent).toContain('١ / ٢')
  })
})

describe('independent azkar font size', () => {
  const renderCategory = () => render(
    <ConfirmDialogProvider>
      <CategoryView category={category} favorites={[]} onToggleFavorite={() => {}} onBack={() => {}} />
    </ConfirmDialogProvider>,
  )

  it('defaults to medium and persists enlargement', () => {
    renderCategory()
    const text = screen.getByText('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ')
    expect(text.style.fontSize).toBe('19px')
    fireEvent.click(screen.getByLabelText('تكبير خط الذكر'))
    expect(localStorage.getItem(APP_SETTINGS_KEYS.azkarFontSize)).toBe('l')
    expect(screen.getByText('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ').style.fontSize).toBe('22px')
  })

  it('applies the stored size and shrinks back', () => {
    localStorage.setItem(APP_SETTINGS_KEYS.azkarFontSize, 'l')
    renderCategory()
    expect(screen.getByText('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ').style.fontSize).toBe('22px')
    fireEvent.click(screen.getByLabelText('تصغير خط الذكر'))
    expect(localStorage.getItem(APP_SETTINGS_KEYS.azkarFontSize)).toBe('m')
    expect(screen.getByText('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ').style.fontSize).toBe('19px')
  })
})

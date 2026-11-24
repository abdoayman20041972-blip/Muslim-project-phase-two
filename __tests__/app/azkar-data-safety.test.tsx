import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { CategoryView } from '../../src/app/features/azkar/CategoryView'
import { AzkarListView } from '../../src/app/features/azkar/AzkarListView'
import { FavoritesView } from '../../src/app/features/azkar/FavoritesView'
import { ConfirmDialogProvider } from '../../src/app/components/confirm-dialog'
import { favoriteKey, legacyFavoriteKey } from '../../src/app/features/azkar/useFavorites'
import { AZKAR_PROGRESS_KEY, todayKey } from '../../src/app/features/azkar/azkarProgress'
import { toArabicNumber } from '../../src/app/constants'
import type { ZikrCategory } from '../../src/azkar-data'

const categoryA: ZikrCategory = { id: 'safety-a', label: 'قسم أول', subtitle: 'اختبار', icon: 'spark', items: [{ id: 'item-1', text: 'ذكر القسم الأول', repeat: 1 }] }
const categoryB: ZikrCategory = { id: 'safety-b', label: 'قسم ثانٍ', subtitle: 'اختبار', icon: 'spark', items: [{ id: 'item-1', text: 'ذكر القسم الثاني', repeat: 2 }] }
const keyA = favoriteKey(categoryA, categoryA.items[0])
const keyB = favoriteKey(categoryB, categoryB.items[0])

const storedDay = () => JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY)!).days[todayKey()]
const seedDay = (day: Record<string, number>) => localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days: { [todayKey()]: day } }))
const renderCategory = (category: ZikrCategory) => render(<ConfirmDialogProvider><CategoryView category={category} favorites={[]} onToggleFavorite={vi.fn()} onBack={vi.fn()} /></ConfirmDialogProvider>)

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('azkar data and progress safety (phase 1)', () => {
  it('keeps both categories progress after recording in each of them', () => {
    const first = renderCategory(categoryA)
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل مرة من الذكر' }))
    expect(storedDay()).toEqual({ [keyA]: 1 })
    first.unmount()
    const second = renderCategory(categoryB)
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل مرة من الذكر' }))
    expect(storedDay()).toEqual({ [keyA]: 1, [keyB]: 1 })
    second.unmount()
  })

  it('does not rewrite or drop other categories progress when a category is opened', () => {
    seedDay({ [keyB]: 2 })
    const view = renderCategory(categoryA)
    expect(storedDay()).toEqual({ [keyB]: 2 })
    view.unmount()
  })

  it('migrates this category legacy keys without dropping other categories progress', () => {
    const legacyKey = legacyFavoriteKey(categoryA, categoryA.items[0])
    seedDay({ [legacyKey]: 1, [keyB]: 2 })
    const view = renderCategory(categoryA)
    expect(storedDay()).toEqual({ [keyA]: 1, [keyB]: 2 })
    view.unmount()
  })

  it('keeps the recorded count after closing and reopening the category', () => {
    const first = renderCategory(categoryB)
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل مرة من الذكر' }))
    first.unmount()
    const second = renderCategory(categoryB)
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 1 من 2' })).toBeTruthy()
    second.unmount()
  })

  it('updates the home summary when progress changes without remounting', () => {
    render(<AzkarListView categories={[categoryA]} favoritesCount={0} onBack={vi.fn()} setView={vi.fn()} />)
    expect(screen.getByText(`${toArabicNumber(0)}٪`)).toBeTruthy()
    act(() => {
      seedDay({ [keyA]: 1 })
      window.dispatchEvent(new Event('azkar-progress-changed'))
    })
    expect(screen.getByText(`${toArabicNumber(100)}٪`)).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'تقدم الأذكار اليوم: 1 من 1' })).toBeTruthy()
  })

  it('updates favorite progress when progress changes without remounting', () => {
    const item = { ...categoryB.items[0], repeat: 3 }
    const favorite = { key: favoriteKey(categoryB, item), category: categoryB, item }
    render(<FavoritesView favorites={[favorite]} onToggleFavorite={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 0 من 3' })).toBeTruthy()
    act(() => {
      seedDay({ [favorite.key]: 2 })
      window.dispatchEvent(new Event('azkar-progress-changed'))
    })
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 2 من 3' })).toBeTruthy()
  })
})

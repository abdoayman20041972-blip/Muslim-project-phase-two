import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { useAzkarFeature } from '../../src/app/features/azkar/useAzkarFeature'
import { favoriteKey } from '../../src/app/features/azkar/useFavorites'
import type { ZikrCategory } from '../../src/azkar-data'

const categories: ZikrCategory[] = [{
  id: 'test',
  label: 'اختبار',
  subtitle: 'اختبار',
  icon: 'spark',
  items: [
    { text: 'ذكر أول', source: 'مصدر' },
    { text: 'ذكر ثان', source: 'مصدر' },
  ],
}]

describe('useAzkarFeature', () => {
  beforeEach(() => localStorage.clear())

  it('derives the selected category and starts with no favorites', () => {
    const { result } = renderHook(() => useAzkarFeature(categories, { name: 'category', id: 'test' }))
    expect(result.current.selectedCategory?.id).toBe('test')
    expect(result.current.favoritesCount).toBe(0)
    expect(result.current.favoriteItems).toHaveLength(0)
  })

  it('toggles and resolves a favorite through the isolated feature hook', () => {
    const { result } = renderHook(() => useAzkarFeature(categories, { name: 'azkar-list' }))
    const key = favoriteKey(categories[0], categories[0].items[0])
    act(() => result.current.toggleFavorite(key))
    expect(result.current.favoritesCount).toBe(1)
    expect(result.current.favoriteItems[0].item.text).toBe('ذكر أول')
    expect(localStorage.getItem('azkar_favorites')).toContain(key)
  })
})
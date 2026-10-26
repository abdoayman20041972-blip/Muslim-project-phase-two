import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { favoriteKey, migrateFavorites, useFavorites } from '../../src/app/features/azkar/useFavorites'
import type { ZikrCategory } from '../../src/azkar-data'

const categories: ZikrCategory[] = [{
  id: 'morning', label: 'أذكار الصباح', subtitle: '', icon: 'sun',
  items: [{ text: 'ذكر أول' }, { text: 'ذكر ثان' }],
}]

describe('useFavorites', () => {
  beforeEach(() => localStorage.clear())

  it('creates stable keys that do not depend on item position', () => {
    const original = favoriteKey(categories[0], categories[0].items[0])
    const reordered = favoriteKey({ ...categories[0], items: [categories[0].items[1], categories[0].items[0]] }, categories[0].items[0])
    expect(reordered).toBe(original)
  })

  it('migrates legacy category:index favorites to stable keys', () => {
    const migrated = migrateFavorites(['morning:0', 'morning:1'], categories)
    expect(migrated.changed).toBe(true)
    expect(migrated.keys).toEqual([
      favoriteKey(categories[0], categories[0].items[0]),
      favoriteKey(categories[0], categories[0].items[1]),
    ])
  })

  it('loads and persists migrated favorites', () => {
    localStorage.setItem('azkar_favorites', JSON.stringify(['morning:0']))
    const { result } = renderHook(() => useFavorites(categories))
    act(() => result.current.load())
    const key = favoriteKey(categories[0], categories[0].items[0])
    expect(result.current.favorites).toEqual([key])
    expect(JSON.parse(localStorage.getItem('azkar_favorites')!)).toEqual([key])
    expect(localStorage.getItem('azkar_favorites_version')).toBe('v2')
  })

  it('adds and removes a stable favorite', () => {
    const key = favoriteKey(categories[0], categories[0].items[0])
    const { result } = renderHook(() => useFavorites(categories))
    act(() => result.current.toggleFavorite(key))
    expect(result.current.favorites).toEqual([key])
    act(() => result.current.toggleFavorite(key))
    expect(result.current.favorites).toEqual([])
  })
})

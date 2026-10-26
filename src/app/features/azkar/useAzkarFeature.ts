import { useMemo } from 'react'
import type { ZikrCategory } from '../../../azkar-data'
import type { View } from '../../constants'
import { favoriteKey, useFavorites } from './useFavorites'

export function useAzkarFeature(categories: ZikrCategory[], view: View) {
  const { favorites, load: reloadFavorites, toggleFavorite } = useFavorites(categories)
  const selectedCategory = useMemo(
    () => view.name === 'category' ? categories.find(c => c.id === view.id) ?? null : null,
    [categories, view],
  )
  const favoriteItems = useMemo(() => {
    if (!favorites.length) return []
    const wanted = new Set(favorites)
    const result: Array<{ key: string; category: ZikrCategory; item: ZikrCategory['items'][number] }> = []
    for (const category of categories) {
      for (const item of category.items) {
        const key = favoriteKey(category, item)
        if (wanted.has(key)) result.push({ key, category, item })
      }
    }
    return result
  }, [categories, favorites])

  return {
    categories,
    favorites,
    favoriteItems,
    selectedCategory,
    favoritesCount: favoriteItems.length,
    toggleFavorite,
    reloadFavorites,
  }
}
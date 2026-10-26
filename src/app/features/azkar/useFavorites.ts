import { useCallback, useEffect, useRef, useState } from 'react'
import type { ZikrCategory, ZikrItem } from '../../../azkar-data'

const FAVORITES_KEY = 'azkar_favorites'
const FAVORITES_VERSION_KEY = 'azkar_favorites_version'
const FAVORITES_VERSION = 'v2'

function legacyFavoriteKey(category: ZikrCategory, item: ZikrItem) {
  let hash = 2166136261
  const text = item.text.normalize('NFKC').trim()
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `${category.id}:${(hash >>> 0).toString(36)}`
}

export function favoriteKey(category: ZikrCategory, item: ZikrItem) {
  return item.id ? `${category.id}:${item.id}` : legacyFavoriteKey(category, item)
}

function isStableKey(key: string) {
  const separator = key.lastIndexOf(':')
  if (separator <= 0) return false
  return /^item-\d+$/.test(key.slice(separator + 1))
}

export function migrateFavorites(saved: unknown, categories: ZikrCategory[]) {
  if (!Array.isArray(saved)) return { keys: [], changed: true }
  const result = new Set<string>()
  let changed = false

  for (const value of saved) {
    if (typeof value !== 'string') {
      changed = true
      continue
    }
    if (isStableKey(value)) {
      result.add(value)
      continue
    }

    const separator = value.lastIndexOf(':')
    const categoryId = separator > 0 ? value.slice(0, separator) : ''
    const category = categories.find(item => item.id === categoryId)
    const item = category?.items.find(candidate => legacyFavoriteKey(category, candidate) === value)
      ?? (separator > 0 && /^\d+$/.test(value.slice(separator + 1))
        ? category?.items[Number(value.slice(separator + 1))]
        : undefined)

    if (category && item) result.add(favoriteKey(category, item))
    changed = true
  }

  return { keys: [...result], changed }
}

export function useFavorites(categories: ZikrCategory[] = []) {
  const [favorites, setFavorites] = useState<string[]>([])
  const hydratedRef = useRef(false)

  const load = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
      const migrated = migrateFavorites(saved, categories)
      setFavorites(migrated.keys)
      hydratedRef.current = true
      if (migrated.changed || localStorage.getItem(FAVORITES_VERSION_KEY) !== FAVORITES_VERSION) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(migrated.keys))
        localStorage.setItem(FAVORITES_VERSION_KEY, FAVORITES_VERSION)
      }
    } catch {}
  }, [categories])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!hydratedRef.current) return
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
      localStorage.setItem(FAVORITES_VERSION_KEY, FAVORITES_VERSION)
    } catch {}
  }, [favorites])

  const toggleFavorite = useCallback((key: string) => {
    setFavorites(current => current.includes(key) ? current.filter(x => x !== key) : [...current, key])
  }, [])

  return { favorites, load, toggleFavorite }
}

export { FAVORITES_KEY, legacyFavoriteKey }

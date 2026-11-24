import { useEffect, useState } from 'react'
import { azkarCategories } from '../../../azkar-data'
import { completedItemCount, countedItems, readAzkarProgress } from '../azkar/azkarProgress'
import { withStableIds } from '../azkar/useAzkarCatalog'
import { favoriteKey } from '../azkar/useFavorites'
import { loadReadingPosition, READING_POSITION_EVENT, type ReadingPosition } from '../quran/readingPosition'

const CATALOG = withStableIds(azkarCategories)

export type WirdProgress = { completed: number; total: number }

function wirdProgress(id: 'morning' | 'evening', progress: Record<string, number>): WirdProgress | null {
  const category = CATALOG.find((c) => c.id === id)
  if (!category) return null
  const counted = countedItems(category.items)
  const keys = counted.map((item) => favoriteKey(category, item))
  return { completed: completedItemCount(counted, keys, progress), total: counted.length }
}

export type HomeProgress = {
  morning: WirdProgress | null
  evening: WirdProgress | null
  reading: ReadingPosition | null
}

function read(): HomeProgress {
  const progress = readAzkarProgress()
  let reading: HomeProgress['reading'] = null
  try {
    const pos = loadReadingPosition()
    reading = pos
  } catch { reading = null }
  return { morning: wirdProgress('morning', progress), evening: wirdProgress('evening', progress), reading }
}

/** Live values for the home progress cards, read from the same stores the Azkar and Quran screens write. */
export function useHomeProgress(): HomeProgress {
  const [value, setValue] = useState<HomeProgress>(read)
  useEffect(() => {
    const refresh = () => setValue(read())
    refresh()
    const id = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    window.addEventListener(READING_POSITION_EVENT, refresh)
    window.addEventListener('storage', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', refresh)
      window.removeEventListener(READING_POSITION_EVENT, refresh)
      window.removeEventListener('storage', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return value
}

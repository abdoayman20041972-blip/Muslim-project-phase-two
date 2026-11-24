import { beforeEach, describe, expect, it } from 'vitest'
import { azkarCategories } from '../../../azkar-data'
import {
  AZKAR_PROGRESS_KEY,
  completedItemCount,
  completionPercent,
  countedItems,
  isCountedZikr,
  readAzkarProgress,
  todayKey,
} from './azkarProgress'
import { favoriteKey, migrateFavorites } from './useFavorites'

const evening = azkarCategories.find((category) => category.id === 'evening')!
const morning = azkarCategories.find((category) => category.id === 'morning')!
const istighfar = azkarCategories.find((category) => category.id === 'istighfar')!

// Keys a real pre-phase-2 install can hold in localStorage:
// - the truncated amsayna duplicate removed by the evening merge (old item-7)
// - hash-style keys from before stable item ids existed
// - taps on items that are now fadl (no counter), e.g. istighfar fadl reports
const keyOf = (categoryId: string, itemId: string) => `${categoryId}:${itemId}`
const STALE_REMOVED_KEY = keyOf('evening', 'evening:item-7')
const STALE_HASH_KEY = 'evening:kdjw21'
const fadlItem = istighfar.items.find((item) => item.kind === 'fadl')!
const FADL_KEY = favoriteKey(istighfar, fadlItem)
const HASBI_MORNING = keyOf('morning', 'morning:item-8')

function seedProgress(map: Record<string, number>) {
  localStorage.setItem(
    AZKAR_PROGRESS_KEY,
    JSON.stringify({ version: 2, days: { [todayKey()]: map } }),
  )
}

describe('azkar legacy stored progress and favorites', () => {
  beforeEach(() => localStorage.clear())

  it('ignores progress stored under removed ids without crashing', () => {
    const counted = countedItems(evening.items)
    const keys = counted.map((item) => favoriteKey(evening, item))
    expect(keys).not.toContain(STALE_REMOVED_KEY)

    const progress: Record<string, number> = { [STALE_REMOVED_KEY]: 3, [STALE_HASH_KEY]: 100 }
    for (const key of keys) progress[key] = 100000

    const done = completedItemCount(counted, keys, progress)
    expect(done).toBe(counted.length)
    expect(completionPercent(done, counted.length)).toBe(100)
  })

  it('never counts stored taps on items that are now fadl (no counter)', () => {
    expect(isCountedZikr(fadlItem)).toBe(false)
    expect(fadlItem.repeat).toBeUndefined()

    const counted = countedItems(istighfar.items)
    const countedKeys = counted.map((item) => favoriteKey(istighfar, item))
    expect(countedKeys).not.toContain(FADL_KEY)

    const progress: Record<string, number> = { [FADL_KEY]: 100 }
    expect(completedItemCount(counted, countedKeys, progress)).toBe(0)
  })

  it('keeps hasbi Allah a single-recitation zikr with no displayed count', () => {
    const hasbi = morning.items.find((item) => keyOf('morning', item.id!) === HASBI_MORNING)!
    expect(hasbi.repeat).toBeUndefined()
    expect(hasbi.source).toBe('التوبة ١٢٩')
  })

  it('reads a mixed stored day without throwing and keeps stale keys inert', () => {
    seedProgress({ [STALE_REMOVED_KEY]: 2, [STALE_HASH_KEY]: 5, [FADL_KEY]: 100 })
    const progress = readAzkarProgress()
    const counted = countedItems(evening.items)
    const keys = counted.map((item) => favoriteKey(evening, item))
    expect(() => completedItemCount(counted, keys, progress)).not.toThrow()
    expect(completedItemCount(counted, keys, progress)).toBe(0)
  })

  it('drops favorites pointing at removed ids when resolving against the catalog', () => {
    const saved = [STALE_REMOVED_KEY, STALE_HASH_KEY, HASBI_MORNING]
    const { keys } = migrateFavorites(saved, azkarCategories)
    const wanted = new Set(keys)
    const resolved = azkarCategories.flatMap((category) =>
      category.items
        .filter((item) => wanted.has(favoriteKey(category, item)))
        .map((item) => keyOf(category.id, item.id!)),
    )
    expect(resolved).toEqual([HASBI_MORNING])
  })

  it('migrates legacy hash favorites to the stable id of the same text', () => {
    const target = evening.items[0]
    const legacyKey = (() => {
      let hash = 2166136261
      const text = target.text.normalize('NFKC').trim()
      for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
      }
      return `${evening.id}:${(hash >>> 0).toString(36)}`
    })()
    const { keys } = migrateFavorites([legacyKey], azkarCategories)
    expect(keys).toEqual([favoriteKey(evening, target)])
  })
})

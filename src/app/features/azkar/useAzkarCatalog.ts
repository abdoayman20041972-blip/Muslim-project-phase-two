import { useState } from 'react'
import { azkarCategories, type ZikrCategory } from '../../../azkar-data'

// The full Hisn al-Muslim content is bundled offline (see azkar-hisn.ts), so the
// catalog needs no remote fetching or source switching.
export function useAzkarCatalog() {
  const [categories] = useState<ZikrCategory[]>(() => withStableIds(azkarCategories))
  return { categories }
}

export { withStableIds }

function withStableIds(categories: ZikrCategory[]): ZikrCategory[] {
  return categories.map((category, categoryIndex) => ({
    ...category,
    items: category.items.map((item, index) => ({
      ...item,
      id: item.id || `${category.id || `cat-${categoryIndex}`}:item-${index + 1}`,
    })),
  }))
}

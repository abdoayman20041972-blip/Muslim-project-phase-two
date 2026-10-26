import { describe, expect, it } from 'vitest'
import { azkarCategories, totalAzkarCount } from '../../src/azkar-data'

describe('Azkar data', () => {
  it('contains categories with valid ids, labels, and items', () => {
    expect(azkarCategories.length).toBeGreaterThan(0)
    expect(azkarCategories.every(c => c.id && c.label && c.items.length > 0)).toBe(true)
  })
  it('has a total count matching the category item counts', () => {
    const calculated = azkarCategories.reduce((sum, c) => sum + c.items.length, 0)
    expect(totalAzkarCount).toBe(calculated)
    expect(totalAzkarCount).toBeGreaterThan(0)
  })
  it('has non-empty Arabic text and preserves references when available', () => {
    expect(azkarCategories.every(c => c.items.every(item => item.text.trim().length > 0))).toBe(true)
    expect(azkarCategories.some(c => c.items.some(item => Boolean(item.source?.trim())))).toBe(true)
  })
})

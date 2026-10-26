import { describe, expect, it } from 'vitest'
import { AZKAR_PROGRESS_KEY, AZKAR_PROGRESS_RETENTION_DAYS, clearAzkarProgressDay, completionPercent, completedItemCount, itemCount, itemTarget, migrateLegacyProgress, readAzkarProgressDays, saveAzkarProgress } from '../../src/app/features/azkar/azkarProgress'

describe('azkar progress', () => {
  it('caps each count at its repeat target and completes only at target', () => {
    expect(itemTarget(undefined)).toBe(1)
    expect(itemTarget(33)).toBe(33)
    expect(itemCount({a: 40}, 'a', 33)).toBe(33)
    expect(completedItemCount([{repeat: 3},{repeat: 1}], ['a','b'], {a:2,b:1})).toBe(1)
    expect(completionPercent(1, 2)).toBe(50)
  })

  it('reads stored days and clears only the requested day', () => {
    const today = new Date()
    const key = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({
      version: 2,
      days: { [key]: { 'morning:item-1': 2 }, '2000-01-01': { 'morning:item-2': 1 } },
    }))
    expect(readAzkarProgressDays()[key]).toEqual({ 'morning:item-1': 2 })
    expect(clearAzkarProgressDay(today)).toBe(true)
    expect(readAzkarProgressDays()).toEqual({ '2000-01-01': { 'morning:item-2': 1 } })
  })

  it('returns false when clearing corrupted progress JSON', () => {
    localStorage.setItem(AZKAR_PROGRESS_KEY, '{bad-json')
    expect(clearAzkarProgressDay()).toBe(false)
  })

  it('retains exactly the configured number of recent progress days', () => {
    const days: Record<string, Record<string, number>> = {}
    for (let offset = 0; offset < AZKAR_PROGRESS_RETENTION_DAYS + 10; offset += 1) {
      const date = new Date(2026, 0, 1)
      date.setDate(date.getDate() + offset)
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
      days[key] = { 'morning:item-1': offset + 1 }
    }
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days }))
    saveAzkarProgress({ 'morning:item-1': 999 }, new Date(2026, 3, 10))
    const storedDays = readAzkarProgressDays()
    expect(Object.keys(storedDays)).toHaveLength(AZKAR_PROGRESS_RETENTION_DAYS)
    expect(Object.keys(storedDays).sort()[0]).toBe('2026-01-11')
    expect(Object.keys(storedDays).sort().at(-1)).toBe('2026-04-10')
  })

  it('migrates legacy v1 progress once and marks the migration', () => {
    const store: Record<string,string> = {
      azkar_azkar_item_progress_v1: JSON.stringify({ 'morning:item-1': 3 }),
    }
    const read = (key: string) => store[key] ?? null
    const write = (key: string, value: string) => { store[key] = value }
    const remove = (key: string) => { delete store[key] }
    expect(migrateLegacyProgress(read, write, remove)).toBe(true)
    expect(store.azkar_azkar_item_progress_v2).toContain('morning:item-1')
    expect(store.azkar_azkar_item_progress_v2_migrated).toBe('1')
    expect(store.azkar_azkar_item_progress_v1).toBeUndefined()
    expect(migrateLegacyProgress(read, write, remove)).toBe(false)
  })
})

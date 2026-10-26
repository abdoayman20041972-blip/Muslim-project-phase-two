import { describe, expect, it } from 'vitest'
import { DAILY_AYAHS, dailyAyahFor, dailyAyahIndex } from '../../src/daily-ayahs'
import { completionPercent, itemCount, itemTarget, timeBasedAzkar } from '../../src/app/features/azkar/azkarProgress'

describe('Step 5 helpers', () => {
  it('keeps the daily ayah deterministic for the same day', () => {
    const date = new Date(2026, 8, 19, 12)
    expect(dailyAyahFor(date)).toEqual(DAILY_AYAHS[dailyAyahIndex(date)])
    expect(dailyAyahFor(new Date(2026, 8, 19, 23))).toEqual(dailyAyahFor(date))
  })

  it('uses the civil date rather than the host timezone for the daily ayah', () => {
    const start = new Date(2026, 8, 30, 0, 0, 0)
    const end = new Date(2026, 8, 30, 23, 59, 59)
    expect(dailyAyahFor(start)).toEqual(dailyAyahFor(end))
    expect(dailyAyahIndex(start)).toBe(dailyAyahIndex(end))
  })

  it('supports capped Azkar progress and percentage calculation', () => {
    expect(itemTarget()).toBe(1)
    expect(itemTarget(3)).toBe(3)
    expect(itemCount({ a: 9 }, 'a', 3)).toBe(3)
    expect(completionPercent(3, 4)).toBe(75)
    expect(completionPercent(0, 0)).toBe(0)
  })

  it('selects the contextual Azkar category by time of day', () => {
    expect(timeBasedAzkar(new Date(2026, 8, 19, 8)).id).toBe('morning')
    expect(timeBasedAzkar(new Date(2026, 8, 19, 17)).id).toBe('evening')
    expect(timeBasedAzkar(new Date(2026, 8, 19, 23)).id).toBe('sleep')
  })
})

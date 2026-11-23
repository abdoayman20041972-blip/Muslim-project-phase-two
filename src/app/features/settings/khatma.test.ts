import { describe, expect, it } from 'vitest'
import {
  KHATMA_TOTAL_PAGES,
  clampKhatmaDailyTarget,
  clampKhatmaPage,
  estimateKhatma,
} from './khatma'

describe('khatma validation (س17)', () => {
  it('clamps the page into [0, 604]', () => {
    expect(clampKhatmaPage('0')).toBe(0)
    expect(clampKhatmaPage('250')).toBe(250)
    expect(clampKhatmaPage('604')).toBe(KHATMA_TOTAL_PAGES)
    expect(clampKhatmaPage('999')).toBe(KHATMA_TOTAL_PAGES)
    expect(clampKhatmaPage('-5')).toBe(0)
    expect(clampKhatmaPage('12.9')).toBe(12)
  })

  it('rejects empty and non-numeric page input instead of saving it', () => {
    expect(clampKhatmaPage('')).toBeNull()
    expect(clampKhatmaPage('   ')).toBeNull()
    expect(clampKhatmaPage('abc')).toBeNull()
  })

  it('clamps the daily target into [1, 604] and rejects invalid input', () => {
    expect(clampKhatmaDailyTarget('20')).toBe(20)
    expect(clampKhatmaDailyTarget('0')).toBe(1)
    expect(clampKhatmaDailyTarget('-3')).toBe(1)
    expect(clampKhatmaDailyTarget('1000')).toBe(KHATMA_TOTAL_PAGES)
    expect(clampKhatmaDailyTarget('')).toBeNull()
    expect(clampKhatmaDailyTarget('xyz')).toBeNull()
  })

  it('gives the daily target a visible meaning: remaining pages and an ETA', () => {
    const from = new Date('2026-11-24T00:00:00Z')
    const estimate = estimateKhatma(300, 10, from)
    expect(estimate.remaining).toBe(304)
    expect(estimate.days).toBe(31)
    expect(estimate.finishDate?.toISOString().slice(0, 10)).toBe('2026-12-25')
  })

  it('treats a finished khatma as complete', () => {
    const estimate = estimateKhatma(604, 10)
    expect(estimate.remaining).toBe(0)
    expect(estimate.days).toBe(0)
    expect(estimate.finishDate).toBeNull()
  })

  it('survives out-of-range stored values', () => {
    const estimate = estimateKhatma(9999, 0)
    expect(estimate.remaining).toBe(0)
    expect(estimate.days).toBe(0)
  })
})

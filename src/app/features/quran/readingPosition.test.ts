import { beforeEach, describe, expect, it } from 'vitest'
import {
  loadReadingPosition,
  readingPositionLabel,
  saveReadingPosition,
} from './readingPosition'
import { APP_SETTINGS_KEYS } from '../../settings'

describe('reading position storage (س16)', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a page-mode position', () => {
    saveReadingPosition({ surah: 2, layout: 'pages', pageIndex: 5, realPage: 7 })
    const loaded = loadReadingPosition()
    expect(loaded).toMatchObject({ surah: 2, layout: 'pages', pageIndex: 5, realPage: 7 })
    expect(typeof loaded?.updatedAt).toBe('number')
  })

  it('round-trips a scroll-mode position', () => {
    saveReadingPosition({ surah: 18, layout: 'scroll', ayah: 42 })
    expect(loadReadingPosition()).toMatchObject({ surah: 18, layout: 'scroll', ayah: 42 })
  })

  it('returns null when nothing is stored or the stored value is corrupt', () => {
    expect(loadReadingPosition()).toBeNull()
    localStorage.setItem(APP_SETTINGS_KEYS.readingPosition, 'not json')
    expect(loadReadingPosition()).toBeNull()
    localStorage.setItem(APP_SETTINGS_KEYS.readingPosition, JSON.stringify({ surah: 999, layout: 'pages', pageIndex: 0 }))
    expect(loadReadingPosition()).toBeNull()
    localStorage.setItem(APP_SETTINGS_KEYS.readingPosition, JSON.stringify({ surah: 2, layout: 'pages' }))
    expect(loadReadingPosition()).toBeNull()
  })

  it('refuses to save an invalid position', () => {
    saveReadingPosition({ surah: 0, layout: 'scroll', ayah: 1 })
    saveReadingPosition({ surah: 2, layout: 'scroll', ayah: 0 })
    saveReadingPosition({ surah: 2, layout: 'pages', pageIndex: -1 })
    expect(loadReadingPosition()).toBeNull()
  })

  it('labels positions for the continue-reading row', () => {
    const format = (n: number) => `#${n}`
    expect(readingPositionLabel(null, format)).toBeNull()
    expect(readingPositionLabel({ surah: 2, layout: 'pages', pageIndex: 5, realPage: 7, updatedAt: 0 }, format)).toBe('صفحة #7')
    expect(readingPositionLabel({ surah: 2, layout: 'pages', pageIndex: 5, updatedAt: 0 }, format)).toBeNull()
    expect(readingPositionLabel({ surah: 2, layout: 'scroll', ayah: 42, updatedAt: 0 }, format)).toBe('الآية #42')
  })
})

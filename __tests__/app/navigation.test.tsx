import { describe, expect, it } from 'vitest'
import { hasBottomNav, sectionOf } from '../../src/app/constants'

describe('navigation mapping', () => {
  it('maps home to the home section', () => expect(sectionOf({ name: 'home' })).toBe('home'))
  it('maps azkar views to the azkar section', () => {
    expect(sectionOf({ name: 'azkar-list' })).toBe('azkar')
    expect(sectionOf({ name: 'category', id: 'morning' })).toBe('azkar')
  })
  it('maps Quran views to mushaf section', () => {
    expect(sectionOf({ name: 'mushaf-list' })).toBe('mushaf')
    expect(sectionOf({ name: 'mushaf-surah', number: 2 })).toBe('mushaf')
  })
  it('maps standalone screens to their sections', () => {
    // Prayer times, qibla and prophets are standalone screens outside primary nav sections.
    expect(sectionOf({ name: 'prayer-times' })).toBeNull()
    expect(sectionOf({ name: 'qibla' })).toBeNull()
    expect(sectionOf({ name: 'prophets' })).toBeNull()
    expect(sectionOf({ name: 'favorites' })).toBe('azkar')
    expect(sectionOf({ name: 'hadith' })).toBe('hadith')
    expect(sectionOf({ name: 'tasbih' })).toBe('more')
    expect(sectionOf({ name: 'settings' })).toBe('more')
    expect(sectionOf({ name: 'more' })).toBe('more')
  })

  it('shows the bottom bar only on the five main tab destinations', () => {
    for (const view of [{ name: 'home' }, { name: 'azkar-list' }, { name: 'mushaf-list' }, { name: 'hadith' }, { name: 'more' }] as const) {
      expect(hasBottomNav(view), view.name).toBe(true)
    }
  })
  it('hides the bottom bar on inner screens, like the original app', () => {
    for (const view of [{ name: 'category', id: 'morning' }, { name: 'favorites' }, { name: 'tasbih' }, { name: 'prayer-times' }, { name: 'qibla' }, { name: 'prophets' }, { name: 'settings' }, { name: 'mushaf-surah', number: 2 }] as const) {
      expect(hasBottomNav(view), view.name).toBe(false)
    }
  })
})

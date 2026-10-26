import { describe, expect, it } from 'vitest'
import { sectionOf } from '../../src/app/constants'

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
    expect(sectionOf({ name: 'tasbih' })).toBe('tasbih')
    expect(sectionOf({ name: 'settings' })).toBe('more')
  })
})

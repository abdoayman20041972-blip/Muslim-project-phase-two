import { describe, expect, it } from 'vitest'
import { notificationOpenTarget } from '../../src/app/App'

describe('notification routing', () => {
  it('maps supported open targets to app views', () => {
    expect(notificationOpenTarget('prayer')).toEqual({ name: 'prayer-times' })
    expect(notificationOpenTarget('azkar')).toEqual({ name: 'azkar-list' })
    expect(notificationOpenTarget('ayah')).toEqual({ name: 'mushaf-list' })
  })

  it('routes azkar, Friday Kahf and Quran reminders to their exact content', () => {
    localStorage.removeItem('azkar_last_surah')
    expect(notificationOpenTarget('azkar-morning')).toEqual({ name: 'category', id: 'morning' })
    expect(notificationOpenTarget('azkar-evening')).toEqual({ name: 'category', id: 'evening' })
    expect(notificationOpenTarget('kahf')).toEqual({ name: 'mushaf-surah', number: 18 })
    expect(notificationOpenTarget('quran')).toEqual({ name: 'mushaf-list' })
    localStorage.setItem('azkar_last_surah', '36')
    expect(notificationOpenTarget('quran')).toEqual({ name: 'mushaf-surah', number: 36 })
    localStorage.setItem('azkar_last_surah', '999')
    expect(notificationOpenTarget('quran')).toEqual({ name: 'mushaf-list' })
    localStorage.removeItem('azkar_last_surah')
  })

  it('ignores missing or unknown open targets', () => {
    expect(notificationOpenTarget(null)).toBeNull()
    expect(notificationOpenTarget('home')).toBeNull()
  })
})

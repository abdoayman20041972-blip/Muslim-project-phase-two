import { describe, expect, it } from 'vitest'
import { notificationOpenTarget } from '../../src/app/App'
import { APP_SETTINGS_KEYS, BACKUP_KEYS, SETTINGS_RESET_KEYS, isBackupKey } from '../../src/app/settings'

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


describe('notification settings persistence', () => {
  const keys = [
    APP_SETTINGS_KEYS.mutedPrayers,
    APP_SETTINGS_KEYS.kahfReminder,
    APP_SETTINGS_KEYS.kahfReminderTime,
    APP_SETTINGS_KEYS.prayerReminderLead,
    APP_SETTINGS_KEYS.prayerTime,
    APP_SETTINGS_KEYS.reminders,
    APP_SETTINGS_KEYS.dailyAyah,
    APP_SETTINGS_KEYS.dailyAyahTime,
    APP_SETTINGS_KEYS.quranReminder,
    APP_SETTINGS_KEYS.quranReminderTime,
    APP_SETTINGS_KEYS.azkarMorning,
    APP_SETTINGS_KEYS.azkarEvening,
  ]

  it('every notification preference is in the backup list and the reset list', () => {
    for (const key of keys) {
      expect(BACKUP_KEYS.has(key), key).toBe(true)
      expect(isBackupKey(key), key).toBe(true)
      expect(SETTINGS_RESET_KEYS.includes(key), key).toBe(true)
    }
  })

  it('keeps the stored key names stable so existing user choices carry over', () => {
    expect(APP_SETTINGS_KEYS.prayerTime).toBe('azkar_prayer_time_notifications')
    expect(APP_SETTINGS_KEYS.reminders).toBe('azkar_reminders_on')
    expect(APP_SETTINGS_KEYS.prayerReminderLead).toBe('azkar_prayer_reminder_lead')
    expect(APP_SETTINGS_KEYS.mutedPrayers).toBe('azkar_muted_prayers')
    expect(APP_SETTINGS_KEYS.kahfReminder).toBe('azkar_friday_kahf_reminder')
  })
})

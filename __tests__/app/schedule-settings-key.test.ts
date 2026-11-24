import { beforeEach, describe, expect, it } from 'vitest'
import { scheduleSettingsKey } from '../../src/app/features/notifications/nativeNotifications'
import { APP_SETTINGS_KEYS } from '../../src/app/settings'

// The re-arm fingerprint includes this key, so each of these settings must
// change it, and an unchanged state must keep it identical (re-arm skipped).

beforeEach(() => localStorage.clear())

describe('scheduleSettingsKey', () => {
  it('is stable while nothing changes', () => {
    expect(scheduleSettingsKey()).toBe(scheduleSettingsKey())
  })

  it.each([
    [APP_SETTINGS_KEYS.prayerCalcMethod, '5'],
    [APP_SETTINGS_KEYS.asrSchool, '1'],
    [APP_SETTINGS_KEYS.timeFormat, '12'],
    [APP_SETTINGS_KEYS.numberStyle, 'western'],
  ])('changes when %s changes', (key, value) => {
    const before = scheduleSettingsKey()
    localStorage.setItem(key, value)
    expect(scheduleSettingsKey()).not.toBe(before)
  })
})

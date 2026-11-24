import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_SETTINGS_KEYS } from '../../src/app/settings'

const ln = {
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  createChannel: vi.fn(),
  deleteChannel: vi.fn(),
  schedule: vi.fn(),
  cancel: vi.fn(),
  getPending: vi.fn(),
  getDeliveredNotifications: vi.fn(),
  checkExactNotificationSetting: vi.fn(),
  changeExactNotificationSetting: vi.fn(),
}

// setAlarmClock plugin: every planned alarm's TIME must go through here.
const alarms = {
  schedule: vi.fn(),
  add: vi.fn(),
  cancelOne: vi.fn(),
  cancel: vi.fn(),
  pending: vi.fn(),
  check: vi.fn(),
}

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }))
vi.mock('@muslim/exact-alarms', () => ({ ExactAlarms: alarms }))

async function load() {
  vi.resetModules()
  return import('../../src/app/features/notifications/nativeNotifications')
}

// Cairo coordinates: real timings computed by the bundled astronomical code.
const CAIRO = JSON.stringify({ lat: 30.06, lng: 31.25 })

describe('scheduler re-entry when prayer settings change', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    localStorage.clear()
    Object.values(ln).forEach((fn) => fn.mockReset().mockResolvedValue(undefined))
    Object.values(alarms).forEach((fn) => fn.mockReset().mockResolvedValue(undefined))
    ln.checkPermissions.mockResolvedValue({ display: 'granted' })
    ln.getPending.mockResolvedValue({ notifications: [] })
    alarms.schedule.mockResolvedValue({ armed: 300, stored: 300 })
    alarms.pending.mockResolvedValue({ items: [] })
    alarms.check.mockResolvedValue({ exactAlarm: 'granted' })
    localStorage.setItem(APP_SETTINGS_KEYS.prayerTime, '1')
    localStorage.setItem(APP_SETTINGS_KEYS.reminders, '1')
    localStorage.setItem(APP_SETTINGS_KEYS.coords, CAIRO)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('skips an unchanged state after the first run', async () => {
    const { scheduleNativeNotifications } = await load()
    await scheduleNativeNotifications()
    expect(alarms.schedule).toHaveBeenCalledTimes(1)
    await scheduleNativeNotifications()
    expect(alarms.schedule).toHaveBeenCalledTimes(1)
  })

  it.each([
    [APP_SETTINGS_KEYS.prayerCalcMethod, '5'],
    [APP_SETTINGS_KEYS.asrSchool, '1'],
    [APP_SETTINGS_KEYS.timeFormat, '12'],
    [APP_SETTINGS_KEYS.numberStyle, 'western'],
  ])('re-arms again after %s changes', async (key, value) => {
    const { scheduleNativeNotifications } = await load()
    await scheduleNativeNotifications()
    expect(alarms.schedule).toHaveBeenCalledTimes(1)
    localStorage.setItem(key, value)
    await scheduleNativeNotifications()
    expect(alarms.schedule).toHaveBeenCalledTimes(2)
    // and the new state is itself remembered
    await scheduleNativeNotifications()
    expect(alarms.schedule).toHaveBeenCalledTimes(2)
  })
})

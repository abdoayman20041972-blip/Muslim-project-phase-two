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
  return import('../../src/app/features/notifications/nativeNotifications')
}

// Cairo coordinates: real timings computed by the bundled astronomical code.
const CAIRO = JSON.stringify({ lat: 30.06, lng: 31.25 })

describe('scheduleNativeNotifications (native, exact alarms)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    localStorage.clear()
    Object.values(ln).forEach((fn) => fn.mockReset().mockResolvedValue(undefined))
    Object.values(alarms).forEach((fn) => fn.mockReset().mockResolvedValue(undefined))
    ln.checkPermissions.mockResolvedValue({ display: 'granted' })
    ln.getPending.mockResolvedValue({ notifications: [] })
    alarms.schedule.mockResolvedValue({ armed: 0, stored: 0 })
    alarms.pending.mockResolvedValue({ items: [] })
    alarms.check.mockResolvedValue({ exactAlarm: 'granted' })
    // Adhan at the exact prayer time + reminders five minutes ahead.
    localStorage.setItem(APP_SETTINGS_KEYS.prayerTime, '1')
    localStorage.setItem(APP_SETTINGS_KEYS.reminders, '1')
    localStorage.setItem(APP_SETTINGS_KEYS.coords, CAIRO)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('arms the whole plan through setAlarmClock, never the stock plugin', async () => {
    alarms.schedule.mockResolvedValue({ armed: 300, stored: 300 })
    const { scheduleNativeNotifications, DAYS_AHEAD } = await load()
    await scheduleNativeNotifications({ force: true })

    expect(alarms.schedule).toHaveBeenCalledTimes(1)
    const { alarms: plan, keepIds, armWithinMs } = alarms.schedule.mock.calls[0]![0] as {
      alarms: Array<Record<string, unknown>>
      keepIds: number[]
      armWithinMs?: number
    }
    // A whole month of prayers + reminders: five prayers, at-time + lead, per day.
    expect(plan.length).toBeGreaterThanOrEqual(DAYS_AHEAD * 10 - 10)
    // Every alarm carries the absolute instant setAlarmClock needs.
    for (const alarm of plan) {
      expect(typeof alarm.at).toBe('number')
      expect(alarm.at).toBeGreaterThan(Date.now())
    }
    // v1.2.7: only a 48-hour window is actually ARMED natively (Android's
    // per-app alarm limit is 500 and ~420 alarm clocks tripped OEM battery
    // managers); the native fire receiver chain-advances the window.
    expect(armWithinMs).toBe(48 * 60 * 60_000)
    // v1.2.7: every entry carries its auto-dismiss TTL so stale notifications
    // (e.g. the "prayer is coming" reminders) do not pile up in the shade.
    for (const alarm of plan) {
      expect(typeof alarm.ttl).toBe('number')
      expect(alarm.ttl as number).toBeGreaterThanOrEqual(0)
    }
    // The pending diagnostic test survives the re-arm.
    expect(keepIds).toContain(700100001)
    // The stock plugin is used only for channels and legacy cleanup — never timing.
    expect(ln.schedule).not.toHaveBeenCalled()
    const channels = ln.createChannel.mock.calls.map((call) => call[0] as Record<string, unknown>)
    expect(channels.some((channel) => String(channel.id).includes('muslim-adhan-v2'))).toBe(true)
  })

  it('drops alarms whose time already passed today and keeps the later ones', async () => {
    const { scheduleNativeNotifications } = await load()
    await scheduleNativeNotifications({ force: true })
    const { alarms: plan } = alarms.schedule.mock.calls[0]![0] as {
      alarms: Array<{ at: number }>
    }
    expect(plan.length).toBeGreaterThan(0)
    expect(plan.every((alarm) => alarm.at > Date.now())).toBe(true)
  })

  it('does nothing without the notification permission', async () => {
    ln.checkPermissions.mockResolvedValue({ display: 'denied' })
    ln.requestPermissions.mockResolvedValue({ display: 'denied' })
    const { scheduleNativeNotifications } = await load()
    await scheduleNativeNotifications({ force: true })
    expect(alarms.schedule).not.toHaveBeenCalled()
  })

  it('keeps the previously armed plan when the location is missing but prayers are on', async () => {
    // v1.2.7 root-cause fix: a replace run without coords used to cancel the
    // whole armed prayer plan and store a prayer-less one. Skip instead —
    // whatever is armed stays correct until coords come back.
    localStorage.removeItem(APP_SETTINGS_KEYS.coords)
    const { scheduleNativeNotifications } = await load()
    await scheduleNativeNotifications({ force: true })
    expect(alarms.schedule).not.toHaveBeenCalled()
  })

  it('does not delete the adhan channels on every run (shade wipe fix)', async () => {
    // v1.2.7 root-cause fix: builds ≤ 1.2.6 deleted the adhan channels on
    // EVERY start, which removed that channel's notifications from the shade
    // the moment the app was opened. Now the one-time migration sweep runs
    // once and channels are created idempotently.
    const { scheduleNativeNotifications } = await load()
    await scheduleNativeNotifications({ force: true })
    await scheduleNativeNotifications({ force: true })
    const deleted = ln.deleteChannel.mock.calls.map((call) => call[0].id as string)
    // The sweep happened once (first call), never on the second run: only the
    // two INACTIVE sound-mode channels are retired, plus the legacy v1 ids.
    const adhanDeletes = deleted.filter((id) => id.startsWith('muslim-adhan-v2-'))
    expect(adhanDeletes.length).toBe(2) // one-time: only the two inactive modes
    expect(deleted.filter((id) => id === 'muslim-adhan-v2-adhan')).toHaveLength(0) // the ACTIVE channel is never deleted
  })

  it('cancels legacy stock-plugin alarms so old builds cannot double-fire', async () => {
    ln.getPending.mockResolvedValue({
      notifications: [{ id: 700000005 }, { id: 700000012 }],
    })
    const { scheduleNativeNotifications } = await load()
    await scheduleNativeNotifications({ force: true })
    const cancelled = ln.cancel.mock.calls.flatMap((call) => call[0].notifications as Array<{ id: number }>)
    expect(cancelled.map((n) => n.id)).toContain(700000005)
    expect(cancelled.map((n) => n.id)).toContain(700000012)
  })

  it('lists what is actually armed from the exact-alarm storage', async () => {
    alarms.pending.mockResolvedValue({
      items: [
        { id: 700000005, at: Date.now() + 3600_000, title: 'حان وقت صلاة الظهر' },
        { id: 700000000, at: Date.now() + 7200_000, title: 'حان وقت صلاة العصر' },
      ],
    })
    const { listScheduledNotifications } = await load()
    const items = await listScheduledNotifications()
    expect(items).toHaveLength(2)
    // Soonest first.
    expect(items[0]!.id).toBe(700000005)
    expect(items[0]!.at).toBeTypeOf('string')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FALLBACK_EVENING_TIME,
  FALLBACK_MORNING_TIME,
  ID_BASE,
  KIND,
  makeId,
  planNotifications,
  type PlanInput,
} from '../../src/app/features/notifications/notificationPlan'
import { APP_SETTINGS_KEYS, BACKUP_KEYS, SETTINGS_RESET_KEYS } from '../../src/app/settings'

const timings = { Fajr: '04:50', Sunrise: '06:10', Dhuhr: '11:40', Asr: '14:50', Maghrib: '17:20', Isha: '18:40', Sunset: '17:19' }
const days = Array.from({ length: 3 }, (_, i) => new Date(2026, 9, 26 + i, 12, 0))
const noon = new Date(2026, 9, 26, 12, 0).getTime()
const channels = { adhan: 'adhan', prayer: 'prayer', reminder: 'reminder' }

const base: PlanInput = {
  now: noon,
  days,
  timingsByDay: days.map(() => ({ ...timings })),
  atTimeEnabled: false,
  beforeEnabled: false,
  ayahEnabled: false,
  ayahTime: '09:00',
  quranEnabled: false,
  quranTime: '20:00',
  morningEnabled: true,
  eveningEnabled: true,
  lead: 5,
  channels,
}

const noCoords: PlanInput = { ...base, timingsByDay: days.map(() => null) }

describe('phase 7: custom azkar reminder times and no-location fallback', () => {
  it('anchors the wirds to Sunrise/Sunset when no custom time is set', () => {
    const plan = planNotifications(base)
    const morning = plan.find((n) => n.id === makeId(KIND.morning, 1, 0))!
    expect(morning.at.getHours()).toBe(6)
    expect(morning.at.getMinutes()).toBe(10)
    expect(morning.body).toContain('مع الشروق')
    const evening = plan.find((n) => n.id === makeId(KIND.evening, 1, 0))!
    expect(evening.at.getHours()).toBe(17)
    expect(evening.body).toContain('مع الغروب')
  })

  it('a custom time wins over the sun anchor and drops the sun wording', () => {
    const plan = planNotifications({ ...base, morningTime: '07:30', eveningTime: '21:15' })
    const morning = plan.find((n) => n.id === makeId(KIND.morning, 1, 0))!
    expect(morning.at.getHours()).toBe(7)
    expect(morning.at.getMinutes()).toBe(30)
    expect(morning.body).not.toContain('مع الشروق')
    const evening = plan.find((n) => n.id === makeId(KIND.evening, 1, 0))!
    expect(evening.at.getHours()).toBe(21)
    expect(evening.at.getMinutes()).toBe(15)
  })

  it('plans fixed fallback times when the location is missing instead of dropping the wirds', () => {
    const plan = planNotifications(noCoords)
    expect(plan.filter((n) => n.target === 'prayer')).toHaveLength(0)
    const morning = plan.find((n) => n.id === makeId(KIND.morning, 1, 0))!
    expect(morning.at.getHours()).toBe(Number(FALLBACK_MORNING_TIME.slice(0, 2)))
    expect(morning.at.getMinutes()).toBe(0)
    const evening = plan.find((n) => n.id === makeId(KIND.evening, 1, 0))!
    expect(evening.at.getHours()).toBe(Number(FALLBACK_EVENING_TIME.slice(0, 2)))
  })

  it('a custom time also wins over the no-location fallback', () => {
    const plan = planNotifications({ ...noCoords, morningTime: '05:45' })
    const morning = plan.find((n) => n.id === makeId(KIND.morning, 1, 0))!
    expect(morning.at.getHours()).toBe(5)
    expect(morning.at.getMinutes()).toBe(45)
  })

  it('registers the new time keys in the backup and the reset lists', () => {
    expect(BACKUP_KEYS.has(APP_SETTINGS_KEYS.azkarMorningTime)).toBe(true)
    expect(BACKUP_KEYS.has(APP_SETTINGS_KEYS.azkarEveningTime)).toBe(true)
    expect(SETTINGS_RESET_KEYS).toContain(APP_SETTINGS_KEYS.azkarMorningTime)
    expect(SETTINGS_RESET_KEYS).toContain(APP_SETTINGS_KEYS.azkarEveningTime)
  })
})

// --- Native carry-forward: armed prayer alarms survive a no-location run ---

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

const CAIRO = JSON.stringify({ lat: 30.06, lng: 31.25 })

describe('phase 7: no-location run preserves armed prayer alarms', () => {
  beforeEach(() => {
    vi.resetModules()
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
    localStorage.setItem(APP_SETTINGS_KEYS.prayerTime, '1')
    localStorage.setItem(APP_SETTINGS_KEYS.reminders, '1')
    localStorage.setItem(APP_SETTINGS_KEYS.azkarMorning, '1')
    localStorage.setItem(APP_SETTINGS_KEYS.coords, CAIRO)
  })

  it('carries the cached prayer plan and fixed-time wirds into the no-location replace', async () => {
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    // Location-based run: plans prayers + wirds and caches the prayer entries.
    await scheduleNativeNotifications({ force: true })
    expect(alarms.schedule).toHaveBeenCalledTimes(1)
    const first = alarms.schedule.mock.calls[0]![0] as { alarms: Array<{ id: number; at: number }> }
    const prayerIds = first.alarms.filter((a) => a.id >= ID_BASE && a.id < ID_BASE + 2000).map((a) => a.id)
    expect(prayerIds.length).toBeGreaterThan(0)
    const cache = JSON.parse(localStorage.getItem('azkar_prayer_plan_cache_v1')!) as Array<{ id: number }>
    expect(cache.length).toBe(prayerIds.length)

    // Location gone: the run must still schedule (fixed-time wirds) AND keep
    // every still-future prayer id from the cache.
    localStorage.removeItem(APP_SETTINGS_KEYS.coords)
    await scheduleNativeNotifications({ force: true })
    expect(alarms.schedule).toHaveBeenCalledTimes(2)
    const second = alarms.schedule.mock.calls[1]![0] as { alarms: Array<{ id: number; at: number }> }
    const now = Date.now()
    const futurePrayerIds = prayerIds.filter((id) => {
      const entry = first.alarms.find((a) => a.id === id)!
      return entry.at > now
    })
    for (const id of futurePrayerIds) {
      expect(second.alarms.some((a) => a.id === id)).toBe(true)
    }
    const secondMorning = second.alarms.find((a) => a.id === makeId(KIND.morning, 0, 0)) ?? second.alarms.find((a) => a.id === makeId(KIND.morning, 1, 0))
    expect(secondMorning).toBeTruthy()
    expect(new Date(secondMorning!.at).getHours()).toBe(6)
    // The location-missing diagnostic is raised for the settings card.
    const { readDiagnostics } = await import('../../src/app/features/notifications/nativeDiagnostics')
    expect(readDiagnostics().locationMissing).toBe(true)
  })

  it('carries still-armed native prayer alarms before any cache exists (upgrade path)', async () => {
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    // No cache (fresh upgrade), no coords, but two prayers still armed natively.
    const futureAt = Date.now() + 3 * 60 * 60_000
    alarms.pending.mockResolvedValue({
      items: [
        { id: makeId(KIND.at, 0, 2), at: futureAt, title: 'حان وقت صلاة العصر' },
        { id: makeId(KIND.before, 0, 3), at: futureAt + 60_000, title: 'اقترب وقت صلاة المغرب' },
      ],
    })
    localStorage.removeItem(APP_SETTINGS_KEYS.coords)
    await scheduleNativeNotifications({ force: true })
    expect(alarms.schedule).toHaveBeenCalledTimes(1)
    const { alarms: plan } = alarms.schedule.mock.calls[0]![0] as { alarms: Array<{ id: number; at: number; ttl: number }> }
    const carriedAt = plan.find((a) => a.id === makeId(KIND.at, 0, 2))
    expect(carriedAt).toBeTruthy()
    expect(carriedAt!.at).toBe(futureAt)
    const carriedBefore = plan.find((a) => a.id === makeId(KIND.before, 0, 3))
    expect(carriedBefore).toBeTruthy()
    // Wirds ride along at the fixed fallback time.
    expect(plan.some((a) => a.id === makeId(KIND.morning, 0, 0) || a.id === makeId(KIND.morning, 1, 0))).toBe(true)
  })

  it('never resurrects a prayer kind the user turned off, from cache or pending', async () => {
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    await scheduleNativeNotifications({ force: true })
    // Turn the adhan off, keep the pre-reminder on, lose the location.
    localStorage.setItem(APP_SETTINGS_KEYS.prayerTime, '0')
    localStorage.removeItem(APP_SETTINGS_KEYS.coords)
    await scheduleNativeNotifications({ force: true })
    let plan = (alarms.schedule.mock.calls[1]![0] as { alarms: Array<{ id: number }> }).alarms
    // kind 0 (adhan at the prayer time) must be gone; kind 1 (pre-reminder) stays.
    expect(plan.some((a) => a.id >= ID_BASE && a.id < ID_BASE + 1000)).toBe(false)
    expect(plan.some((a) => a.id >= ID_BASE + 1000 && a.id < ID_BASE + 2000)).toBe(true)
    // The cache was rewritten to the scheduled plan, so re-enabling the adhan
    // (still without coords) cannot bring the old adhan alarms back.
    localStorage.setItem(APP_SETTINGS_KEYS.prayerTime, '1')
    await scheduleNativeNotifications({ force: true })
    plan = (alarms.schedule.mock.calls[2]![0] as { alarms: Array<{ id: number }> }).alarms
    expect(plan.some((a) => a.id >= ID_BASE && a.id < ID_BASE + 1000)).toBe(false)
  })

  it('clears the cache when every prayer kind is off, so nothing resurrects later', async () => {
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    await scheduleNativeNotifications({ force: true })
    expect(localStorage.getItem('azkar_prayer_plan_cache_v1')).toBeTruthy()
    localStorage.setItem(APP_SETTINGS_KEYS.prayerTime, '0')
    localStorage.setItem(APP_SETTINGS_KEYS.reminders, '0')
    await scheduleNativeNotifications({ force: true })
    expect(localStorage.getItem('azkar_prayer_plan_cache_v1')).toBeNull()
  })

  it('keeps the protective skip when recovery is impossible: no cache and pending() fails', async () => {
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    // Fresh upgrade: no cache yet, native armed list unreadable.
    alarms.pending.mockRejectedValue(new Error('native bridge down'))
    localStorage.removeItem(APP_SETTINGS_KEYS.coords)
    await scheduleNativeNotifications({ force: true })
    // A replace here could silently drop armed prayer alarms: skip instead.
    expect(alarms.schedule).not.toHaveBeenCalled()
  })

  it('carried adhan entries follow the CURRENT sound mode (silent stays silent)', async () => {
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    await scheduleNativeNotifications({ force: true })
    localStorage.setItem('adhan_sound', 'silent')
    localStorage.removeItem(APP_SETTINGS_KEYS.coords)
    await scheduleNativeNotifications({ force: true })
    const plan = (alarms.schedule.mock.calls[1]![0] as { alarms: Array<{ id: number; channel?: string }> }).alarms
    const adhanEntries = plan.filter((a) => a.id >= ID_BASE && a.id < ID_BASE + 1000)
    expect(adhanEntries.length).toBeGreaterThan(0)
    expect(adhanEntries.every((a) => a.channel === 'muslim-adhan-v2-silent')).toBe(true)
  })

  it('re-derives a changed pre-reminder lead from the recoverable adhan anchor', async () => {
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    await scheduleNativeNotifications({ force: true })
    const first = (alarms.schedule.mock.calls[0]![0] as { alarms: Array<{ id: number; at: number }> }).alarms
    localStorage.setItem(APP_SETTINGS_KEYS.prayerReminderLead, '15')
    localStorage.removeItem(APP_SETTINGS_KEYS.coords)
    await scheduleNativeNotifications({ force: true })
    const second = (alarms.schedule.mock.calls[1]![0] as { alarms: Array<{ id: number; at: number; body?: string }> }).alarms
    // Every carried pre-reminder sits exactly 15 minutes before its adhan anchor.
    const beforeEntries = second.filter((a) => a.id >= ID_BASE + 1000 && a.id < ID_BASE + 2000)
    expect(beforeEntries.length).toBeGreaterThan(0)
    for (const b of beforeEntries) {
      const anchor = second.find((a) => a.id === b.id - 1000)
      expect(anchor).toBeTruthy()
      expect(b.at).toBe(anchor!.at - 15 * 60_000)
      expect(b.body).toContain('15')
    }
    // Sanity: the lead actually changed versus the original 5-minute plan.
    const oldBefore = first.find((a) => a.id === beforeEntries[0]!.id)!
    expect(beforeEntries[0]!.at).toBe(oldBefore.at - 10 * 60_000)
  })

  it('ignores malformed pending() payload items', async () => {
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    const futureAt = Date.now() + 3 * 60 * 60_000
    alarms.pending.mockResolvedValue({
      items: [
        { id: -5, at: futureAt, title: 'bad' },
        { id: ID_BASE + 99_999, at: futureAt, title: 'out of range slot' },
        { id: 123, at: futureAt, title: 'outside window' },
        { id: 700000020, at: Number.NaN, title: 'bad time' },
        { id: 700000020, at: futureAt, title: 'حان وقت صلاة الظهر' },
      ],
    })
    localStorage.removeItem(APP_SETTINGS_KEYS.coords)
    await scheduleNativeNotifications({ force: true })
    const plan = (alarms.schedule.mock.calls[0]![0] as { alarms: Array<{ id: number; at: number }> }).alarms
    const carried = plan.filter((a) => a.id >= ID_BASE && a.id < ID_BASE + 2000)
    expect(carried).toHaveLength(1)
    expect(carried[0]!.id).toBe(700000020)
    expect(carried[0]!.at).toBe(futureAt)
  })

  it('honors the muted-prayer filter for carried entries', async () => {
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    await scheduleNativeNotifications({ force: true })
    localStorage.setItem(APP_SETTINGS_KEYS.mutedPrayers, 'Asr')
    localStorage.removeItem(APP_SETTINGS_KEYS.coords)
    alarms.pending.mockResolvedValue({ items: [] })
    await scheduleNativeNotifications({ force: true })
    const second = alarms.schedule.mock.calls[1]![0] as { alarms: Array<{ id: number }> }
    // Slot 2 = Asr: neither its adhan nor its pre-reminder may be re-armed.
    expect(second.alarms.some((a) => (a.id - ID_BASE) % 10 === 2 && a.id < ID_BASE + 2000)).toBe(false)
  })
})

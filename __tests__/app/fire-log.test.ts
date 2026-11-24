import { describe, expect, it } from 'vitest'
import type { FireLogItem, NativeStatus } from '@muslim/exact-alarms'
import { fireResultLabel, isFailure, lateSeconds, nativeWarnings, recentFireLog } from '../../src/app/features/notifications/fireLog'

const item = (over: Partial<FireLogItem>): FireLogItem => ({ id: 1, title: 'x', planned: 1000, at: 2000, result: 'posted', detail: '', ...over })
const status = (over: Partial<NativeStatus>): NativeStatus => ({
  ignoringBatteryOptimizations: true,
  notificationsEnabled: true,
  needsReplan: false,
  storedAlarms: 3,
  ...over,
})

describe('native fire log helpers', () => {
  it('labels every result the native receivers write', () => {
    for (const r of ['posted', 'notifications_disabled', 'post_failed', 'no_entry', 'error', 'boot', 'package_replaced', 'time_set', 'timezone_event', 'timezone_changed']) {
      expect(fireResultLabel(r)).not.toBe(r)
    }
    expect(fireResultLabel('something_new')).toBe('something_new')
  })

  it('treats only delivery problems as failures', () => {
    expect(isFailure(item({ result: 'post_failed' }))).toBe(true)
    expect(isFailure(item({ result: 'notifications_disabled' }))).toBe(true)
    expect(isFailure(item({ result: 'posted' }))).toBe(false)
    expect(isFailure(item({ result: 'timezone_changed' }))).toBe(false)
  })

  it('orders newest first and caps the list', () => {
    const rows = [item({ at: 1 }), item({ at: 3 }), item({ at: 2 })]
    expect(recentFireLog(rows, 2).map((r) => r.at)).toEqual([3, 2])
  })

  it('computes lateness only for alarm rows', () => {
    expect(lateSeconds(item({ planned: 0, at: 5000 }))).toBeNull()
    expect(lateSeconds(item({ planned: 1000, at: 91000 }))).toBe(90)
    expect(lateSeconds(item({ planned: 5000, at: 1000 }))).toBe(0)
  })

  it('warns only about real problems', () => {
    expect(nativeWarnings(null)).toEqual([])
    expect(nativeWarnings(status({}))).toEqual([])
    expect(nativeWarnings(status({ notificationsEnabled: false })).map((w) => w.key)).toEqual(['disabled'])
    expect(nativeWarnings(status({ needsReplan: true })).map((w) => w.key)).toEqual(['replan'])
    expect(nativeWarnings(status({ ignoringBatteryOptimizations: false })).map((w) => w.key)).toEqual(['battery'])
  })
})

describe('plan marks fixed local-clock reminders for the native time-zone handling', () => {
  it('flags ayah, Quran, Kahf and custom or fallback wird times, and no prayer or sun-anchored instant', async () => {
    const { planNotifications } = await import('../../src/app/features/notifications/notificationPlan')
    const day = new Date(2026, 10, 27, 0, 0, 0) // a Friday
    const timings = { Fajr: '04:50', Sunrise: '06:15', Dhuhr: '11:50', Asr: '14:40', Maghrib: '17:05', Sunset: '17:05', Isha: '18:30' } as never
    const base = {
      now: new Date(2026, 10, 26).getTime(),
      days: [day],
      timingsByDay: [timings],
      atTimeEnabled: true, beforeEnabled: true, ayahEnabled: true, ayahTime: '09:00', quranEnabled: true, quranTime: '20:00',
      morningEnabled: true, eveningEnabled: true, kahfEnabled: true, kahfTime: '10:00', lead: 5,
      channels: { adhan: 'a', prayer: 'p', reminder: 'r' },
    }
    const byTarget = (entries: ReturnType<typeof planNotifications>) => Object.fromEntries(entries.map((e) => [e.target + ':' + e.id, Boolean(e.wallClock)]))
    const sunAnchored = planNotifications(base)
    for (const e of sunAnchored) {
      if (e.target === 'prayer' || e.target.startsWith('azkar')) expect(Boolean(e.wallClock), e.target).toBe(false)
      if (['ayah', 'quran', 'kahf'].includes(e.target)) expect(e.wallClock, e.target).toBe(true)
    }
    const custom = planNotifications({ ...base, morningTime: '05:30' })
    expect(custom.find((e) => e.target === 'azkar-morning')?.wallClock).toBe(true)
    expect(custom.find((e) => e.target === 'azkar-evening')?.wallClock).toBe(false)
    const noLocation = planNotifications({ ...base, timingsByDay: [null] })
    expect(noLocation.find((e) => e.target === 'azkar-morning')?.wallClock).toBe(true)
    expect(Object.keys(byTarget(sunAnchored)).length).toBeGreaterThan(5)
  })
})

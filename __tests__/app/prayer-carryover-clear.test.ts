import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ native: false, schedule: vi.fn() }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => state.native, getPlatform: () => (state.native ? 'android' : 'web') } }))
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: new Proxy({}, {
    get: (_t, name) => async () => (name === 'checkPermissions' || name === 'requestPermissions' ? { display: 'granted' } : { notifications: [], channels: [] }),
  }),
}))
vi.mock('@muslim/exact-alarms', () => ({ ExactAlarms: { schedule: state.schedule, pending: vi.fn(), cancelOne: vi.fn() } }))

import { dropPrayerPlanCarryover } from '../../src/app/features/notifications/nativeNotifications'
import { TEST_NOTIFICATION_ID } from '../../src/app/features/notifications/notificationPlan'

describe('dropPrayerPlanCarryover', () => {
  beforeEach(() => {
    localStorage.clear()
    state.schedule.mockReset()
    state.native = false
  })
  it('on web only clears the cached prayer plan', async () => {
    localStorage.setItem('azkar_prayer_plan_cache_v1', '[]')
    expect(await dropPrayerPlanCarryover()).toBe(true)
    expect(localStorage.getItem('azkar_prayer_plan_cache_v1')).toBeNull()
    expect(state.schedule).not.toHaveBeenCalled()
  })
  it('on Android replaces the native plan with an empty one that keeps only the test alarm', async () => {
    state.native = true
    state.schedule.mockResolvedValue({ armed: 0, stored: 0 })
    localStorage.setItem('azkar_prayer_plan_cache_v1', '[]')
    expect(await dropPrayerPlanCarryover()).toBe(true)
    expect(localStorage.getItem('azkar_prayer_plan_cache_v1')).toBeNull()
    expect(state.schedule).toHaveBeenCalledWith(expect.objectContaining({ alarms: [], keepIds: [TEST_NOTIFICATION_ID] }))
  })
  it('reports failure when the native replace throws, so callers do not reload', async () => {
    state.native = true
    state.schedule.mockRejectedValue(new Error('boom'))
    expect(await dropPrayerPlanCarryover()).toBe(false)
  })
})

describe('dropPrayerPlanCarryover serialization with the scheduler', () => {
  it('waits for a run in flight and a later run cannot re-arm alarms before the clear finishes', async () => {
    state.native = true
    const order: string[] = []
    let releaseFirst: (v: { armed: number; stored: number }) => void = () => {}
    state.schedule.mockImplementation((opts: { alarms: unknown[] }) => {
      order.push(opts.alarms.length === 0 ? 'clear' : 'run')
      if (order.length === 1 && opts.alarms.length > 0) return new Promise((r) => { releaseFirst = r })
      return Promise.resolve({ armed: 0, stored: 0 })
    })
    const { ExactAlarms } = await import('@muslim/exact-alarms')
    ;(ExactAlarms.pending as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] })
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    localStorage.setItem('azkar_daily_ayah_notifications', '1')
    const run = scheduleNativeNotifications({ force: true })
    await new Promise((r) => setTimeout(r, 20))
    expect(order[0]).toBe('run')
    const drop = dropPrayerPlanCarryover()
    await new Promise((r) => setTimeout(r, 20))
    expect(order).toEqual(['run']) // the clear is held back while the run is in flight
    releaseFirst({ armed: 1, stored: 1 })
    await run
    expect(await drop).toBe(true)
    expect(order[1]).toBe('clear')
  })

  it('a forced run requested during the clear is queued and starts only after it', async () => {
    state.native = true
    const order: string[] = []
    let releaseClear: (v: { armed: number; stored: number }) => void = () => {}
    state.schedule.mockImplementation((opts: { alarms: unknown[] }) => {
      order.push(opts.alarms.length === 0 ? 'clear' : 'run')
      if (opts.alarms.length === 0 && order.length === 1) return new Promise((r) => { releaseClear = r })
      return Promise.resolve({ armed: 0, stored: 0 })
    })
    const { ExactAlarms } = await import('@muslim/exact-alarms')
    ;(ExactAlarms.pending as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] })
    const { scheduleNativeNotifications } = await import('../../src/app/features/notifications/nativeNotifications')
    localStorage.setItem('azkar_daily_ayah_notifications', '1')
    const drop = dropPrayerPlanCarryover()
    await new Promise((r) => setTimeout(r, 10))
    void scheduleNativeNotifications({ force: true })
    await new Promise((r) => setTimeout(r, 30))
    expect(order).toEqual(['clear'])
    releaseClear({ armed: 0, stored: 0 })
    expect(await drop).toBe(true)
    await new Promise((r) => setTimeout(r, 50))
    expect(order[0]).toBe('clear')
    expect(order).toContain('run')
  })
})
